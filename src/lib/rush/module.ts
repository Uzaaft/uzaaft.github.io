/**
 * External Adapter Module owning Rush's freestanding wasm ABI.
 *
 * The adapter validates the pinned exports, owns the persistent shell handle,
 * and copies all strings across linear memory. Callers never retain wasm views
 * or pointers, which become invalid when the allocator grows memory.
 */

import { err, ok, type Result } from '$lib/prelude';
import {
	RushCallFailed,
	RushModuleIncompatible,
	RushModuleLoadFailed,
	RushShellCreateFailed
} from './result';

interface RushExports {
	readonly memory: WebAssembly.Memory;
	readonly rush_version: () => number;
	readonly rush_create: () => number;
	readonly rush_destroy: (shell: number) => void;
	readonly rush_eval: (shell: number, ptr: number, len: number) => number;
	readonly rush_stdout_ptr: (shell: number) => number;
	readonly rush_stdout_len: (shell: number) => number;
	readonly rush_stderr_ptr: (shell: number) => number;
	readonly rush_stderr_len: (shell: number) => number;
	readonly rush_wasm_alloc_u8_array: (len: number) => number;
	readonly rush_wasm_free_u8_array: (ptr: number, len: number) => void;
}

const REQUIRED_EXPORTS: readonly (keyof RushExports)[] = [
	'memory',
	'rush_version',
	'rush_create',
	'rush_destroy',
	'rush_eval',
	'rush_stdout_ptr',
	'rush_stdout_len',
	'rush_stderr_ptr',
	'rush_stderr_len',
	'rush_wasm_alloc_u8_array',
	'rush_wasm_free_u8_array'
];

/** The observable result of evaluating one command string in Rush. */
export interface RushEvaluation {
	readonly status: number;
	readonly stdout: string;
	readonly stderr: string;
}

/** A validated Rush wasm module from which persistent shell instances can be created. */
export class RushModule {
	private constructor(
		private readonly exports: RushExports,
		readonly version: string
	) {}

	/** Fetch, instantiate, and validate the Rush embedding module. */
	static async load(
		url: string
	): Promise<Result<RushModule, RushModuleLoadFailed | RushModuleIncompatible>> {
		let instance: WebAssembly.Instance;

		try {
			const source = await fetch(url, { credentials: 'omit' });
			if (!source.ok) {
				return err(new RushModuleLoadFailed(url, new Error(`HTTP ${source.status}`)));
			}

			let memoryRef: WebAssembly.Memory | undefined;
			const imports: WebAssembly.Imports = {
				env: {
					log: (ptr: number, len: number) => {
						if (!memoryRef) return;
						const bytes = new Uint8Array(memoryRef.buffer, ptr, len);
						console.log('[rush]', new TextDecoder().decode(bytes));
					}
				}
			};

			let instantiated: WebAssembly.WebAssemblyInstantiatedSource;
			try {
				instantiated = await WebAssembly.instantiateStreaming(source, imports);
			} catch {
				const fallback = await fetch(url, { credentials: 'omit' });
				if (!fallback.ok) {
					return err(new RushModuleLoadFailed(url, new Error(`HTTP ${fallback.status}`)));
				}
				instantiated = await WebAssembly.instantiate(await fallback.arrayBuffer(), imports);
			}

			instance = instantiated.instance;
			const maybeMemory = instance.exports.memory;
			if (maybeMemory instanceof WebAssembly.Memory) memoryRef = maybeMemory;
		} catch (cause: unknown) {
			return err(new RushModuleLoadFailed(url, cause));
		}

		const missing = REQUIRED_EXPORTS.filter((name) => !(name in instance.exports));
		if (missing.length > 0) {
			return err(new RushModuleIncompatible(`missing exports: ${missing.join(', ')}`));
		}

		// SAFETY: the pinned Rush revision defines this exact wasm32 C ABI and
		// every required name was confirmed above. Signature drift traps at the
		// call boundary and is translated to RushCallFailed.
		const exports = instance.exports as unknown as RushExports;
		if (!(exports.memory instanceof WebAssembly.Memory)) {
			return err(new RushModuleIncompatible('memory export is not WebAssembly.Memory'));
		}

		let version: string;
		try {
			version = readCString(exports.memory, exports.rush_version());
		} catch (cause: unknown) {
			return err(new RushModuleIncompatible(`rush_version() failed: ${String(cause)}`));
		}
		if (!version) return err(new RushModuleIncompatible('rush_version() returned an empty string'));

		return ok(new RushModule(exports, version));
	}

	/** Create an independent, stateful Rush shell. */
	createShell(): Result<RushShell, RushShellCreateFailed> {
		const handle = this.exports.rush_create();
		return handle === 0
			? err(new RushShellCreateFailed())
			: ok(new RushShell(this.exports, handle));
	}
}

/** A persistent Rush shell instance. Dispose it when its owning UI unmounts. */
export class RushShell {
	private disposed = false;

	constructor(
		private readonly exports: RushExports,
		private readonly handle: number
	) {}

	/** Evaluate a command string while preserving variables and working directory. */
	evaluate(script: string): Result<RushEvaluation, RushCallFailed> {
		if (this.disposed) {
			return err(new RushCallFailed('eval', new Error('shell is disposed')));
		}

		const input = new TextEncoder().encode(script);
		let ptr = 0;

		try {
			ptr = this.exports.rush_wasm_alloc_u8_array(input.length);
			if (ptr === 0 && input.length > 0) {
				return err(new RushCallFailed('eval', new Error('input allocation failed')));
			}

			// Zig uses the all-ones pointer as the valid sentinel for a zero-length
			// allocation. Do not construct a JS memory view for that address.
			if (input.length > 0) {
				new Uint8Array(this.exports.memory.buffer, ptr >>> 0, input.length).set(input);
			}
			const status = this.exports.rush_eval(this.handle, ptr, input.length);
			const stdout = this.readOutput(
				this.exports.rush_stdout_ptr(this.handle),
				this.exports.rush_stdout_len(this.handle)
			);
			const stderr = this.readOutput(
				this.exports.rush_stderr_ptr(this.handle),
				this.exports.rush_stderr_len(this.handle)
			);
			return ok({ status, stdout, stderr });
		} catch (cause: unknown) {
			return err(new RushCallFailed('eval', cause));
		} finally {
			if (ptr !== 0) {
				this.exports.rush_wasm_free_u8_array(ptr, input.length);
			}
		}
	}

	/** Release the Zig shell state. Safe to call more than once. */
	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.exports.rush_destroy(this.handle);
	}

	private readOutput(ptr: number, len: number): string {
		return new TextDecoder().decode(new Uint8Array(this.exports.memory.buffer, ptr >>> 0, len));
	}
}

function readCString(memory: WebAssembly.Memory, ptr: number): string {
	const bytes = new Uint8Array(memory.buffer, ptr >>> 0);
	const end = bytes.indexOf(0);
	return new TextDecoder().decode(bytes.subarray(0, end === -1 ? undefined : end));
}
