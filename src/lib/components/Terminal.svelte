<script lang="ts">
	import type { SectionKey } from '$lib/content';
	import { run, type TermColor, type TermLine } from '$lib/terminal';

	let { onNavigate }: { onNavigate: (section: SectionKey) => void } = $props();

	const HISTORY_LIMIT = 40;

	let input = $state('');
	let output = $state<TermLine[]>([]);
	let history = $state<string[]>([]);
	let historyIndex = $state(-1);
	let inputEl: HTMLInputElement | undefined = $state();

	const colorVar: Record<TermColor, string> = {
		fg: 'var(--fg)',
		dim: 'var(--fg-dim)',
		red: 'var(--red)',
		green: 'var(--green)',
		blue: 'var(--blue)',
		yellow: 'var(--yellow)',
		magenta: 'var(--magenta)',
		cyan: 'var(--cyan)'
	};

	function submit() {
		const raw = input.trim();
		const result = run(raw);
		if (raw) history = [raw, ...history].slice(0, HISTORY_LIMIT);
		input = '';
		historyIndex = -1;

		if (result === null || result.kind === 'clear') {
			output = [];
			return;
		}
		output = [{ text: `› ${raw}`, color: 'dim' }, ...result.lines];
		if (result.kind === 'navigate') onNavigate(result.section);
		if (result.kind === 'open') window.open(result.url, '_blank');
	}

	function onKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			submit();
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			const next = Math.min(historyIndex + 1, history.length - 1);
			if (next >= 0) {
				historyIndex = next;
				input = history[next];
			}
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			const next = historyIndex - 1;
			historyIndex = next;
			input = next >= 0 ? history[next] : '';
		} else if (event.key === 'Escape') {
			output = [];
			input = '';
			inputEl?.blur();
		}
	}

	function onWindowKeyDown(event: KeyboardEvent) {
		if (event.key === '/' && document.activeElement !== inputEl) {
			event.preventDefault();
			inputEl?.focus();
		}
	}
</script>

<svelte:window onkeydown={onWindowKeyDown} />

{#if output.length > 0}
	<div class="output">
		{#each output as line, i (i)}
			<div style:color={colorVar[line.color]}>{line.text}</div>
		{/each}
	</div>
{/if}

<div class="prompt">
	<span class="caret" aria-hidden="true">›</span>
	<input
		bind:this={inputEl}
		bind:value={input}
		onkeydown={onKeyDown}
		placeholder="help"
		spellcheck="false"
		autocomplete="off"
		aria-label="command prompt"
	/>
	<span class="hint">{input ? 'enter ↵' : 'esc to dismiss'}</span>
</div>

<style>
	.output {
		flex-shrink: 0;
		background: var(--bg-output);
		border-top: 1px solid var(--line);
		padding: 12px 18px;
		font-size: 12.5px;
		line-height: 1.65;
		max-height: 150px;
		overflow-y: auto;
	}

	.output div {
		white-space: pre-wrap;
	}

	.prompt {
		flex-shrink: 0;
		border-top: 1px solid var(--line);
		background: var(--bg-bar);
		padding: 12px 18px;
		display: flex;
		align-items: center;
		gap: 11px;
	}

	.caret {
		color: var(--green);
		font-size: 13px;
		font-weight: 700;
	}

	input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		color: var(--fg);
		font-family: inherit;
		font-size: 13px;
		caret-color: var(--yellow);
	}

	input::placeholder {
		color: var(--fg-faint);
	}

	.hint {
		font-size: 11.5px;
		color: var(--fg-faint);
	}
</style>
