/**
 * Tiny ubiquitous helpers. Domain and service policy live in their own modules.
 *
 * The site ships zero runtime dependencies, so expected failures use a local
 * tagged union rather than pulling in a result library.
 */

export type Result<T, E extends Error> =
	| { readonly _tag: 'ok'; readonly value: T }
	| { readonly _tag: 'err'; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ _tag: 'ok', value });

export const err = <E extends Error>(error: E): Result<never, E> => ({ _tag: 'err', error });

export const isOk = <T, E extends Error>(
	result: Result<T, E>
): result is { readonly _tag: 'ok'; readonly value: T } => result._tag === 'ok';

export const isErr = <T, E extends Error>(
	result: Result<T, E>
): result is { readonly _tag: 'err'; readonly error: E } => result._tag === 'err';

/** Exhaustiveness guard. Reaching this is a defect, so it throws. */
export function casesHandled(unexpectedCase: never): never {
	throw new Error(`Unhandled case: ${JSON.stringify(unexpectedCase)}`);
}

/** A violated internal invariant. Not for expected failures. */
export function shouldNeverHappen(message: string): never {
	throw new Error(message);
}
