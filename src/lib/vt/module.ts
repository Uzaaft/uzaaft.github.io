/**
 * External Adapter Module owning the libghostty-vt wasm ABI.
 *
 * Everything about the wasm boundary lives here: instantiation, linear-memory
 * access, scoped allocation, and struct layout. Callers work in terms of
 * numbers and typed failures and never touch `WebAssembly` directly.
 */

import { err, ok, type Result } from '$lib/prelude';
import {
	GHOSTTY_SUCCESS,
	VtCallFailed,
	VtModuleIncompatible,
	VtModuleLoadFailed
} from './result';

/**
 * The wasm exports this adapter calls.
 *
 * Pointers and `size_t` are `number` because the module is wasm32. Moving to
 * wasm64 would make these `bigint` and is not supported here.
 */
export interface VtExports {
	readonly memory: WebAssembly.Memory;

	readonly ghostty_type_json: () => number;

	readonly ghostty_wasm_alloc_opaque: () => number;
	readonly ghostty_wasm_free_opaque: (ptr: number) => void;
	readonly ghostty_wasm_alloc_u8_array: (len: number) => number;
	readonly ghostty_wasm_free_u8_array: (ptr: number, len: number) => void;
	readonly ghostty_wasm_alloc_usize: () => number;
	readonly ghostty_wasm_free_usize: (ptr: number) => void;

	readonly ghostty_terminal_new: (
		allocator: number,
		out: number,
		cols: number,
		rows: number
	) => number;
	readonly ghostty_terminal_free: (terminal: number) => void;
	readonly ghostty_terminal_vt_write: (terminal: number, ptr: number, len: number) => void;
	readonly ghostty_terminal_resize: (
		terminal: number,
		cols: number,
		rows: number,
		cellWidthPx: number,
		cellHeightPx: number
	) => number;

	readonly ghostty_render_state_new: (allocator: number, out: number) => number;
	readonly ghostty_render_state_free: (state: number) => void;
	readonly ghostty_render_state_update: (state: number, terminal: number) => number;
	readonly ghostty_render_state_get: (state: number, data: number, out: number) => number;
	readonly ghostty_render_state_set: (state: number, option: number, value: number) => number;
	readonly ghostty_render_state_colors_get: (state: number, out: number) => number;
	readonly ghostty_render_state_row_iterator_new: (state: number, out: number) => number;
	readonly ghostty_render_state_row_iterator_free: (iterator: number) => void;
	readonly ghostty_render_state_row_iterator_next: (iterator: number) => number;
	readonly ghostty_render_state_row_get: (iterator: number, data: number, out: number) => number;
	readonly ghostty_render_state_row_set: (iterator: number, option: number, value: number) => number;
	readonly ghostty_render_state_row_cells_new: (iterator: number, out: number) => number;
	readonly ghostty_render_state_row_cells_free: (cells: number) => void;
	readonly ghostty_render_state_row_cells_next: (cells: number) => number;
	readonly ghostty_render_state_row_cells_get: (cells: number, data: number, out: number) => number;
}

const REQUIRED_EXPORTS: readonly (keyof VtExports)[] = [
	'memory',
	'ghostty_type_json',
	'ghostty_wasm_alloc_opaque',
	'ghostty_wasm_free_opaque',
	'ghostty_wasm_alloc_u8_array',
	'ghostty_wasm_free_u8_array',
	'ghostty_wasm_alloc_usize',
	'ghostty_wasm_free_usize',
	'ghostty_terminal_new',
	'ghostty_terminal_free',
	'ghostty_terminal_vt_write',
	'ghostty_terminal_resize',
	'ghostty_render_state_new',
	'ghostty_render_state_free',
	'ghostty_render_state_update',
	'ghostty_render_state_get',
	'ghostty_render_state_set',
	'ghostty_render_state_colors_get',
	'ghostty_render_state_row_iterator_new',
	'ghostty_render_state_row_iterator_free',
	'ghostty_render_state_row_iterator_next',
	'ghostty_render_state_row_get',
	'ghostty_render_state_row_set',
	'ghostty_render_state_row_cells_new',
	'ghostty_render_state_row_cells_free',
	'ghostty_render_state_row_cells_next',
	'ghostty_render_state_row_cells_get'
];

/** A field as described by `ghostty_type_json()`. */
interface FieldLayout {
	readonly offset: number;
	readonly type: string;
}

interface StructLayout {
	readonly size: number;
	readonly fields: Readonly<Record<string, FieldLayout>>;
}

type TypeLayout = Readonly<Record<string, StructLayout>>;

/**
 * Parse the type-layout JSON rather than trusting its shape.
 *
 * This is the one thing standing between us and silently reading garbage when
 * the pinned ghostty revision changes a struct.
 */
function parseTypeLayout(raw: unknown): Result<TypeLayout, VtModuleIncompatible> {
	if (typeof raw !== 'object' || raw === null) {
		return err(new VtModuleIncompatible('ghostty_type_json() did not return an object'));
	}

	const layout: Record<string, StructLayout> = {};

	for (const [structName, structRaw] of Object.entries(raw)) {
		if (typeof structRaw !== 'object' || structRaw === null) continue;

		const size = (structRaw as { size?: unknown }).size;
		const fieldsRaw = (structRaw as { fields?: unknown }).fields;
		if (typeof size !== 'number') continue;

		const fields: Record<string, FieldLayout> = {};

		if (typeof fieldsRaw === 'object' && fieldsRaw !== null) {
			for (const [fieldName, fieldRaw] of Object.entries(fieldsRaw)) {
				if (typeof fieldRaw !== 'object' || fieldRaw === null) continue;
				const offset = (fieldRaw as { offset?: unknown }).offset;
				const type = (fieldRaw as { type?: unknown }).type;
				if (typeof offset !== 'number' || typeof type !== 'string') continue;
				fields[fieldName] = { offset, type };
			}
		}

		layout[structName] = { size, fields };
	}

	return ok(layout);
}

/** Decode a NUL-terminated string starting at `ptr` in linear memory. */
function readCString(memory: WebAssembly.Memory, ptr: number): string {
	const bytes = new Uint8Array(memory.buffer, ptr);
	const end = bytes.indexOf(0);
	return new TextDecoder().decode(bytes.subarray(0, end === -1 ? undefined : end));
}

export class VtModule {
	private constructor(
		readonly exports: VtExports,
		private readonly layout: TypeLayout
	) {}

	/**
	 * Fetch, instantiate, and validate the module.
	 *
	 * `env.log` is required by the wasm build; omitting it fails instantiation.
	 */
	static async load(
		url: string
	): Promise<Result<VtModule, VtModuleLoadFailed | VtModuleIncompatible>> {
		let instance: WebAssembly.Instance;

		try {
			const source = await fetch(url);
			if (!source.ok) {
				return err(new VtModuleLoadFailed(url, new Error(`HTTP ${source.status}`)));
			}

			let memoryRef: WebAssembly.Memory | undefined;
			const imports: WebAssembly.Imports = {
				env: {
					log: (ptr: number, len: number) => {
						if (!memoryRef) return;
						const text = new TextDecoder().decode(new Uint8Array(memoryRef.buffer, ptr, len));
						console.log('[libghostty-vt]', text);
					}
				}
			};

			// instantiateStreaming rejects unless the response is served as
			// application/wasm. GitHub Pages gets this right, but plenty of
			// static hosts and local preview servers do not, so fall back to
			// buffering rather than failing outright.
			let result: WebAssembly.WebAssemblyInstantiatedSource;
			try {
				result = await WebAssembly.instantiateStreaming(source, imports);
			} catch {
				const buffer = await (await fetch(url)).arrayBuffer();
				result = await WebAssembly.instantiate(buffer, imports);
			}
			instance = result.instance;
			const maybeMemory = instance.exports.memory;
			if (maybeMemory instanceof WebAssembly.Memory) memoryRef = maybeMemory;
		} catch (cause: unknown) {
			return err(new VtModuleLoadFailed(url, cause));
		}

		const missing = REQUIRED_EXPORTS.filter((name) => !(name in instance.exports));
		if (missing.length > 0) {
			return err(new VtModuleIncompatible(`missing exports: ${missing.join(', ')}`));
		}

		// SAFETY: every name in REQUIRED_EXPORTS was just confirmed present, and
		// the arity/signature contract is fixed by the pinned ghostty revision.
		// A signature mismatch surfaces as a wasm trap at call time, not silent
		// corruption.
		const exports = instance.exports as unknown as VtExports;

		let layoutJson: unknown;
		try {
			layoutJson = JSON.parse(readCString(exports.memory, exports.ghostty_type_json()));
		} catch (cause: unknown) {
			return err(
				new VtModuleIncompatible(
					`ghostty_type_json() returned unparseable JSON: ${String(cause)}`
				)
			);
		}

		const layout = parseTypeLayout(layoutJson);
		if (layout._tag === 'err') return layout;

		return ok(new VtModule(exports, layout.value));
	}

	/**
	 * A fresh DataView over linear memory.
	 *
	 * Never cache this. `memory.buffer` is detached and replaced whenever wasm
	 * memory grows, which any allocation can trigger.
	 */
	view(): DataView {
		return new DataView(this.exports.memory.buffer);
	}

	bytes(ptr: number, len: number): Uint8Array {
		return new Uint8Array(this.exports.memory.buffer, ptr, len);
	}

	/** Read a wasm32 pointer stored at `ptr`. */
	readPointer(ptr: number): number {
		return this.view().getUint32(ptr, true);
	}

	readUsize(ptr: number): number {
		return this.view().getUint32(ptr, true);
	}

	/** Translate a GhosttyResult code into a typed failure. */
	check(operation: string, code: number): Result<void, VtCallFailed> {
		return code === GHOSTTY_SUCCESS
			? ok(undefined)
			: err(new VtCallFailed(operation, code));
	}

	structSize(name: string): number {
		const struct = this.layout[name];
		if (!struct) throw new VtModuleIncompatible(`unknown struct ${name}`);
		return struct.size;
	}

	fieldOffset(structName: string, fieldName: string): number {
		const field = this.layout[structName]?.fields[fieldName];
		if (!field) {
			throw new VtModuleIncompatible(`unknown field ${structName}.${fieldName}`);
		}
		return field.offset;
	}

	/**
	 * Run `body` with a scratch pointer-sized out-param, freeing it afterwards.
	 *
	 * The callback receives the pointer to write into and returns whatever the
	 * caller needs; reading the pointee is the callback's job because the value
	 * must be read before the slot is freed.
	 */
	withOpaqueOut<T>(body: (outPtr: number) => T): T {
		const outPtr = this.exports.ghostty_wasm_alloc_opaque();
		try {
			return body(outPtr);
		} finally {
			this.exports.ghostty_wasm_free_opaque(outPtr);
		}
	}

	withUsizeOut<T>(body: (outPtr: number) => T): T {
		const outPtr = this.exports.ghostty_wasm_alloc_usize();
		try {
			return body(outPtr);
		} finally {
			this.exports.ghostty_wasm_free_usize(outPtr);
		}
	}

	/** Copy `data` into linear memory for the duration of `body`. */
	withBytes<T>(data: Uint8Array, body: (ptr: number, len: number) => T): T {
		const ptr = this.exports.ghostty_wasm_alloc_u8_array(data.length);
		try {
			this.bytes(ptr, data.length).set(data);
			return body(ptr, data.length);
		} finally {
			this.exports.ghostty_wasm_free_u8_array(ptr, data.length);
		}
	}

	/** Allocate a zeroed scratch struct of `size` bytes for the duration of `body`. */
	withScratch<T>(size: number, body: (ptr: number) => T): T {
		const ptr = this.exports.ghostty_wasm_alloc_u8_array(size);
		try {
			this.bytes(ptr, size).fill(0);
			return body(ptr);
		} finally {
			this.exports.ghostty_wasm_free_u8_array(ptr, size);
		}
	}
}
