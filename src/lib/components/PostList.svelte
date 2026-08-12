<script lang="ts">
	import { posts, urls } from '$lib/content';
</script>

<div class="list">
	{#each posts as post (post.date)}
		<a href={urls.blog}>
			<span class="date">{post.date}</span>
			<span class="title">{post.title}</span>
			<span class="minutes">{post.minutes} min</span>
		</a>
	{/each}
</div>
<a class="all" href={urls.blog}>all posts →</a>

<style>
	.list {
		display: flex;
		flex-direction: column;
	}

	.list a {
		display: flex;
		gap: 22px;
		align-items: baseline;
		padding: 13px 12px;
		border-radius: 8px;
		color: var(--fg);
	}

	.list a:hover {
		background: var(--bg-hover);
		color: var(--fg);
	}

	.date {
		color: var(--fg-dim);
		font-size: 12.5px;
		width: 92px;
		flex-shrink: 0;
	}

	.title {
		flex: 1;
		font-size: 14.5px;
	}

	.minutes {
		color: var(--fg-faint);
		font-size: 12px;
	}

	.all {
		font-size: 12.5px;
		color: var(--fg-dim);
		padding-left: 12px;
	}

	.all:hover {
		color: var(--green);
	}
</style>
