<script lang="ts">
	import { projects } from '$lib/content';
</script>

<div class="list">
	{#each projects as project (project.name)}
		<a href={project.href}>
			<span class="name">{project.name}</span>
			<span class="description">{project.description}</span>
			<span class="note">{project.note}</span>
		</a>
	{/each}
</div>

<style>
	.list {
		display: flex;
		flex-direction: column;
	}

	a {
		display: grid;
		grid-template-columns: 190px 1fr 74px;
		gap: 20px;
		align-items: baseline;
		padding: 16px 12px;
		border-radius: 8px;
		color: var(--fg);
		border-bottom: 1px solid var(--line-soft);
	}

	a:hover {
		background: var(--bg-hover);
		color: var(--fg);
	}

	.name {
		color: var(--cyan);
		font-weight: 500;
	}

	.description {
		color: var(--fg-muted);
		font-size: 13px;
	}

	.note {
		color: var(--fg-dim);
		font-size: 12px;
		text-align: right;
	}
</style>
