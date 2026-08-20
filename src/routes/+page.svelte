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
		bootOutput,
		complete,
		RUSH_INIT_SCRIPT
	} from '$lib/shell/commands';
	import { CHIPS } from '$lib/shell/content';
	import { parseShellOutput, type ShellUiEffect } from '$lib/shell/effects';
	import { beginSession, type Session } from '$lib/shell/session';
	import { parseTranscript, type Transcript } from '$lib/shell/transcript';
	import { renderTrainFrame, TRAIN_WIDTH } from '$lib/shell/train';
	import type { CanvasRenderer, Theme } from '$lib/vt/canvas-renderer';
	import type { GridSnapshot, VtTerminal } from '$lib/vt/terminal';
	import TerminalTranscript from '$lib/vt/terminal-transcript.svelte';
	import type { RushShell } from '$lib/rush/module';

	const FONT = {
		family: "'JetBrains Mono', ui-monospace, monospace",
		sizePx: 13.5,
		lineHeight: 1.6
	};
	const THEME: Theme = {
		foreground: '#c5c8c6',
		background: '#1d1f21',
		cursor: '#f0c674'
	};
	const DRAG_THRESHOLD_PX = 4;

	let canvasEl: HTMLCanvasElement | undefined = $state();
	let surfaceEl: HTMLDivElement | undefined = $state();
	// A textarea, not an input: Safari Keychain (and most password managers)
	// only annotate <input> elements, so a textarea never gets the key icon.
	let captureEl: HTMLTextAreaElement | undefined = $state();

	let { data } = $props();

	let dims = $state('—');
	/**
	 * Colored boot card, prerendered so first paint does not wait on wasm.
	 * Replaced by the live grid only after the first command.
	 *
	 * `untrack` because seeding once is the intent: the route is prerendered and
	 * never re-navigated to, and after boot this belongs to the renderer.
	 */
	let boot = $state<Transcript>(untrack(() => data.transcript));
	let snapshot = $state<GridSnapshot | null>(null);
	let failure = $state<string | null>(null);
	let announcement = $state<{
		readonly id: number;
		readonly text: string;
	} | null>(null);
	/** Chips and the capture editor. True as soon as the client mounts. */
	let interactive = $state(false);

	/** Non-reactive engine state: mutating these must never trigger a re-render. */
	let terminal: VtTerminal | null = null;
	let rush: RushShell | null = null;
	let renderer: CanvasRenderer | null = null;
	let currentPrompt = '';
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
	/** Distinguishes a click from a drag-select so we can refocus without killing copy. */
	let pointerOriginX = 0;
	let pointerOriginY = 0;
	let sawPointerDown = false;
	let session: Session = null;
	let engine: Promise<void> | null = null;
	let live = false;
	const queued: string[] = [];
	let disposed = false;

	const caret = $derived(snapshot?.cursor ?? boot.cursor);

	function paint(force = false): void {
		if (!live || !terminal || !renderer) return;
		const result = terminal.snapshot();
		if (result._tag === 'err') {
			failure = result.error.message;
			return;
		}
		renderer.draw(result.value, force);
		snapshot = result.value;
	}

	/** Schedule a repaint on the next frame, coalescing bursts of writes. */
	function schedule(force = false): void {
		if (frame !== 0) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			paint(force);
		});
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
		announce(
			`${name} completed. Output is available in the terminal transcript.`
		);
	}

	function submit(raw: string): void {
		if (!terminal || !rush) {
			if (raw.trim()) {
				queued.push(raw);
			}
			historyIndex = -1;
			line = '';
			void startEngine();
			return;
		}

		live = true;
		write(raw + CRLF);

		const evaluated = rush.evaluate(raw);
		if (evaluated._tag === 'err') {
			failure = evaluated.error.message;
			return;
		}
		const parsed = parseShellOutput(evaluated.value.stdout + evaluated.value.stderr);
		write(toVtBytes(parsed.bytes));
		announceOutput(raw, parsed.bytes);

		if (raw.trim()) {
			history = [raw.trim(), ...history].slice(0, 50);
		}
		historyIndex = -1;
		line = '';
		if (!refreshPrompt()) return;

		for (const effect of parsed.effects) applyUiEffect(effect);
		if (parsed.effects.some((effect) => effect.kind === 'train')) return;

		write(currentPrompt);
		schedule();
	}

	function toVtBytes(output: string): string {
		return output.replace(/\r?\n/g, CRLF);
	}

	function refreshPrompt(): boolean {
		if (!rush) return false;
		const evaluated = rush.evaluate('__site_prompt');
		if (evaluated._tag === 'err') {
			failure = evaluated.error.message;
			return false;
		}
		currentPrompt = evaluated.value.stdout;
		return true;
	}

	function applyUiEffect(effect: ShellUiEffect): void {
		if (effect.kind === 'open') {
			window.open(effect.url, '_blank', 'noopener,noreferrer');
			return;
		}

		announce('Steam locomotive animation playing.');
		startTrain();
	}

	/** Play `sl` in an alternate screen, then restore the untouched transcript. */
	function startTrain(): void {
		interactive = false;
		write(ENTER_ALTERNATE_SCREEN + HIDE_CURSOR);

		const reducedMotion = window.matchMedia(
			'(prefers-reduced-motion: reduce)'
		).matches;
		let left = reducedMotion
			? Math.floor((gridCols - TRAIN_WIDTH) / 2)
			: gridCols;
		let trainFrame = 0;

		const finish = (): void => {
			trainTimer = undefined;
			write(SHOW_CURSOR + LEAVE_ALTERNATE_SCREEN + currentPrompt);
			schedule(true);
			interactive = true;
			announce('Steam locomotive animation finished.');
			captureEl?.focus();
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
			if (!terminal) {
				void startEngine();
				return;
			}
			live = true;
			write(CLEAR + currentPrompt);
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
				if (!terminal) {
					void startEngine();
					return;
				}
				live = true;
				write(
					line + CRLF + completion.matches.join('  ') + CRLF + currentPrompt
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

	/**
	 * Pasted or dropped text can carry newlines, which a single terminal line
	 * cannot. Enter is already preventDefault'd in onKeyDown, so paste is the
	 * only source. Reassign only on change: an unconditional set would move
	 * the caret to the end on every keystroke.
	 */
	function stripPastedNewlines(): void {
		const cleaned = line.replace(/[\r\n]+/g, ' ');
		if (cleaned !== line) line = cleaned;
	}

	function runChip(command: string): void {
		if (!interactive) return;
		line = command;
		submit(command);
		captureEl?.focus();
	}

	function rememberPointerOrigin(event: PointerEvent): void {
		pointerOriginX = event.clientX;
		pointerOriginY = event.clientY;
		sawPointerDown = true;
	}

	/** Click the chrome or transcript to type. Skip links, buttons, and drag-selects. */
	function focusInputFromClick(event: MouseEvent): void {
		if (!(event.target instanceof Element)) return;
		if (event.target.closest('a, button, textarea')) return;
		if (sawPointerDown) {
			const dx = event.clientX - pointerOriginX;
			const dy = event.clientY - pointerOriginY;
			if (dx * dx + dy * dy > DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
		}
		captureEl?.focus();
	}

	/**
	 * If the input lost focus, the first printable key would otherwise vanish.
	 * Reclaim it so you can just start typing.
	 */
	function onPageKeyDown(event: KeyboardEvent): void {
		if (!interactive || !captureEl || captureEl.disabled) return;
		if (document.activeElement === captureEl) return;
		if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey)
			return;
		if (event.key.length !== 1) return;
		if (
			event.target instanceof Element &&
			event.target.closest('a, button, input, textarea, select')
		) {
			return;
		}

		event.preventDefault();
		captureEl.focus();
		line += event.key;
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

	function measureFallback(): void {
		if (!canvasEl) return;
		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;
		ctx.font = `${FONT.sizePx}px ${FONT.family}`;
		cellWidth = ctx.measureText('M').width;
		cellHeight = Math.round(FONT.sizePx * FONT.lineHeight);
	}

	function startEngine(): Promise<void> {
		engine ??= loadEngine();
		return engine;
	}

	/**
	 * Fetch wasm and stand the VT up after first paint. The prerendered card
	 * stays on screen; the live grid only replaces it when a command runs.
	 */
	async function loadEngine(): Promise<void> {
		if (!canvasEl || !surfaceEl) {
			engine = null;
			return;
		}

		const ctx = canvasEl.getContext('2d');
		if (!ctx) {
			failure = 'This browser has no 2D canvas context.';
			return;
		}

		const [
			{ CanvasRenderer: Renderer },
			{ VtModule },
			{ VtTerminal: Terminal },
			{ RushModule }
		] =
			await Promise.all([
				import('$lib/vt/canvas-renderer'),
				import('$lib/vt/module'),
				import('$lib/vt/terminal'),
				import('$lib/rush/module'),
				document.fonts
					.load(`${FONT.sizePx}px ${FONT.family}`)
					.catch(() => undefined)
			]);
		if (disposed) return;

		const [loadedVt, loadedRush] = await Promise.all([
			VtModule.load(`${base}/ghostty-vt.wasm`),
			RushModule.load(`${base}/rush.wasm`)
		]);
		if (loadedVt._tag === 'err') {
			failure = loadedVt.error.message;
			return;
		}
		if (loadedRush._tag === 'err') {
			failure = loadedRush.error.message;
			return;
		}
		if (disposed) return;

		renderer = new Renderer(canvasEl, ctx, FONT, THEME);
		const initial = renderer.resize(
			surfaceEl.getBoundingClientRect().width,
			surfaceEl.getBoundingClientRect().height
		);

		const created = Terminal.create(loadedVt.value, initial.cols, initial.rows);
		if (created._tag === 'err') {
			failure = created.error.message;
			return;
		}
		if (disposed) {
			created.value.dispose();
			return;
		}

		terminal = created.value;
		const createdRush = loadedRush.value.createShell();
		if (createdRush._tag === 'err') {
			terminal.dispose();
			terminal = null;
			failure = createdRush.error.message;
			return;
		}
		rush = createdRush.value;
		const initialized = rush.evaluate(RUSH_INIT_SCRIPT);
		if (initialized._tag === 'err') {
			failure = initialized.error.message;
			return;
		}
		if (initialized.value.status !== 0) {
			failure = initialized.value.stderr || 'Rush could not load the site commands.';
			return;
		}
		if (!refreshPrompt()) return;
		dims = `${initial.cols}×${initial.rows}`;
		gridCols = initial.cols;
		gridRows = initial.rows;
		cellWidth = renderer.cell.width;
		cellHeight = renderer.cell.height;

		write(bootOutput(session));

		const pending = queued.splice(0);
		for (const raw of pending) submit(raw);
	}

	onMount(() => {
		let observer: ResizeObserver | undefined;
		let idleId = 0;

		// Recorded once, before anything is drawn, so the banner reports the
		// visit before this one rather than this one.
		session = beginSession(new Date());
		boot = parseTranscript(bootOutput(session));

		measureFallback();
		void document.fonts
			.load(`${FONT.sizePx}px ${FONT.family}`)
			.then(() => {
				if (!disposed && !renderer) measureFallback();
			})
			.catch(() => undefined);

		interactive = true;
		captureEl?.focus();

		document.addEventListener('pointerdown', rememberPointerOrigin);
		document.addEventListener('click', focusInputFromClick);

		if (surfaceEl) {
			observer = new ResizeObserver(() => {
				if (renderer && terminal) fitToSurface();
				else measureFallback();
			});
			observer.observe(surfaceEl);
		}

		// Two frames: first paint is the prerendered card. Then start wasm
		// without competing for the first-paint bandwidth.
		idleId = requestAnimationFrame(() => {
			idleId = requestAnimationFrame(() => {
				idleId = 0;
				void startEngine();
			});
		});

		return () => {
			disposed = true;
			if (idleId !== 0) cancelAnimationFrame(idleId);
			document.removeEventListener('pointerdown', rememberPointerOrigin);
			document.removeEventListener('click', focusInputFromClick);
			observer?.disconnect();
			if (frame !== 0) cancelAnimationFrame(frame);
			if (trainTimer !== undefined) window.clearTimeout(trainTimer);
			terminal?.dispose();
			terminal = null;
			rush?.dispose();
			rush = null;
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

<svelte:window onkeydown={onPageKeyDown} />

<a class="skip-link" href="#terminal-transcript">Skip to terminal transcript</a>

<div class="shell">
	<header>
		<div class="tab"><span class="dot"></span>uzaaft@bobr</div>
		<div class="spacer"></div>
		<div class="meta">
			<span>rush · libghostty-vt · wasm</span>
			<span class="pipe">|</span>
			<span>{dims}</span>
		</div>
	</header>

	<div class="surface" bind:this={surfaceEl} role="presentation">
		<canvas bind:this={canvasEl} aria-hidden="true"></canvas>
		<TerminalTranscript
			{snapshot}
			fallback={boot}
			{cellWidth}
			{cellHeight}
			theme={THEME}
		/>

		<!-- Native editing keeps selection, mobile keyboards, and IME behavior. -->
		<textarea
			bind:this={captureEl}
			bind:value={line}
			onkeydown={onKeyDown}
			oninput={stripPastedNewlines}
			class="capture"
			rows="1"
			wrap="off"
			disabled={!interactive}
			style:left={`${caret.x * cellWidth}px`}
			style:top={`${caret.y * cellHeight}px`}
			style:height={`${cellHeight}px`}
			style:line-height={`${cellHeight}px`}
			spellcheck="false"
			autocomplete="off"
			autocapitalize="off"
			data-1p-ignore
			data-lpignore="true"
			data-bwignore
			data-form-type="other"
			aria-label="Terminal command"
			aria-describedby="terminal-hint"
		></textarea>

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
			<button onclick={() => runChip(chip)} disabled={!interactive}
				>{chip}</button
			>
		{/each}
		<div class="spacer"></div>
		<a class="plain-link" href={`${base}/plain`}>plain page</a>
		<span class="hint" id="terminal-hint"
			>tab completes · ↑ history · ctrl-l clears</span
		>
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
		margin: 0;
		padding: 0;
		resize: none;
		overflow: hidden;
		white-space: nowrap;
		background: transparent;
		color: #c5c8c6;
		caret-color: #f0c674;
		font:
			13.5px/1 'JetBrains Mono',
			ui-monospace,
			monospace;
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
