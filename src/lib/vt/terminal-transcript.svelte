<script lang="ts">
	import type { CellRun, GridSnapshot, Rgb } from './terminal';

	interface Props {
		readonly snapshot: GridSnapshot | null;
		readonly fallback: string;
		readonly cellWidth: number;
		readonly cellHeight: number;
	}

	let { snapshot, fallback, cellWidth, cellHeight }: Props = $props();

	const cssColor = (color: Rgb): string => `rgb(${color.r} ${color.g} ${color.b})`;

	function runStyle(run: CellRun, grid: GridSnapshot): string {
		const defaultForeground = cssColor(grid.foreground);
		const defaultBackground = cssColor(grid.background);
		const foreground = run.fg === null ? defaultForeground : cssColor(run.fg);
		const background = run.bg === null ? defaultBackground : cssColor(run.bg);
		const resolvedForeground = run.inverse ? background : foreground;
		const resolvedBackground = run.inverse ? foreground : background;

		return [
			`left:${run.x * cellWidth}px`,
			`color:${resolvedForeground}`,
			`background:${resolvedBackground}`,
			`font-weight:${run.bold ? 700 : 400}`,
			`font-style:${run.italic ? 'italic' : 'normal'}`,
			`text-decoration:${run.underline ? 'underline' : 'none'}`
		].join(';');
	}
</script>

<pre
	class="terminal-transcript"
	aria-label="Terminal transcript"
	style:--cell-height={`${cellHeight}px`}
>
	{#if snapshot}
		{#each snapshot.lines as row (row.y)}<span class="row" style:top={`${row.y * cellHeight}px`}>{#each row.runs as run, index (`${run.x}:${index}`)}<span class="run" style={runStyle(run, snapshot)}>{run.text}</span>{/each}</span>{/each}
	{:else}
		{fallback}
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
		font: 13.5px/var(--cell-height) 'JetBrains Mono', ui-monospace, monospace;
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
	}

	.run {
		position: absolute;
		top: 0;
		height: var(--cell-height);
		white-space: pre;
	}

	.terminal-transcript::selection,
	.terminal-transcript :global(*)::selection {
		color: #1d1f21;
		background: #81a2be;
	}
</style>
