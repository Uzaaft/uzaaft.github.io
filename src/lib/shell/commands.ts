/**
 * The shell's command interpreter.
 *
 * A Domain Module: pure functions from input to VT bytes. It performs no I/O
 * and knows nothing about wasm, canvas, or the DOM — opening a URL is returned
 * as an effect for the imperative shell to carry out.
 */

import { bold, boldFg, Color, CRLF, fg, lines, link } from './ansi';
import type { PreviousLogin } from './session';
import {
	about,
	BEAVER,
	COMMANDS,
	contactRows,
	fetchRows,
	helpEntries,
	host,
	now,
	posts,
	projects,
	sayings,
	urls
} from './content';

export interface ShellState {
	readonly cwd: string;
}

export type ShellEffect =
	| { readonly kind: 'write'; readonly output: string }
	| { readonly kind: 'clear'; readonly output: string }
	| { readonly kind: 'open'; readonly url: string; readonly output: string }
	| { readonly kind: 'train' };

export interface ShellResult {
	readonly state: ShellState;
	readonly effect: ShellEffect;
}

export const initialState: ShellState = { cwd: '~' };

/** The prompt, e.g. `uzaaft@bobr:~$ `. */
export function prompt(state: ShellState): string {
	return (
		boldFg(Color.Green, `${host.user}@${host.machine}`) +
		fg(Color.Dim, ':') +
		fg(Color.Blue, state.cwd) +
		fg(Color.Dim, '$ ')
	);
}

const pad = (text: string, width: number): string => text.padEnd(width, ' ');

const write = (state: ShellState, output: string): ShellResult => ({
	state,
	effect: { kind: 'write', output }
});

/** The neofetch card: beaver on the left, key/value rows on the right. */
export function neofetch(): string {
	const right: string[] = [
		boldFg(Color.Yellow, host.user) + fg(Color.Dim, '@') + boldFg(Color.Yellow, host.machine),
		fg(Color.Dim, '─'.repeat(30)),
		...fetchRows.map((row) => fg(Color.Cyan, pad(row.label, 11)) + row.value),
		'',
		[Color.Red, Color.Green, Color.Yellow, Color.Blue, Color.Magenta, Color.Cyan]
			.map((color) => fg(color, '███'))
			.join('')
	];

	const height = Math.max(BEAVER.length, right.length);
	const out: string[] = [];

	for (let i = 0; i < height; i++) {
		const art = fg(Color.Magenta, pad(BEAVER[i] ?? '', 12) + '    ');
		out.push(art + (right[i] ?? ''));
	}

	return lines(...out);
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec'
] as const;

const two = (n: number): string => String(n).padStart(2, '0');

/**
 * `date`'s login format: `Fri Aug  8 09:12:44`, day space-padded to two
 * columns. Local time, matching what a real shell reports.
 */
export function formatLoginTime(at: Date): string {
	const day = String(at.getDate()).padStart(2, ' ');
	const time = `${two(at.getHours())}:${two(at.getMinutes())}:${two(at.getSeconds())}`;
	return `${DAYS[at.getDay()]} ${MONTHS[at.getMonth()]} ${day} ${time}`;
}

/**
 * The boot banner, written before the first prompt.
 *
 * `previous` is this browser's last recorded visit, or null on a first visit —
 * the line is only printed when it is actually true.
 */
export function banner(previous: PreviousLogin | null): string {
	const login =
		previous === null
			? sayings.firstLogin
			: `Last login: ${formatLoginTime(previous.at)} on ${previous.tty}`;

	return lines(fg(Color.Dim, login));
}

export function hint(): string {
	return lines('', fg(Color.Dim, 'type ') + fg(Color.Green, 'help') + fg(Color.Dim, ' to see what this shell knows.'), '');
}

function help(): string {
	return lines(
		bold('builtins'),
		...helpEntries.map(
			(entry) => fg(Color.Green, '  ' + pad(entry.usage, 12)) + fg(Color.Dim, entry.blurb)
		),
		''
	);
}

function listDirectory(cwd: string): string {
	if (cwd === '~/blog') {
		return lines(
			...posts.map(
				(post) =>
					fg(Color.Dim, post.date + '-') +
					fg(Color.Blue, post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.md')
			),
			''
		);
	}

	if (cwd === '~/projects') {
		return lines(projects.map((p) => fg(Color.Cyan, pad(p.name, 16))).join(''), '');
	}

	return lines(
		[
			fg(Color.Blue, pad('about.md', 14)),
			fg(Color.Blue, pad('now.md', 14)),
			fg(Color.Blue, pad('contact.md', 14)),
			fg(Color.Magenta, 'cv.pdf')
		].join(''),
		[
			fg(Color.Cyan, pad('projects/', 14)),
			fg(Color.Cyan, pad('blog/', 14)),
			fg(Color.Dim, '.zshrc')
		].join(''),
		''
	);
}

function contact(): string {
	return lines(
		...contactRows.map(
			(row) => fg(Color.Cyan, pad(row.label, 10)) + link(row.uri, row.value)
		),
		'',
		fg(Color.Dim, sayings.contactNote),
		''
	);
}

function readFile(name: string, state: ShellState): ShellResult {
	if (name.startsWith('about')) {
		return write(state, lines(boldFg(Color.Yellow, '# about'), '', ...about, ''));
	}
	if (name.startsWith('now')) {
		return write(state, lines(boldFg(Color.Yellow, '# now'), '', ...now, ''));
	}
	if (name.startsWith('contact')) return write(state, contact());
	if (name === '.zshrc') return write(state, lines(fg(Color.Dim, sayings.zshrc), ''));
	if (name === 'cv.pdf') return write(state, lines(fg(Color.Red, sayings.cvBinary), ''));
	if (!name) return write(state, lines(fg(Color.Red, 'cat: missing operand'), ''));
	return write(
		state,
		lines(fg(Color.Red, `cat: ${name}: No such file or directory`), '')
	);
}

const OPEN_TARGETS: Readonly<Record<string, string>> = {
	github: urls.github,
	linkedin: urls.linkedin,
	blog: urls.blog,
	crates: urls.crates,
	astrocommunity: urls.astrocommunity,
	bobrwm: 'https://github.com/bobrwm/bobrwm',
	email: urls.email
};

/**
 * Interpret one command line.
 *
 * Returns the next state plus the effect to apply. A blank line still produces
 * a `write` effect so the caller re-emits the prompt uniformly.
 */
export function run(raw: string, state: ShellState): ShellResult {
	const command = raw.trim();
	if (!command) return write(state, '');

	const parts = command.split(/\s+/);
	const head = (parts[0] ?? '').toLowerCase();
	const argument = parts
		.slice(1)
		.join(' ')
		.replace(/^\.\//, '')
		.replace(/\/$/, '');
	const arg = argument.toLowerCase();

	switch (head) {
		case 'help':
			return write(state, help());

		case 'whoami':
			return write(state, lines(sayings.whoami, ''));

		case 'neofetch':
			return write(state, neofetch() + CRLF);

		case 'ls':
			return write(state, listDirectory(state.cwd));

		case 'sl':
			return { state, effect: { kind: 'train' } };

		case 'cd': {
			if (!arg || arg === '~' || arg === '..') return write({ cwd: '~' }, '');
			if (arg === 'blog' || arg === 'projects') return write({ cwd: `~/${arg}` }, '');
			return write(
				state,
				lines(fg(Color.Red, `cd: no such file or directory: ${argument}`), '')
			);
		}

		case 'cat':
			return readFile(arg, state);

		case 'blog':
			return write(
				state,
				lines(
					...posts.map(
						(post) =>
							fg(Color.Dim, post.date + '  ') +
							post.title +
							fg(Color.Dim, '   ' + post.minutes)
					),
					'',
					fg(Color.Green, 'open blog') + fg(Color.Dim, ' to read them'),
					''
				)
			);

		case 'projects':
			return write(
				state,
				lines(
					...projects.map(
						(project) =>
							fg(Color.Cyan, pad(project.name, 17)) +
							fg(Color.Dim, pad(project.language, 6)) +
							project.description
					),
					''
				)
			);

		case 'contact':
			return write(state, contact());

		case 'open': {
			const url = OPEN_TARGETS[arg];
			if (!url) {
				return write(
					state,
					lines(fg(Color.Red, `open: unknown target ‘${argument}’`), '')
				);
			}
			return {
				state,
				effect: {
					kind: 'open',
					url,
					output: lines(fg(Color.Dim, 'opening ') + link(url, url) + fg(Color.Dim, ' …'), '')
				}
			};
		}

		case 'theme':
			return write(state, lines(fg(Color.Magenta, sayings.theme), ''));

		case 'sudo':
			return write(state, lines(fg(Color.Red, sayings.sudo), ''));

		case 'exit':
		case 'q':
		case ':q':
			return write(state, lines(fg(Color.Yellow, sayings.exit), ''));

		case 'clear':
			return { state, effect: { kind: 'clear', output: '' } };

		default:
			return write(
				state,
				lines(
					fg(Color.Red, `zsh: command not found: ${head}`),
					fg(Color.Dim, 'try ') + fg(Color.Green, 'help'),
					''
				)
			);
	}
}

/**
 * Tab completion over the builtin list.
 *
 * Returns the completed input when exactly one command matches, the list of
 * candidates when several do, and nothing when none do.
 */
export function complete(
	input: string
): { readonly kind: 'none' } | { readonly kind: 'single'; readonly input: string } | {
	readonly kind: 'many';
	readonly matches: readonly string[];
} {
	if (input.includes(' ')) return { kind: 'none' };
	const matches = COMMANDS.filter((command) => command.startsWith(input));
	if (matches.length === 0) return { kind: 'none' };
	if (matches.length === 1) return { kind: 'single', input: `${matches[0]} ` };
	return { kind: 'many', matches };
}
