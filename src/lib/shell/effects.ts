/** A browser-only effect requested by a trusted site command running in Rush. */
export type ShellUiEffect =
	| { readonly kind: 'open'; readonly url: string }
	| { readonly kind: 'train' };

/** Shell output with private OSC effect markers removed and decoded. */
export interface ShellOutput {
	readonly bytes: string;
	readonly effects: readonly ShellUiEffect[];
}

const EFFECT_MARKER = /\x1b\]777;uzaaft;(open|train);([^\x07]*)\x07/g;

/**
 * Decode the private OSC protocol emitted only by the installed site functions.
 * Unknown or malformed markers remain inert terminal output.
 */
export function parseShellOutput(output: string): ShellOutput {
	const effects: ShellUiEffect[] = [];
	const bytes = output.replace(EFFECT_MARKER, (marker, kind: string, encoded: string) => {
		if (kind === 'train') {
			effects.push({ kind: 'train' });
			return '';
		}

		try {
			const url = decodeURIComponent(encoded);
			if (url.startsWith('https://') || url.startsWith('mailto:') || url.startsWith('/')) {
				effects.push({ kind: 'open', url });
				return '';
			}
		} catch {
			return marker;
		}

		return marker;
	});

	return { bytes, effects };
}
