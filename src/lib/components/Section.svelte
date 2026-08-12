<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		el = $bindable(),
		children
	}: { label: string; el?: HTMLElement; children: Snippet } = $props();
</script>

<section bind:this={el}>
	<div class="label">{label}</div>
	{@render children()}
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		gap: 18px;
		border-top: 1px solid var(--line);
		padding-top: 40px;
	}

	.label {
		font-size: 11px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--fg-dim);
	}
</style>
