/** Rush wasm could not be fetched, compiled, or instantiated. */
export class RushModuleLoadFailed extends Error {
	readonly _tag = 'RushModuleLoadFailed' as const;

	constructor(
		readonly url: string,
		readonly cause: unknown
	) {
		super(`Failed to load Rush wasm from ${url}`);
		this.name = 'RushModuleLoadFailed';
	}
}

/** The loaded wasm does not expose the Rush embedding ABI this site requires. */
export class RushModuleIncompatible extends Error {
	readonly _tag = 'RushModuleIncompatible' as const;

	constructor(readonly detail: string) {
		super(`Rush wasm is incompatible: ${detail}`);
		this.name = 'RushModuleIncompatible';
	}
}

/** Rush could not allocate a persistent shell instance. */
export class RushShellCreateFailed extends Error {
	readonly _tag = 'RushShellCreateFailed' as const;

	constructor() {
		super('Rush could not create a shell instance');
		this.name = 'RushShellCreateFailed';
	}
}

/** A Rush wasm call trapped or could not allocate its command input. */
export class RushCallFailed extends Error {
	readonly _tag = 'RushCallFailed' as const;

	constructor(
		readonly operation: 'eval',
		readonly cause: unknown
	) {
		super(`Rush ${operation} failed`);
		this.name = 'RushCallFailed';
	}
}
