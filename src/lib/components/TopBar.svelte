<script lang="ts">
	import { site, urls } from '$lib/content';

	let { crumb }: { crumb: string } = $props();
</script>

<header>
	<span class="brand">{site.name}</span>
	<span class="crumb">{crumb}</span>
	<div class="spacer"></div>
	<a href={urls.blog}>blog</a>
	<a href={urls.github}>github</a>
	<span class="hint">press <span class="key">/</span></span>
</header>

<style>
	header {
		flex-shrink: 0;
		height: 38px;
		background: var(--bg-bar);
		border-bottom: 1px solid var(--line);
		display: flex;
		align-items: center;
		padding: 0 18px;
		gap: 16px;
	}

	.brand {
		font-size: 12px;
		color: var(--yellow);
		font-weight: 700;
		letter-spacing: 0.01em;
	}

	.crumb {
		font-size: 12px;
		color: var(--fg-dim);
	}

	.spacer {
		flex: 1;
	}

	a {
		font-size: 12px;
		color: var(--fg-muted);
	}

	a:hover {
		color: var(--green);
	}

	.hint {
		font-size: 11.5px;
		color: var(--fg-faint);
	}

	.key {
		color: var(--cyan);
	}
</style>
