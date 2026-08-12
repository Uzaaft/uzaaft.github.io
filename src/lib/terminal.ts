import { terminalCopy, urls, type SectionKey } from './content';

export type TermColor = 'fg' | 'dim' | 'red' | 'green' | 'blue' | 'yellow' | 'magenta' | 'cyan';

export interface TermLine {
	readonly text: string;
	readonly color: TermColor;
}

export type CommandResult =
	| { readonly kind: 'print'; readonly lines: readonly TermLine[] }
	| {
			readonly kind: 'navigate';
			readonly section: SectionKey;
			readonly lines: readonly TermLine[];
	  }
	| { readonly kind: 'open'; readonly url: string; readonly lines: readonly TermLine[] }
	| { readonly kind: 'clear' };

const line = (text: string, color: TermColor = 'fg'): TermLine => ({ text, color });
const print = (...lines: TermLine[]): CommandResult => ({ kind: 'print', lines });

const sections: Readonly<Record<string, SectionKey>> = {
	'': 'home',
	'~': 'home',
	home: 'home',
	about: 'about',
	'about.md': 'about',
	projects: 'work',
	work: 'work',
	blog: 'blog',
	writing: 'blog',
	contact: 'contact',
	'contact.md': 'contact'
};

const openTargets: Readonly<Record<string, string>> = {
	github: urls.github,
	linkedin: urls.linkedin,
	blog: urls.blog,
	crates: urls.crates,
	email: urls.email
};

/** Interpret one prompt line. Returns null for blank input. */
export function run(raw: string): CommandResult | null {
	const cmd = raw.trim();
	if (!cmd) return null;

	const [head = '', ...rest] = cmd.split(/\s+/);
	const arg = rest
		.join(' ')
		.toLowerCase()
		.replace(/^\.\//, '')
		.replace(/\/$/, '');

	switch (head.toLowerCase()) {
		case 'help':
			return print(...terminalCopy.help.map((text) => line(text, 'dim')));
		case 'cd':
		case 'goto': {
			const section = sections[arg];
			if (!section) return print(line(`cd: no such section: ${arg || '?'}`, 'red'));
			return { kind: 'navigate', section, lines: [line(`→ ${arg || 'home'}`, 'green')] };
		}
		case 'whoami':
			return print(line(terminalCopy.whoami));
		case 'ls':
			return print(line(terminalCopy.ls, 'blue'));
		case 'cat': {
			if (arg.startsWith('about'))
				return { kind: 'navigate', section: 'about', lines: [line('→ about.md', 'green')] };
			if (arg.startsWith('contact'))
				return { kind: 'navigate', section: 'contact', lines: [line('→ contact.md', 'green')] };
			if (arg === '.zshrc') return print(line(terminalCopy.zshrc, 'dim'));
			return print(line(`cat: ${arg}: No such file or directory`, 'red'));
		}
		case 'open': {
			const url = openTargets[arg];
			if (!url)
				return print(line('open: unknown target (github · linkedin · blog · crates · email)', 'red'));
			return { kind: 'open', url, lines: [line(`opening ${url} …`, 'dim')] };
		}
		case 'theme':
			return print(line(terminalCopy.theme, 'magenta'));
		case 'sudo':
			return print(line(terminalCopy.sudo, 'red'));
		case 'exit':
		case 'q':
		case ':q':
			return print(line(terminalCopy.exit, 'yellow'));
		case 'clear':
			return { kind: 'clear' };
		default:
			return print(line(`${head}: command not found — type help`, 'red'));
	}
}
