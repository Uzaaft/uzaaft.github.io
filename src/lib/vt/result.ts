/**
 * GhosttyResult codes and the typed failures the VT adapter surfaces.
 *
 * Mirrors `include/ghostty/vt/types.h` at the pinned ghostty revision. The C
 * API is explicitly unstable pre-1.0, so these are checked against the wasm
 * module at load time only insofar as struct layouts are — the codes
 * themselves are a compile-time mirror and must be re-checked when the pin
 * moves.
 */

export const GHOSTTY_SUCCESS = 0;

const RESULT_NAMES: Readonly<Record<number, string>> = {
	0: 'SUCCESS',
	[-1]: 'OUT_OF_MEMORY',
	[-2]: 'INVALID_VALUE',
	[-3]: 'OUT_OF_SPACE',
	[-4]: 'NO_VALUE',
	[-5]: 'IO_ERROR',
	[-6]: 'LIMIT_EXCEEDED'
};

/** Human-readable name for a GhosttyResult code, for diagnostics only. */
export function resultName(code: number): string {
	return RESULT_NAMES[code] ?? `UNKNOWN(${code})`;
}

/**
 * A libghostty-vt call returned a non-success result code.
 *
 * `operation` is the C function name so a failure points at the exact call
 * without needing a stack trace through the wasm boundary.
 */
export class VtCallFailed extends Error {
	readonly _tag = 'VtCallFailed' as const;

	constructor(
		readonly operation: string,
		readonly code: number
	) {
		super(`${operation} failed with ${resultName(code)}`);
		this.name = 'VtCallFailed';
	}
}

/** The wasm module could not be fetched, compiled, or instantiated. */
export class VtModuleLoadFailed extends Error {
	readonly _tag = 'VtModuleLoadFailed' as const;

	constructor(
		readonly url: string,
		readonly cause: unknown
	) {
		super(`Failed to load libghostty-vt wasm from ${url}`);
		this.name = 'VtModuleLoadFailed';
	}
}

/**
 * The module loaded but does not expose the surface this adapter needs, or
 * `ghostty_type_json()` did not describe a struct we read.
 *
 * This is the guard against the pinned revision drifting underneath us.
 */
export class VtModuleIncompatible extends Error {
	readonly _tag = 'VtModuleIncompatible' as const;

	constructor(readonly detail: string) {
		super(`libghostty-vt wasm is incompatible: ${detail}`);
		this.name = 'VtModuleIncompatible';
	}
}
