<script lang="ts">
	import type { Transcript, TranscriptRun } from '$lib/shell/transcript';
	import type { Theme } from './canvas-renderer';
	import type { CellRun, GridSnapshot, Rgb } from './terminal';

	interface Props {
		readonly snapshot: GridSnapshot | null;
		readonly fallback: Transcript;
		readonly cellWidth: number;
		readonly cellHeight: number;
		readonly theme: Theme;
	}

	let { snapshot, fallback, cellWidth, cellHeight, theme }: Props = $props();

	const cssColor = (color: Rgb): string =>
		`rgb(${color.r} ${color.g} ${color.b})`;

	/**
	 * Same default substitution as the canvas renderer: libghostty reports
	 * white-on-black, which would flash the surface from #1d1f21 to #000
	 * the first time the live grid replaces the prerendered card.
	 */
	function snapshotStyle(run: CellRun): string {
		const resolvedFg = run.fg === null ? theme.foreground : cssColor(run.fg);
		const resolvedBg = run.bg === null ? null : cssColor(run.bg);
		const foreground = run.inverse ? (resolvedBg ?? theme.background) : resolvedFg;
		const background = run.inverse ? resolvedFg : resolvedBg;

		return [
			`left:${run.x * cellWidth}px`,
			`color:${foreground}`,
			background === null ? '' : `background:${background}`,
			`font-weight:${run.bold ? 700 : 400}`,
			`font-style:${run.italic ? 'italic' : 'normal'}`,
			`text-decoration:${run.underline || run.uri !== null ? 'underline' : 'none'}`
		]
			.filter((part) => part !== '')
			.join(';');
	}

	function fallbackStyle(run: TranscriptRun): string {
		return [
			`left:${run.x * cellWidth}px`,
			`color:${run.color ?? '#c5c8c6'}`,
			`font-weight:${run.bold ? 700 : 400}`,
			`font-style:${run.italic ? 'italic' : 'normal'}`,
			`text-decoration:${run.uri !== null ? 'underline' : 'none'}`
		].join(';');
	}

	function safeHref(uri: string | null): string | null {
		if (uri === null) return null;
		if (
			uri.startsWith('/') ||
			uri.startsWith('https://') ||
			uri.startsWith('http://')
		) {
			return uri;
		}
		if (uri.startsWith('mailto:')) return uri;
		return null;
	}
</script>

<pre
	id="terminal-transcript"
	class="terminal-transcript"
	data-terminal-transcript
	role="region"
	aria-label="Terminal transcript"
	style:--cell-height={`${cellHeight}px`}>
	{#if snapshot}
		{#each snapshot.lines as row (row.y)}<span
				class="row"
				style:top={`${row.y * cellHeight}px`}
				>{#each row.runs as run, index (`${run.x}:${index}`)}{@const href =
						safeHref(run.uri)}{#if href}<a
							class="run"
							style={snapshotStyle(run)}
							{href}
							target={href.startsWith('http') ? '_blank' : undefined}
							rel={href.startsWith('http') ? 'noreferrer' : undefined}
							>{run.text}</a
						>{:else}<span class="run" style={snapshotStyle(run)}
							>{run.text}</span
						>{/if}{/each}</span
			>{'\n'}{/each}
	{:else}
		{#each fallback.lines as row (row.y)}<span
				class="row"
				style:top={`${row.y * cellHeight}px`}
				>{#each row.runs as run, index (`${run.x}:${index}`)}{@const href =
						safeHref(run.uri)}{#if href}<a
							class="run"
							style={fallbackStyle(run)}
							{href}
							target={href.startsWith('http') ? '_blank' : undefined}
							rel={href.startsWith('http') ? 'noreferrer' : undefined}
							>{run.text}</a
						>{:else}<span class="run" style={fallbackStyle(run)}
							>{run.text}</span
						>{/if}{/each}</span
			>{'\n'}{/each}
	{/if}
</pre>

<style>
	.terminal-transcript {
		position: absolute;
		inset: 0;
		z-index: 1;
		box-sizing: border-box;
		margin: 0;
		padding: 0;
		overflow: hidden;
		font:
			13.5px/var(--cell-height) 'JetBrains Mono',
			ui-monospace,
			monospace;
		white-space: pre;
		cursor: text;
		user-select: text;
		outline: none;
	}

	.row {
		position: absolute;
		left: 0;
		right: 0;
		height: var(--cell-height);
		pointer-events: none;
	}

	.run {
		position: absolute;
		top: 0;
		height: var(--cell-height);
		white-space: pre;
		pointer-events: auto;
	}

	a.run {
		cursor: pointer;
	}

	a.run:focus-visible {
		outline: 2px solid #f0c674;
		outline-offset: 1px;
	}

	.terminal-transcript::selection,
	.terminal-transcript :global(*)::selection {
		color: #1d1f21;
		background: #81a2be;
	}
</style>
