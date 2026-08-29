/** All terminal copy. Edit text here, not in the command interpreter. */

export const host = {
	user: 'uzaaft',
	machine: 'bobr'
} as const;

export const urls = {
	github: 'https://github.com/Uzaaft',
	linkedin: 'https://www.linkedin.com/in/uzaaft',
	crates: 'https://crates.io/crates/libghostty-vt',
	astrocommunity: 'https://github.com/AstroNvim/astrocommunity',
	twitter: 'https://x.com/uzaaft',
	email: 'mailto:hi@uzaaft.me'
} as const;

/** The beaver. Rendered to the left of the fetch card. */
export const BEAVER: readonly string[] = [
	'  _-----^__',
	' (   `   ) \\_',
	'  "-_        \\-____',
	'    _\\__           \\_',
	'   /,,____/          \\',
	'       \\              \\',
	'        |              |',
	' __-----\\  \\          /\\ ',
	'(=+=+=+__\\_/         /+;',
	' ^---/,,______/==--^--^'
];

export const fetchRows: readonly { readonly label: string; readonly value: string }[] = [
	{ label: 'Role', value: 'Software engineer @ Polymath' },
	{ label: 'Location', value: 'Oslo, Norway' },
	{ label: 'Tools', value: 'rush · neovim · ghostty' },
	{ label: 'Languages', value: 'Rust · Zig · Lua · TypeScript' },
	{ label: 'Currently', value: 'developer tooling, tackling engineering problems' },
	{ label: 'Education', value: 'NMBU' }
];

/** The original blog post, restored from the pre-terminal site. */
export const BOBR_POST = {
	slug: 'hello-world',
	date: '2025-11-26',
	title: 'Hello World',
	description: 'Bobr',
	tags: ['meta'],
} as const;

/** Published posts in reverse chronological order. */
export const posts = [BOBR_POST] as const;

export const projects: readonly {
	readonly name: string;
	readonly language: string;
	readonly description: string;
}[] = [
	{
		name: 'libghostty-vt',
		language: 'rust',
		description: "Safe Rust API over Ghostty's terminal core"
	},
	{
		name: 'astrocommunity',
		language: 'lua',
		description: 'Community plugin index for AstroNvim · 1.6k ★'
	},
	{ name: 'bobrwm', language: 'zig', description: 'A window manager with a rodent problem' }
];

export const helpEntries: readonly { readonly usage: string; readonly blurb: string }[] = [
	{ usage: 'whoami', blurb: 'the short version' },
	{ usage: 'fastfetch', blurb: 'the card' },
	{ usage: 'ls', blurb: 'list the current directory' },
	{ usage: 'sl', blurb: 'you meant ls, right?' },
	{ usage: 'cd <dir>', blurb: 'projects · blog' },
	{ usage: 'cat <file>', blurb: 'about.md · now.md · contact.md · .rushrc' },
	{ usage: 'blog', blurb: 'read the one post' },
	{ usage: 'projects', blurb: 'open source' },
	{ usage: 'open <x>', blurb: 'github · linkedin · crates · email' },
	{ usage: 'theme', blurb: 'about the colors' },
	{ usage: 'clear', blurb: 'wipe the scrollback' }
];

export const about: readonly string[] = [
	"Hi, I'm Uzair Aftab. I'm a software engineer in Oslo, Norway.",
	'I work at Polymath. Outside of work I write Rust and Zig.',
	'',
	'Some of my open source work include: libghostty-vt,',
	'astrocommunity, and bobrwm.'
];

export const now: readonly string[] = [
	'· shipping at Polymath',
	'· chasing API stability in the libghostty-vt bindings',
	'· reviewing astrocommunity PRs on the tram'
];

export const contactRows: readonly {
	readonly label: string;
	readonly value: string;
	readonly uri: string;
}[] = [
	{ label: 'github', value: 'github.com/Uzaaft', uri: urls.github },
	{ label: 'linkedin', value: 'linkedin.com/in/uzaaft', uri: urls.linkedin },
	{ label: 'email', value: 'hi@uzaaft.me', uri: urls.email },
	{ label: 'Twitter', value: 'x.com/uzaaft', uri: urls.twitter }
];

export const sayings = {
	whoami:
		'Uzair Aftab — software engineer in Oslo, Norway. Rust, Zig, and developer tooling.',
	contactNote: "Email is best. I read everything, though I don't always reply quickly.",
	rushrc: 'abbr --add vim nvim   # you were expecting secrets?',
	cvBinary: 'cat: cv.pdf: binary file (try `open email` and just ask)',
	theme:
		"Ghostty default (Tomorrow Night). The grid you're reading is painted by libghostty-vt compiled to wasm.",
	sudo: 'uzaaft is not in the sudoers file. This incident has been reported.',
	exit: "You can't leave. This is a website.",
	hint: 'type help to see what this shell knows.',
	firstLogin: 'First login on this browser'
} as const;

/** Commands offered for tab completion and the chip bar. */
export const COMMANDS: readonly string[] = [
	'help',
	'whoami',
	'fastfetch',
	'ls',
	'sl',
	'cat',
	'cd',
	'blog',
	'projects',
	'open',
	'contact',
	'theme',
	'clear',
	'sudo',
	'exit'
];

export const CHIPS: readonly string[] = [
	'whoami',
	'ls',
	'cat about.md',
	'projects',
	'blog',
	'contact',
	'help'
];
