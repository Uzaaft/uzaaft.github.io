<script lang="ts">
	import { onMount } from 'svelte';
	import { drawRiver, type Ripple } from './draw';
	import { createSwimmer, stepSwimmer, type Swimmer } from './motion';

	let canvas: HTMLCanvasElement;
	let ready = $state(false);
	let playing = $state(false);
	let reducedMotion = $state(false);
	let toggleSwim = () => {};
	let makeRipple = () => {};

	onMount(() => {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		const preference = matchMedia('(prefers-reduced-motion: reduce)');
		reducedMotion = preference.matches;
		playing = !reducedMotion;
		let width = 0;
		let height = 0;
		let swimmer: Swimmer;
		let ripple: Ripple | null = null;
		let frame = 0;
		let last = 0;
		let visible = true;
		const draw = () => drawRiver(ctx, width, height, swimmer, ripple);

		function stop() {
			cancelAnimationFrame(frame);
			frame = 0;
			last = 0;
		}

		function schedule() {
			if (!frame && !document.hidden && visible && !reducedMotion && (playing || ripple)) {
				frame = requestAnimationFrame(tick);
			}
		}

		function tick(now: number) {
			frame = 0;
			const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
			last = now;
			if (playing) stepSwimmer(swimmer, dt, width, height);
			if (ripple) {
				ripple.age += dt / 1.6;
				if (ripple.age >= 1) ripple = null;
			}
			draw();
			schedule();
			if (!frame) last = 0;
		}

		toggleSwim = () => {
			if (reducedMotion) return;
			playing = !playing;
			if (!playing) {
				ripple = null;
				stop();
			}
			schedule();
		};

		function splash(x: number, y: number) {
			if (reducedMotion) return;
			ripple = { x, y, age: 0 };
			schedule();
		}
		makeRipple = () => splash(width / 2, height - 80);
		const onPointerDown = (event: PointerEvent) => {
			if (event.button !== 0) return;
			const rect = canvas.getBoundingClientRect();
			splash(event.clientX - rect.left, event.clientY - rect.top);
		};
		canvas.addEventListener('pointerdown', onPointerDown);

		function resize() {
			const rect = canvas.getBoundingClientRect();
			width = rect.width;
			height = rect.height;
			swimmer ??= createSwimmer(width, height);
			stepSwimmer(swimmer, 0, width, height);
			const dpr = Math.min(devicePixelRatio || 1, 2);
			canvas.width = Math.round(width * dpr);
			canvas.height = Math.round(height * dpr);
			ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
			draw();
		}
		const resizeObserver = new ResizeObserver(resize);
		resizeObserver.observe(canvas);
		const intersection = new IntersectionObserver(([entry]) => {
			visible = entry.isIntersecting;
			if (visible) schedule();
			else stop();
		});
		intersection.observe(canvas);
		const onVisibility = () => {
			if (document.hidden) stop();
			else schedule();
		};
		const onPreference = () => {
			reducedMotion = preference.matches;
			if (reducedMotion) {
				playing = false;
				ripple = null;
				stop();
			}
			draw();
		};
		preference.addEventListener('change', onPreference);
		document.addEventListener('visibilitychange', onVisibility);
		window.addEventListener('resize', resize);
		resize();
		schedule();
		ready = true;

		return () => {
			stop();
			resizeObserver.disconnect();
			intersection.disconnect();
			canvas.removeEventListener('pointerdown', onPointerDown);
			preference.removeEventListener('change', onPreference);
			document.removeEventListener('visibilitychange', onVisibility);
			window.removeEventListener('resize', resize);
		};
	});
</script>

<canvas class="river" bind:this={canvas} aria-hidden="true"></canvas>
{#if ready}
	<div class="river-controls" aria-label="River controls">
		<span>a quiet stretch of river</span>
		{#if !reducedMotion}
			<button onclick={() => toggleSwim()}>{playing ? 'Pause river' : 'Resume river'}</button>
			<button onclick={() => makeRipple()}>Make ripples</button>
		{/if}
	</div>
{/if}

<style>
	.river {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.river-controls {
		position: absolute;
		inset: auto 8px 12px;
		display: flex;
		justify-content: center;
		align-items: center;
		flex-wrap: wrap;
		gap: 4px 12px;
		color: var(--fg-muted);
		font-size: 11px;
	}

	button {
		font: inherit;
		color: var(--fg);
		background: var(--bg);
		border: 1px solid var(--line);
		border-radius: 5px;
		padding: 6px 10px;
		cursor: pointer;
	}

	button:focus-visible {
		outline: 2px solid var(--yellow);
		outline-offset: 3px;
	}

	@media (hover: hover) {
		button:hover {
			color: var(--green);
			border-color: var(--green);
		}
	}

	@media (max-width: 40rem) {
		.river-controls {
			gap: 4px 8px;
		}

		.river-controls span {
			display: none;
		}

		button {
			min-height: 44px;
		}
	}
</style>
