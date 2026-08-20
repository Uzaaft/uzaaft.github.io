/**
 * Site commands and boot presentation loaded into the Rush shell.
 *
 * Rush owns parsing, expansion, state, and evaluation. This module only turns
 * portfolio content into Rush function definitions and prerenderable VT bytes.
 */

import { bold, boldFg, Color, CRLF, fg, lines, link, RESET } from './ansi';
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

/** Render the site prompt for a display path, e.g. `uzaaft@bobr:~$ `. */
export function prompt(cwd: string): string {
	return (
		boldFg(Color.Green, `${host.user}@${host.machine}`) +
		fg(Color.Dim, ':') +
		fg(Color.Blue, cwd) +
		fg(Color.Dim, '$ ')
	);
}

const pad = (text: string, width: number): string => text.padEnd(width, ' ');

/** Command the live terminal runs on a fresh load. */
export const BOOT_COMMAND = 'fastfetch';

const DARK_SWATCHES = [
	Color.Black,
	Color.Red,
	Color.Green,
	Color.Yellow,
	Color.Blue,
	Color.Magenta,
	Color.Cyan,
	Color.White
] as const;

const BRIGHT_SWATCHES = [
	Color.BrightBlack,
	Color.BrightRed,
	Color.BrightGreen,
	Color.BrightYellow,
	Color.BrightBlue,
	Color.BrightMagenta,
	Color.BrightCyan,
	Color.BrightWhite
] as const;

const swatches = (colors: readonly Color[]): string =>
	colors.map((color) => fg(color, '███')).join('');

/** The fastfetch card: beaver on the left, key/value rows on the right. */
export function fastfetch(): string {
	const artWidth = Math.max(...BEAVER.map((line) => line.length));
	const title = `${host.user}@${host.machine}`;
	const labelWidth = Math.max(...fetchRows.map((row) => row.label.length)) + 1;
	const right: string[] = [
		boldFg(Color.Yellow, host.user) + fg(Color.Dim, '@') + boldFg(Color.Yellow, host.machine),
		fg(Color.Dim, '-'.repeat(title.length)),
		...fetchRows.map((row) => fg(Color.Cyan, pad(`${row.label}:`, labelWidth + 1)) + row.value),
		swatches(DARK_SWATCHES),
		swatches(BRIGHT_SWATCHES)
	];

	const height = Math.max(BEAVER.length, right.length);
	const out: string[] = [];

	for (let i = 0; i < height; i++) {
		const art = fg(Color.Magenta, pad(BEAVER[i] ?? '', artWidth) + '    ');
		out.push(art + (right[i] ?? ''));
	}

	return lines(...out);
}

/**
 * The bytes a fresh visit writes: login banner, the boot command, its
 * output, the hint, and a prompt. Shared by the prerendered transcript and
 * the live VT so hydration paints the same grid the HTML already showed.
 */
export function bootOutput(previous: PreviousLogin | null): string {
	return (
		banner(previous) +
		prompt('~') +
		BOOT_COMMAND +
		CRLF +
		fastfetch() +
		CRLF +
		hint() +
		prompt('~')
	);
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
			fg(Color.Dim, '.rushrc')
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

function readFile(name: string): string {
	if (name.startsWith('about')) {
		return lines(boldFg(Color.Yellow, '# about'), '', ...about, '');
	}
	if (name.startsWith('now')) {
		return lines(boldFg(Color.Yellow, '# now'), '', ...now, '');
	}
	if (name.startsWith('contact')) return contact();
	if (name === '.rushrc') return lines(fg(Color.Dim, sayings.rushrc), '');
	if (name === 'cv.pdf') return lines(fg(Color.Red, sayings.cvBinary), '');
	if (!name) return lines(fg(Color.Red, 'cat: missing operand'), '');
	return lines(fg(Color.Red, `cat: ${name}: No such file or directory`), '');
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

const shellLiteral = (value: string): string => `'${value.replaceAll("'", `'"'"'`)}'`;

const printFunction = (name: string, output: string): string =>
	`${name}() { printf '%s' ${shellLiteral(output)}; }`;

const blogOutput = lines(
	...posts.map(
		(post) => fg(Color.Dim, post.date + '  ') + post.title + fg(Color.Dim, '   ' + post.minutes)
	),
	'',
	fg(Color.Green, 'open blog') + fg(Color.Dim, ' to read them'),
	''
);

const projectsOutput = lines(
	...projects.map(
		(project) =>
			fg(Color.Cyan, pad(project.name, 17)) +
			fg(Color.Dim, pad(project.language, 6)) +
			project.description
	),
	''
);

const effectMarker = (kind: 'open' | 'train', payload = ''): string =>
	`\x1b]777;uzaaft;${kind};${encodeURIComponent(payload)}\x07`;

/** Rush source evaluated once to install the portfolio's virtual commands. */
export const RUSH_INIT_SCRIPT = [
	'HOME=/; export HOME',
	printFunction('help', help()),
	printFunction('whoami', lines(sayings.whoami, '')),
	printFunction('fastfetch', fastfetch() + CRLF),
	`ls() {
		case "$PWD" in
			/blog) printf '%s' ${shellLiteral(listDirectory('~/blog'))} ;;
			/projects) printf '%s' ${shellLiteral(listDirectory('~/projects'))} ;;
			*) printf '%s' ${shellLiteral(listDirectory('~'))} ;;
		esac
	}`,
	printFunction('sl', effectMarker('train')),
	`cat() {
		case "$1" in
			about*) printf '%s' ${shellLiteral(readFile('about'))} ;;
			now*) printf '%s' ${shellLiteral(readFile('now'))} ;;
			contact*) printf '%s' ${shellLiteral(readFile('contact'))} ;;
			.rushrc) printf '%s' ${shellLiteral(readFile('.rushrc'))} ;;
			cv.pdf) printf '%s' ${shellLiteral(readFile('cv.pdf'))} ;;
			'') printf '%s' ${shellLiteral(readFile(''))} ;;
			*) printf '%s%s%s' ${shellLiteral(`\x1b[${Color.Red}mcat: `)} "$1" ${shellLiteral(`: No such file or directory${RESET}${CRLF}${CRLF}`)} ;;
		esac
	}`,
	printFunction('blog', blogOutput),
	printFunction('projects', projectsOutput),
	printFunction('contact', contact()),
	`open() {
		case "$1" in
			${Object.entries(OPEN_TARGETS)
				.map(
					([target, url]) =>
						`${target}) printf '%s' ${shellLiteral(lines(fg(Color.Dim, 'opening ') + link(url, url) + fg(Color.Dim, ' …'), '') + effectMarker('open', url))} ;;`
				)
				.join('\n')}
			*) printf '%s%s%s' ${shellLiteral(`\x1b[${Color.Red}mopen: unknown target ‘`)} "$*" ${shellLiteral(`’${RESET}${CRLF}${CRLF}`)} ; return 1 ;;
		esac
	}`,
	printFunction('theme', lines(fg(Color.Magenta, sayings.theme), '')),
	printFunction('sudo', lines(fg(Color.Red, sayings.sudo), '')),
	printFunction('q', lines(fg(Color.Yellow, sayings.exit), '')),
	printFunction('clear', '\x1b[2J\x1b[H'),
	`__site_prompt() {
		site_status=$?
		case "$PWD" in
			/) site_pwd='~' ;;
			*) site_pwd="~$PWD" ;;
		esac
		printf '%s%s%s' ${shellLiteral(boldFg(Color.Green, `${host.user}@${host.machine}`) + fg(Color.Dim, ':') + `\x1b[${Color.Blue}m`)} "$site_pwd" ${shellLiteral(RESET + fg(Color.Dim, '$ '))}
		return "$site_status"
	}`
].join('\n');

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
