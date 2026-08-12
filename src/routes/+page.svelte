<script lang="ts">
	import { base } from '$app/paths';
	import { onMount, untrack } from 'svelte';
	import {
		CLEAR,
		CRLF,
		ENTER_ALTERNATE_SCREEN,
		HIDE_CURSOR,
		LEAVE_ALTERNATE_SCREEN,
		SHOW_CURSOR,
		stripAnsi
	} from '$lib/shell/ansi';
	import {
		banner,
		complete,
		hint,
		initialState,
		prompt,
		run,
		type ShellState
	} from '$lib/shell/commands';
	import { CHIPS } from '$lib/shell/content';
	import { beginSession } from '$lib/shell/session';
	import { renderTrainFrame, TRAIN_WIDTH } from '$lib/shell/train';
	import { CanvasRenderer, type Theme } from '$lib/vt/canvas-renderer';
	import { VtModule } from '$lib/vt/module';
	import { VtTerminal, type GridSnapshot } from '$lib/vt/terminal';
	import TerminalTranscript from '$lib/vt/terminal-transcript.svelte';

	const FONT = { family: "'JetBrains Mono', ui-monospace, monospace", sizePx: 13.5, lineHeight: 1.6 };
	const THEME: Theme = { foreground: '#c5c8c6', background: '#1d1f21', cursor: '#f0c674' };
	const BOOT_COMMAND = 'neofetch';
	const KEYSTROKE_MS = 62;

	let canvasEl: HTMLCanvasElement | undefined = $state();
	let surfaceEl: HTMLDivElement | undefined = $state();
	let inputEl: HTMLInputElement | undefined = $state();

	let { data } = $props();

	let dims = $state('—');
	/**
	 * Starts as the prerendered boot transcript so the page is readable before
	 * wasm loads, then tracks the live grid.
	 *
	 * `untrack` because seeding once is the intent: the route is prerendered and
	 * never re-navigated to, and after boot this belongs to the renderer.
	 */
	let mirror = $state(untrack(() => data.transcript));
	let snapshot = $state<GridSnapshot | null>(null);
	let failure = $state<string | null>(null);
	let announcement = $state<{ readonly id: number; readonly text: string } | null>(null);
	/** Gates input and the chip bar until the boot animation finishes. */
	let interactive = $state(false);

	/** Non-reactive engine state: mutating these must never trigger a re-render. */
	let terminal: VtTerminal | null = null;
	let renderer: CanvasRenderer | null = null;
	let shell: ShellState = initialState;
	let line = $state('');
	let history: string[] = [];
	let historyIndex = -1;
	let frame = 0;
	let gridCols = 80;
	let gridRows = 24;
	let cellWidth = $state(8);
	let cellHeight = $state(22);
	let trainTimer: number | undefined;
	let announcementId = 0;

	function paint(force = false): void {
		if (!terminal || !renderer) return;
		const result = terminal.snapshot();
		if (result._tag === 'err') {
			failure = result.error.message;
			return;
		}
		renderer.draw(result.value, force);
		snapshot = result.value;
		updateMirror(snapshot);
	}

	/** Schedule a repaint on the next frame, coalescing bursts of writes. */
	function schedule(force = false): void {
		if (frame !== 0) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			paint(force);
		});
	}

	/** Mirror the grid as text for screen readers and crawlers. */
	function updateMirror(snapshot: GridSnapshot): void {
		const rows: string[] = [];
		for (const row of snapshot.lines) {
			const text = row.runs
				.map((r) => r.text)
				.join('')
				.replace(/\s+$/, '');
			if (text) rows.push(text);
		}
		mirror = rows.join('\n');
	}

	function write(bytes: string): void {
		terminal?.writeText(bytes);
	}

	function announce(text: string): void {
		announcementId += 1;
		announcement = { id: announcementId, text };
	}

	function announceOutput(command: string, output: string): void {
		const text = stripAnsi(output).replaceAll(CRLF, '\n').trim();
		if (!text) return;
		if (text.length <= 240) {
			announce(text);
			return;
		}

		const name = command.trim().split(/\s+/, 1)[0] || 'Command';
		announce(`${name} completed. Output is available in the terminal transcript.`);
	}

	function submit(raw: string): void {
		write(raw + CRLF);

		const result = run(raw, shell);
		shell = result.state;

		if (result.effect.kind === 'clear') {
			write(CLEAR);
			announce('Terminal cleared.');
		} else if (result.effect.kind === 'train') {
			announce('Steam locomotive animation playing.');
			startTrain();
		} else {
			write(result.effect.output);
			announceOutput(raw, result.effect.output);
			if (result.effect.kind === 'open') {
				window.open(result.effect.url, '_blank', 'noopener,noreferrer');
			}
		}

		if (raw.trim()) {
			history = [raw.trim(), ...history].slice(0, 50);
		}
		historyIndex = -1;
		line = '';
		if (result.effect.kind === 'train') return;
		write(prompt(shell));
		schedule();
	}

	/** Play `sl` in an alternate screen, then restore the untouched transcript. */
	function startTrain(): void {
		interactive = false;
		write(ENTER_ALTERNATE_SCREEN + HIDE_CURSOR);

		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		let left = reducedMotion ? Math.floor((gridCols - TRAIN_WIDTH) / 2) : gridCols;
		let trainFrame = 0;

		const finish = (): void => {
			trainTimer = undefined;
			write(SHOW_CURSOR + LEAVE_ALTERNATE_SCREEN + prompt(shell));
			schedule(true);
			interactive = true;
			announce('Steam locomotive animation finished.');
			inputEl?.focus();
		};

		const draw = (): void => {
			write(CLEAR + renderTrainFrame(gridCols, gridRows, left, trainFrame));
			schedule(true);

			if (reducedMotion) {
				trainTimer = window.setTimeout(finish, 700);
				return;
			}

			left -= 2;
			trainFrame += 1;
			if (left <= -TRAIN_WIDTH) {
				trainTimer = window.setTimeout(finish, 28);
				return;
			}
			trainTimer = window.setTimeout(draw, 28);
		};

		draw();
	}

	function onKeyDown(event: KeyboardEvent): void {
		if (!interactive || event.isComposing) return;

		if (event.key === 'Enter') {
			event.preventDefault();
			submit(line);
			return;
		}

		if (event.key === 'l' && event.ctrlKey) {
			event.preventDefault();
			write(CLEAR + prompt(shell));
			schedule(true);
			return;
		}

		if (event.key === 'u' && event.ctrlKey) {
			event.preventDefault();
			line = '';
			return;
		}

		if (event.key === 'Tab') {
			event.preventDefault();
			const completion = complete(line);
			if (completion.kind === 'single') {
				line = completion.input;
			} else if (completion.kind === 'many') {
				write(
					line + CRLF + completion.matches.join('  ') + CRLF + prompt(shell)
				);
				schedule();
			}
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			const next = Math.min(historyIndex + 1, history.length - 1);
			if (next >= 0) {
				historyIndex = next;
				line = history[next];
			}
			return;
		}

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			historyIndex -= 1;
			line = historyIndex >= 0 ? history[historyIndex] : '';
			if (historyIndex < -1) historyIndex = -1;
		}
	}

	function runChip(command: string): void {
		if (!interactive) return;
		line = command;
		submit(command);
		inputEl?.focus();
	}

	function focusInputFromSurface(event: MouseEvent): void {
		if (!(event.target instanceof Element)) return;
		if (event.target.closest('a, button, input, [data-terminal-run]')) return;
		const selection = window.getSelection();
		if (selection !== null && !selection.isCollapsed) return;
		inputEl?.focus();
	}

	function fitToSurface(): void {
		if (!renderer || !terminal || !surfaceEl) return;
		const rect = surfaceEl.getBoundingClientRect();
		const grid = renderer.resize(rect.width, rect.height);
		const resized = terminal.resize(
			grid.cols,
			grid.rows,
			Math.round(renderer.cell.width),
			renderer.cell.height
		);
		if (resized._tag === 'err') {
			failure = resized.error.message;
			return;
		}
		dims = `${grid.cols}×${grid.rows}`;
		gridCols = grid.cols;
		gridRows = grid.rows;
		cellWidth = renderer.cell.width;
		cellHeight = renderer.cell.height;
		paint(true);
	}

	/** Type the boot command a character at a time, then run it. */
	async function playBoot(): Promise<void> {
		const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		// Recorded once per page load, before anything is drawn, so the banner
		// reports the visit before this one rather than this one.
		write(banner(beginSession(new Date())) + prompt(shell));
		schedule();

		if (reducedMotion) {
			write(BOOT_COMMAND + CRLF);
		} else {
			await sleep(420);

			for (const char of BOOT_COMMAND) {
				write(char);
				schedule();
				await sleep(KEYSTROKE_MS);
			}

			await sleep(320);
			write(CRLF);
		}

		const result = run(BOOT_COMMAND, shell);
		shell = result.state;
		if (result.effect.kind === 'write' || result.effect.kind === 'open') {
			write(result.effect.output);
		}
		write(hint() + prompt(shell));
		schedule();

		interactive = true;
		inputEl?.focus();
	}

	onMount(() => {
		let disposed = false;
		let observer: ResizeObserver | undefined;

		const boot = async (): Promise<void> => {
			if (!canvasEl || !surfaceEl) return;

			const ctx = canvasEl.getContext('2d');
			if (!ctx) {
				failure = 'This browser has no 2D canvas context.';
				return;
			}

			// Measuring before the webfont loads would lock in the fallback's
			// advance width and leave the grid misaligned once it swaps in.
			//
			// `fonts.ready` alone is not enough: it resolves once *pending* loads
			// settle, and a font nothing has painted yet has not been requested.
			// Ask for both weights explicitly first. A failure here is not fatal —
			// the fallback still renders, just at a different pitch.
			await Promise.allSettled([
				document.fonts.load(`${FONT.sizePx}px ${FONT.family}`),
				document.fonts.load(`700 ${FONT.sizePx}px ${FONT.family}`),
				document.fonts.load(`italic ${FONT.sizePx}px ${FONT.family}`)
			]);
			await document.fonts.ready;

			const loaded = await VtModule.load(`${base}/ghostty-vt.wasm`);
			if (loaded._tag === 'err') {
				failure = loaded.error.message;
				return;
			}
			if (disposed) return;

			renderer = new CanvasRenderer(canvasEl, ctx, FONT, THEME);
			const initial = renderer.resize(
				surfaceEl.getBoundingClientRect().width,
				surfaceEl.getBoundingClientRect().height
			);

			const created = VtTerminal.create(loaded.value, initial.cols, initial.rows);
			if (created._tag === 'err') {
				failure = created.error.message;
				return;
			}
			if (disposed) {
				created.value.dispose();
				return;
			}

			terminal = created.value;
			dims = `${initial.cols}×${initial.rows}`;
			gridCols = initial.cols;
			gridRows = initial.rows;
			cellWidth = renderer.cell.width;
			cellHeight = renderer.cell.height;

			observer = new ResizeObserver(() => fitToSurface());
			observer.observe(surfaceEl);

			await playBoot();
		};

		void boot();

		return () => {
			disposed = true;
			observer?.disconnect();
			if (frame !== 0) cancelAnimationFrame(frame);
			if (trainTimer !== undefined) window.clearTimeout(trainTimer);
			terminal?.dispose();
			terminal = null;
		};
	});
</script>

<svelte:head>
	<title>Uzair Aftab — uzaaft.me</title>
	<meta
		name="description"
		content="Software engineer in Oslo. Rust, Zig, and nix: libghostty-rs, astrocommunity."
	/>
</svelte:head>

<a class="skip-link" href="#terminal-transcript">Skip to terminal transcript</a>

<div class="shell">
	<header>
		<div class="tab"><span class="dot"></span>uzaaft@bobr</div>
		<div class="spacer"></div>
		<div class="meta">
			<span>libghostty-vt · wasm</span>
			<span class="pipe">|</span>
			<span>{dims}</span>
		</div>
	</header>

	<div
		class="surface"
		bind:this={surfaceEl}
		onclick={focusInputFromSurface}
		role="presentation"
	>
		<canvas bind:this={canvasEl} aria-hidden="true"></canvas>
		<TerminalTranscript {snapshot} fallback={mirror} {cellWidth} {cellHeight} />

		<!-- Native editing keeps selection, mobile keyboards, and IME behavior. -->
		<input
			bind:this={inputEl}
			bind:value={line}
			onkeydown={onKeyDown}
			class="capture"
			disabled={!interactive}
			style:left={`${(snapshot?.cursor?.x ?? 0) * cellWidth}px`}
			style:top={`${(snapshot?.cursor?.y ?? 0) * cellHeight}px`}
			style:height={`${cellHeight}px`}
			style:line-height={`${cellHeight}px`}
			spellcheck="false"
			autocomplete="off"
			autocapitalize="off"
			aria-label="Terminal command"
			aria-describedby="terminal-hint"
		/>

		{#if failure}
			<p class="failure" role="alert">{failure}</p>
		{/if}

		<div class="sr-only" aria-live="polite" aria-atomic="true">
			{#if announcement}
				{#key announcement.id}{announcement.text}{/key}
			{/if}
		</div>

	</div>

	<footer>
		<span class="label">run:</span>
		{#each CHIPS as chip (chip)}
			<button onclick={() => runChip(chip)} disabled={!interactive}>{chip}</button>
		{/each}
		<div class="spacer"></div>
		<a class="plain-link" href={`${base}/plain`}>plain page</a>
		<span class="hint" id="terminal-hint">tab completes · ↑ history · ctrl-l clears</span>
	</footer>
</div>

<style>
	.shell {
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		background: #131517;
	}

	.skip-link {
		position: fixed;
		top: 8px;
		left: 8px;
		z-index: 10;
		padding: 8px 12px;
		transform: translateY(-160%);
		color: #1d1f21;
		background: #f0c674;
		border-radius: 4px;
	}

	.skip-link:focus {
		transform: translateY(0);
	}

	header {
		flex-shrink: 0;
		height: 38px;
		background: #0f1113;
		border-bottom: 1px solid #23272a;
		display: flex;
		align-items: stretch;
		padding: 0 10px;
		gap: 2px;
	}

	.tab {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 14px;
		margin-top: 5px;
		font-size: 11.5px;
		color: #e8eaea;
		background: #1d1f21;
		border: 1px solid #23272a;
		border-bottom: none;
		border-radius: 7px 7px 0 0;
	}

	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #b5bd68;
		display: block;
	}

	.spacer {
		flex: 1;
	}

	.meta {
		display: flex;
		align-items: center;
		gap: 14px;
		font-size: 11px;
		color: #8b9096;
	}

	.pipe {
		color: #3a3f43;
	}

	.surface {
		position: relative;
		flex: 1;
		min-height: 18rem;
		overflow: hidden;
		background: #1d1f21;
		cursor: text;
	}

	.surface:focus-within {
		box-shadow: inset 0 0 0 2px #81a2be;
	}

	canvas {
		display: block;
		visibility: hidden;
	}

	/* Native command editor, positioned immediately after the VT prompt. */
	.capture {
		position: absolute;
		z-index: 2;
		right: 0;
		box-sizing: border-box;
		border: none;
		outline: none;
		padding: 0;
		background: transparent;
		color: #c5c8c6;
		caret-color: #f0c674;
		font: 13.5px/1 'JetBrains Mono', ui-monospace, monospace;
	}

	.capture:disabled {
		display: none;
	}

	.failure {
		position: absolute;
		inset: auto 16px 16px;
		margin: 0;
		font-size: 12px;
		color: #cc6666;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}

	footer {
		flex-shrink: 0;
		background: #17191b;
		border-top: 1px solid #23272a;
		padding: 9px 14px;
		display: flex;
		gap: 7px;
		flex-wrap: wrap;
		align-items: center;
	}

	.label {
		font-size: 11px;
		color: #8b9096;
		margin-right: 4px;
	}

	footer button {
		font-family: inherit;
		font-size: 11.5px;
		color: #8b9096;
		background: #1d1f21;
		border: 1px solid #2a2e31;
		border-radius: 5px;
		padding: 5px 11px;
		cursor: pointer;
	}

	footer button:hover:not(:disabled) {
		border-color: #b5bd68;
		color: #b5bd68;
	}

	footer button:focus-visible,
	.plain-link:focus-visible {
		outline: 2px solid #f0c674;
		outline-offset: 2px;
	}

	footer button:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.hint {
		font-size: 11px;
		color: #8b9096;
	}

	.plain-link {
		font-size: 11.5px;
		color: #81a2be;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	@media (max-width: 40rem) {
		header {
			height: auto;
			min-height: 38px;
		}

		.meta {
			flex-wrap: wrap;
			justify-content: flex-end;
			gap: 4px 10px;
			padding: 4px 0;
		}
	}
</style>
