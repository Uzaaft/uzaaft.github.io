/** All terminal copy. Edit text here, not in the command interpreter. */

export const host = {
	user: 'uzaaft',
	machine: 'bobr'
} as const;

export const urls = {
	github: 'https://github.com/Uzaaft',
	linkedin: 'https://www.linkedin.com/in/uzaaft',
	blog: '/blog',
	crates: 'https://crates.io/crates/libghostty-vt',
	astrocommunity: 'https://github.com/AstroNvim/astrocommunity',
	email: 'mailto:hi@uzaaft.me'
} as const;

/** The beaver. Rendered to the left of the fetch card. */
export const BEAVER: readonly string[] = [
	'  (\\___/)',
	' ( o   o )',
	' (   v   )',
	'  \\ |WW| /',
	'  /|    |\\',
	' ( |####| )',
	'  \\______/'
];

export const fetchRows: readonly { readonly label: string; readonly value: string }[] = [
	{ label: 'role', value: 'Software engineer @ Polymath' },
	{ label: 'location', value: 'Oslo, Norway' },
	{ label: 'tools', value: 'zsh · neovim · ghostty' },
	{ label: 'languages', value: 'Rust · Zig · Lua · TypeScript' },
	{ label: 'currently', value: 'developer tooling, tackling engineering problems' },
	{ label: 'education', value: 'NMBU' }
];

export const posts: readonly {
	readonly date: string;
	readonly title: string;
	readonly minutes: string;
}[] = [
	{ date: '2026-07-14', title: 'Reflow is the hard part', minutes: '6 min' },
	{
		date: '2026-05-02',
		title: 'Binding a zero-dependency C library without losing your mind',
		minutes: '11 min'
	},
	{ date: '2026-02-20', title: 'My neovim config is a build system now', minutes: '4 min' }
];

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
	{ usage: 'neofetch', blurb: 'the card' },
	{ usage: 'ls', blurb: 'list the current directory' },
	{ usage: 'sl', blurb: 'you meant ls, right?' },
	{ usage: 'cd <dir>', blurb: 'projects · blog' },
	{ usage: 'cat <file>', blurb: 'about.md · now.md · contact.md · .zshrc' },
	{ usage: 'blog', blurb: 'recent writing' },
	{ usage: 'projects', blurb: 'open source' },
	{ usage: 'open <x>', blurb: 'github · linkedin · blog · crates · email' },
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

export const contactRows: readonly { readonly label: string; readonly value: string }[] = [
	{ label: 'github', value: 'github.com/Uzaaft' },
	{ label: 'linkedin', value: 'linkedin.com/in/uzaaft' },
	{ label: 'email', value: 'hi@uzaaft.me' }
];

export const sayings = {
	whoami:
		'Uzair Aftab — software engineer in Oslo, Norway. Rust, Zig, and developer tooling.',
	contactNote: "Email is best. I read everything, though I don't always reply quickly.",
	zshrc: 'alias vim="nvim"   # you were expecting secrets?',
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
	'neofetch',
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
