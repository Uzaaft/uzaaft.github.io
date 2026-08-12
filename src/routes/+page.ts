import { stripAnsi } from '$lib/shell/ansi';
import { banner, hint, initialState, neofetch, prompt } from '$lib/shell/commands';

/**
 * Render the boot transcript as plain text at build time.
 *
 * The grid itself is painted to a canvas, which crawlers and screen readers
 * cannot see, and the live mirror only fills in once wasm has loaded. This
 * gives the prerendered HTML the same content the terminal opens with, so the
 * page says something real without JavaScript.
 *
 * The shell layer is pure, so this is the same code path the browser runs —
 * there is no second copy of the content to keep in sync.
 */
export function load(): { readonly transcript: string } {
	// No previous login at build time — the prerendered transcript is what a
	// first-time visitor sees, which is also what a crawler should read.
	const boot =
		banner(null) +
		prompt(initialState) +
		'neofetch\r\n' +
		neofetch() +
		hint() +
		prompt(initialState);

	return {
		transcript: stripAnsi(boot)
			.split('\r\n')
			.map((line) => line.replace(/\s+$/, ''))
			.join('\n')
			.trim()
	};
}
