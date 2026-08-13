/**
 * Turn a shell VT byte stream into a colored transcript the page can
 * prerender. Domain Module: pure, no I/O, understands only the sequences
 * this shell emits (SGR and OSC 8).
 */

import { Color } from './ansi';

/** Tomorrow Night, matching Ghostty's default palette and `src/app.css`. */
const PALETTE: Readonly<Record<number, string>> = {
	[Color.Black]: '#1d1f21',
	[Color.Red]: '#cc6666',
	[Color.Green]: '#b5bd68',
	[Color.Yellow]: '#f0c674',
	[Color.Blue]: '#81a2be',
	[Color.Magenta]: '#b294bb',
	[Color.Cyan]: '#8abeb7',
	[Color.White]: '#c5c8c6',
	[Color.BrightBlack]: '#969896',
	[Color.BrightRed]: '#d54e53',
	[Color.BrightGreen]: '#b9ca4a',
	[Color.BrightYellow]: '#e7c547',
	[Color.BrightBlue]: '#7aa6da',
	[Color.BrightMagenta]: '#c397d8',
	[Color.BrightCyan]: '#70c0b1',
	[Color.BrightWhite]: '#eaeaea'
};

/** A run of adjacent characters that share color, weight, and link. */
export interface TranscriptRun {
	readonly x: number;
	readonly text: string;
	/** CSS color, or `null` for the default foreground. */
	readonly color: string | null;
	readonly bold: boolean;
	readonly italic: boolean;
	readonly uri: string | null;
}

/** One row of the prerendered grid. */
export interface TranscriptLine {
	readonly y: number;
	readonly runs: readonly TranscriptRun[];
}

/** Caret sitting after the last emitted character. */
export interface TranscriptCursor {
	readonly x: number;
	readonly y: number;
}

/**
 * A screenful of styled text plus the caret sitting after the last prompt.
 *
 * `text` is the same content with escapes removed, for the live region and
 * for anything that just wants characters.
 */
export interface Transcript {
	readonly lines: readonly TranscriptLine[];
	readonly cursor: TranscriptCursor;
	readonly text: string;
}

interface Style {
	color: string | null;
	bold: boolean;
	italic: boolean;
	uri: string | null;
}

const defaultStyle = (): Style => ({
	color: null,
	bold: false,
	italic: false,
	uri: null
});

const applySgr = (style: Style, params: readonly number[]): void => {
	if (params.length === 0) {
		Object.assign(style, defaultStyle());
		return;
	}

	for (const code of params) {
		if (code === 0) {
			Object.assign(style, defaultStyle());
			continue;
		}
		if (code === 1) {
			style.bold = true;
			continue;
		}
		if (code === 3) {
			style.italic = true;
			continue;
		}
		if (code === 22) {
			style.bold = false;
			continue;
		}
		if (code === 23) {
			style.italic = false;
			continue;
		}
		if (code === 39) {
			style.color = null;
			continue;
		}
		const mapped = PALETTE[code];
		if (mapped !== undefined) style.color = mapped;
	}
};

/**
 * Parse a shell byte stream into lines of styled runs.
 *
 * Unknown CSI / OSC sequences are skipped. The cursor is left after the last
 * character emitted, which for `bootOutput` is the trailing space of the
 * prompt.
 */
export function parseTranscript(bytes: string): Transcript {
	const lines: TranscriptLine[] = [];
	const style = defaultStyle();
	let runs: TranscriptRun[] = [];
	let runText = '';
	let runX = 0;
	let x = 0;
	let y = 0;
	let text = '';

	const flush = (): void => {
		if (runText === '') return;
		runs.push({
			x: runX,
			text: runText,
			color: style.color,
			bold: style.bold,
			italic: style.italic,
			uri: style.uri
		});
		runText = '';
	};

	const emit = (char: string): void => {
		if (runText === '') runX = x;
		runText += char;
		text += char;
		x += 1;
	};

	const newline = (): void => {
		flush();
		lines.push({ y, runs });
		runs = [];
		x = 0;
		y += 1;
		text += '\n';
	};

	const startRun = (): void => {
		flush();
		runX = x;
	};

	let i = 0;
	while (i < bytes.length) {
		const char = bytes[i] ?? '';

		if (char === '\r') {
			i += 1;
			if (bytes[i] === '\n') i += 1;
			newline();
			continue;
		}

		if (char === '\n') {
			i += 1;
			newline();
			continue;
		}

		if (char === '\x1b') {
			const next = bytes[i + 1];
			if (next === '[') {
				const end = bytes.slice(i + 2).search(/[A-Za-z]/);
				if (end === -1) break;
				const final = bytes[i + 2 + end] ?? '';
				const raw = bytes.slice(i + 2, i + 2 + end);
				i += 3 + end;
				if (final === 'm') {
					startRun();
					const params =
						raw === ''
							? []
							: raw.split(';').map((part) => {
									const n = Number(part);
									return Number.isFinite(n) ? n : 0;
								});
					applySgr(style, params);
				}
				continue;
			}

			if (next === ']') {
				const rest = bytes.slice(i + 2);
				const bell = rest.indexOf('\x07');
				const st = rest.indexOf('\x1b\\');
				const cut =
					bell === -1
						? st
						: st === -1
							? bell
							: Math.min(bell, st);
				if (cut === -1) break;
				const body = rest.slice(0, cut);
				const terminator = st !== -1 && (bell === -1 || st <= bell) ? 2 : 1;
				i += 2 + cut + terminator;
				if (body.startsWith('8;')) {
					startRun();
					const uri = body.slice(body.indexOf(';', 2) + 1);
					style.uri = uri === '' ? null : uri;
				}
				continue;
			}

			i += 1;
			continue;
		}

		emit(char);
		i += 1;
	}

	flush();
	if (runs.length > 0 || lines.length === 0) {
		lines.push({ y, runs });
	}

	return {
		lines,
		cursor: { x, y },
		text: text.replace(/\n+$/, '')
	};
}
