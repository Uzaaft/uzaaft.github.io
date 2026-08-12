/**
 * SGR escape-sequence helpers.
 *
 * Colors are emitted as palette indices rather than truecolor because
 * libghostty's default palette is Tomorrow Night — the same theme as
 * `src/app.css` — so `\x1b[32m` already resolves to #b5bd68. Using indices
 * keeps the byte stream small and lets the terminal own color resolution.
 */

const ESC = '\x1b';

export const RESET = `${ESC}[0m`;

/**
 * SGR foreground codes.
 *
 * A frozen object rather than a `const enum`, which Vite's isolatedModules
 * transpilation cannot inline across module boundaries.
 */
export const Color = {
	Red: 31,
	Green: 32,
	Yellow: 33,
	Blue: 34,
	Magenta: 35,
	Cyan: 36,
	White: 37,
	/** Bright black — the palette's dim grey. */
	Dim: 90
} as const;

export type Color = (typeof Color)[keyof typeof Color];

/** Wrap `text` in a foreground color, resetting afterwards. */
export const fg = (color: Color, text: string): string => `${ESC}[${color}m${text}${RESET}`;

export const bold = (text: string): string => `${ESC}[1m${text}${RESET}`;

export const italic = (text: string): string => `${ESC}[3m${text}${RESET}`;

/** Bold + colored, the combination the prompt uses. */
export const boldFg = (color: Color, text: string): string =>
	`${ESC}[1;${color}m${text}${RESET}`;

/** Clear the screen and home the cursor. */
export const CLEAR = `${ESC}[2J${ESC}[H`;

/** Switch to a fresh screen buffer, preserving the shell transcript. */
export const ENTER_ALTERNATE_SCREEN = `${ESC}[?1049h`;

/** Return to the shell transcript saved before entering the alternate screen. */
export const LEAVE_ALTERNATE_SCREEN = `${ESC}[?1049l`;

export const HIDE_CURSOR = `${ESC}[?25l`;

export const SHOW_CURSOR = `${ESC}[?25h`;

/** Erase from the cursor to the end of the line. */
export const CLEAR_LINE = `${ESC}[K`;

/** Move the cursor to the start of the current line. */
export const LINE_START = '\r';

export const CRLF = '\r\n';

/** Join lines with CRLF, which is what a VT expects rather than bare LF. */
export const lines = (...items: readonly string[]): string => items.join(CRLF) + CRLF;

/**
 * Strip escape sequences, leaving plain text.
 *
 * Used to prerender a readable transcript for crawlers and no-JS visitors,
 * who never get the canvas. Only handles CSI sequences, which is all this
 * shell emits.
 */
export const stripAnsi = (text: string): string =>
	// eslint-disable-next-line no-control-regex -- matching escape sequences is the point
	text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
