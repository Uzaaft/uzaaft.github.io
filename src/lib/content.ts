/** All site copy and structure. Edit text here, not in the components. */

export type SectionKey = 'home' | 'about' | 'work' | 'blog' | 'contact';

export const site = {
	name: 'uzaaft.me',
	title: 'Uzair Aftab — uzaaft.me',
	description: 'Software engineer in Oslo. Rust, Zig, and terminals: libghostty-vt, astrocommunity.'
} as const;

export const urls = {
	github: 'https://github.com/Uzaaft',
	linkedin: 'https://www.linkedin.com/in/uzaaft',
	blog: '/blog',
	crates: 'https://crates.io/crates/libghostty-vt',
	astrocommunity: 'https://github.com/AstroNvim/astrocommunity',
	email: 'mailto:hi@uzaaft.me'
} as const;

export const hero = {
	prompt: 'whoami',
	heading: "Hi, I'm Uzair Aftab.",
	blogCta: 'Read the blog',
	githubCta: 'GitHub'
} as const;

export const fetchCard = {
	host: 'uzaaft@bobr',
	ascii: ' ▄█████▄\n███ ███\n█████████\n█▀█▀█▀█▀█',
	rows: [
		{ label: 'shell', value: 'zsh · neovim · ghostty' },
		{ label: 'languages', value: 'Rust · Zig · Lua · TypeScript' },
		{ label: 'currently', value: 'terminal emulation, editor tooling' },
		{ label: 'education', value: 'NMBU' },
		{ label: 'location', value: 'Oslo, Norway' }
	]
} as const;

export const projects = [
	{
		name: 'libghostty-vt',
		description: "Safe Rust API over Ghostty's terminal core",
		note: 'author',
		href: urls.crates
	},
	{
		name: 'astrocommunity',
		description: 'Community plugin index for AstroNvim',
		note: '1.6k ★',
		href: urls.astrocommunity
	}
] as const;

export const posts = [
	{ date: '2026-07-14', title: 'Reflow is the hard part', minutes: 6 },
	{
		date: '2026-05-02',
		title: 'Binding a zero-dependency C library without losing your mind',
		minutes: 11
	},
	{ date: '2026-02-20', title: 'My neovim config is a build system now', minutes: 4 }
] as const;

export const contact = {
	channels: [
		{ label: 'GitHub', href: urls.github },
		{ label: 'LinkedIn', href: urls.linkedin },
		{ label: 'Email', href: urls.email }
	],
	note: "The best way to reach me is email. I read everything, though I don't always reply quickly.",
	copyright: '© 2026 Uzair Aftab'
} as const;

export const sectionLabels = {
	projects: 'ls ~/projects',
	blog: 'ls -lt ~/blog',
	contact: 'contact --list'
} as const;

export const crumbs: readonly { key: SectionKey; label: string }[] = [
	{ key: 'home', label: '~/' },
	{ key: 'about', label: '~/about.md' },
	{ key: 'work', label: '~/projects' },
	{ key: 'blog', label: '~/blog' },
	{ key: 'contact', label: '~/contact.md' }
];

/** Flavor text spoken by the prompt. Mechanical errors stay in terminal.ts. */
export const terminalCopy = {
	help: [
		'cd <section>   home · about · projects · blog · contact',
		'open <target>  github · linkedin · blog · crates · email',
		'whoami · ls · cat about.md · theme · clear'
	],
	whoami: 'uzair aftab — software engineer, oslo. rust, terminals, sharp tools.',
	ls: 'about.md   projects/   blog/   contact.md   cv.pdf   .zshrc',
	zshrc: 'alias vim="nvim"   # you were expecting secrets?',
	theme: 'ghostty default (tomorrow night). the only theme with a soul.',
	sudo: 'nice try. this account is not in the sudoers file.',
	exit: "you can't leave, this is a website."
} as const;
