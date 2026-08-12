<script lang="ts">
	import { fetchCard } from '$lib/content';

	const swatches = ['--red', '--green', '--yellow', '--blue', '--magenta', '--cyan'] as const;
</script>

<div class="card">
	<pre aria-hidden="true">{fetchCard.ascii}</pre>
	<div class="info">
		<div class="host">{fetchCard.host}</div>
		<div class="divider" aria-hidden="true">────────────────────────────</div>
		{#each fetchCard.rows as row (row.label)}
			<div><span class="label">{row.label}</span>{row.value}</div>
		{/each}
		<div class="swatches" aria-hidden="true">
			{#each swatches as color (color)}
				<span style:color={`var(${color})`}>███</span>
			{/each}
		</div>
	</div>
</div>

<style>
	.card {
		display: flex;
		gap: 32px;
		align-items: flex-start;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--bg-card);
		padding: 26px 28px;
		flex-wrap: wrap;
	}

	pre {
		margin: 0;
		color: var(--magenta);
		font-size: 13px;
		line-height: 1.15;
		letter-spacing: 0.08em;
		font-family: inherit;
	}

	.info {
		display: flex;
		flex-direction: column;
		gap: 5px;
		font-size: 13px;
		min-width: 340px;
		flex: 1;
	}

	.host {
		color: var(--yellow);
		font-weight: 700;
	}

	.divider {
		color: var(--line-strong);
	}

	.label {
		color: var(--cyan);
		display: inline-block;
		width: 100px;
	}

	.swatches {
		margin-top: 8px;
		display: flex;
	}
</style>
