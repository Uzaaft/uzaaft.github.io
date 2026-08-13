import { bootOutput } from '$lib/shell/commands';
import { parseTranscript, type Transcript } from '$lib/shell/transcript';

/**
 * Render the boot transcript as styled runs at build time.
 *
 * The live grid is a wasm VT, but first paint is this prerendered HTML so
 * the card is colored and readable before any JavaScript or wasm runs.
 *
 * The shell layer is pure, so this is the same byte stream the browser
 * later feeds the terminal — there is no second copy of the content.
 */
export function load(): { readonly transcript: Transcript } {
	// No previous login at build time — the prerendered transcript is what a
	// first-time visitor sees, which is also what a crawler should read.
	return { transcript: parseTranscript(bootOutput(null)) };
}
