<script lang="ts">
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { BEAVER, posts } from '$lib/shell/content';

	let { post = null }: { post?: (typeof posts)[number] | null } = $props();
	let menuOpen = $state(false);
	let selected = $state(0);
	let content: HTMLElement;
	let postLinks: HTMLAnchorElement[] = [];

	function onKeyDown(event: KeyboardEvent): void {
		if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey)
			return;
		if (
			event.target instanceof Element &&
			event.target.closest('input, textarea, select, [contenteditable="true"]')
		)
			return;
		if (event.key === 'q') {
			event.preventDefault();
			void goto(`${base}/`);
		} else if (event.key === 'Escape' && menuOpen) {
			menuOpen = false;
		} else if (event.key === 'j' || event.key === 'k') {
			event.preventDefault();
			if (post) {
				content.scrollBy({
					top: event.key === 'j' ? 64 : -64,
					behavior: 'instant'
				});
			} else {
				selected = Math.max(
					0,
					Math.min(posts.length - 1, selected + (event.key === 'j' ? 1 : -1))
				);
				postLinks[selected]?.focus();
			}
		} else if (
			event.key === 'Enter' &&
			!post &&
			!(event.target instanceof Element && event.target.closest('a, button'))
		) {
			event.preventDefault();
			void goto(`${base}/blog/${posts[selected].slug}`);
		}
	}
</script>

<svelte:head>
	<title>{post ? `${post.title} — Uzair Aftab` : 'Blog — Uzair Aftab'}</title>
	<meta
		name="description"
		content={post?.description ??
			'Notes from Uzair Aftab on software and developer tooling.'}
	/>
</svelte:head>

<svelte:window onkeydown={onKeyDown} />

<div class="reader">
	<div class="editor-bar">
		<a
			class="dashboard-link"
			href={`${base}/blog`}
			aria-current={!post ? 'page' : undefined}>~/blog</a
		>
		<span class="buffer-name">{post ? `${post.slug}.md` : 'dashboard'}</span>
		<a class="back-link" href={`${base}/`}>← Back to shell</a>
	</div>

	<div class="workspace">
		{#if post}
			<button
				class="posts-toggle"
				aria-expanded={menuOpen}
				aria-controls="post-list"
				onclick={() => (menuOpen = !menuOpen)}
			>
				Posts <span aria-hidden="true">{menuOpen ? '−' : '+'}</span>
			</button>
			<nav
				id="post-list"
				class:expanded={menuOpen}
				class="file-tree"
				aria-label="Blog posts"
			>
				<a class="directory" href={`${base}/blog`}>← All posts</a>
				{#each posts as item}
					<a
						href={`${base}/blog/${item.slug}`}
						aria-current={item.slug === post.slug ? 'page' : undefined}
					>
						<span class="file-mark" aria-hidden="true">≡</span><span
							>{item.slug}.md</span
						>
					</a>
				{/each}
			</nav>
		{/if}

		<main
			id="blog-content"
			tabindex="-1"
			bind:this={content}
			class:article-view={post !== null}
		>
			{#if post}
				<article>
					<div class="source-row title-row">
						<span class="line-number" aria-hidden="true">1</span>
						<h1>{post.title}</h1>
					</div>
					<div class="source-row metadata-row">
						<span class="line-number" aria-hidden="true">2</span>
						<p class="post-meta">
							<time datetime={post.date}>{post.date}</time><span
								>{post.tags.join(', ')}</span
							>
						</p>
					</div>
					{#each post.body as paragraph, i}
						{@const image = /^!\[([^\]]*)\]\((\/[^)]+)\)$/.exec(paragraph)}
						<div class="source-row">
							<span class="line-number" aria-hidden="true">{i + 3}</span>
							{#if image}
								<img
									class="post-image"
									src={`${base}${image[2]}`}
									alt={image[1]}
								/>
							{:else}
								<p>{paragraph}</p>
							{/if}
						</div>
					{/each}
				</article>
			{:else}
				<div class="dashboard">
					<div class="intro">
						<pre class="beaver" aria-hidden="true">{BEAVER.join('\n')}</pre>
						<div>
							<h1>~/blog</h1>
							<p>Notes on software and the tools I use.</p>
						</div>
					</div>
					<h2>Recent files</h2>
					<ul class="post-list">
						{#each posts as item, i}
							<li>
								<a
									bind:this={postLinks[i]}
									href={`${base}/blog/${item.slug}`}
									class:selected={selected === i}
									onfocus={() => (selected = i)}
								>
									<span class="file-mark" aria-hidden="true">≡</span>
									<span class="post-summary"
										><strong>{item.title}</strong><span
											>{item.tags.join(', ')}</span
										></span
									>
									<time datetime={item.date}>{item.date}</time>
								</a>
							</li>
						{/each}
					</ul>
					<p class="dashboard-hint">
						<kbd>j</kbd>/<kbd>k</kbd> move <span><kbd>Enter</kbd> read</span>
						<span><kbd>q</kbd> back to shell</span>
					</p>
				</div>
			{/if}
		</main>
	</div>

	<div class="status-bar">
		<span class="status-mode">{post ? 'Reading' : 'Browse'}</span>
		<span class="status-path">{post ? `~/blog/${post.slug}.md` : '~/blog'}</span
		>
		<span class="status-detail"
			>{post
				? 'markdown'
				: `${posts.length} ${posts.length === 1 ? 'post' : 'posts'}`}</span
		>
		<span class="key-hint"
			>{post ? 'j/k scroll · q shell' : 'Enter read · q shell'}</span
		>
	</div>
</div>

<style>
	.reader {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
	.editor-bar {
		display: flex;
		align-items: center;
		gap: 16px;
		min-height: 38px;
		padding-right: 16px;
		border-bottom: 1px solid var(--line-soft);
		background: var(--bg-bar);
		font-size: 12px;
	}
	.dashboard-link {
		align-self: stretch;
		display: flex;
		align-items: center;
		padding: 0 16px;
		background: var(--green);
		color: var(--bg);
		font-weight: 700;
	}
	.buffer-name {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--fg-muted);
	}
	.back-link {
		margin-left: auto;
		white-space: nowrap;
	}
	.workspace {
		flex: 1;
		min-height: 0;
		display: flex;
	}
	main {
		flex: 1;
		min-width: 0;
		overflow-y: auto;
		padding: 48px 28px;
		outline: none;
	}
	main:focus-visible {
		outline: 1px solid var(--blue);
		outline-offset: -4px;
	}
	.dashboard {
		max-width: 680px;
		margin: 0 auto;
	}
	.intro {
		display: flex;
		align-items: center;
		gap: 36px;
		margin-bottom: 44px;
	}
	.beaver {
		flex-shrink: 0;
		margin: 0;
		color: var(--magenta);
		font:
			11px/1.25 'JetBrains Mono',
			monospace;
	}
	h1 {
		margin: 0;
		color: var(--fg-bright);
		font-size: 24px;
		line-height: 1.4;
	}
	.intro p {
		max-width: 30ch;
		color: var(--fg-muted);
		font-size: 13px;
		line-height: 1.8;
	}
	h2 {
		margin: 0 0 12px 14px;
		font-size: 12px;
		font-weight: 400;
		color: var(--fg-muted);
	}
	.post-list {
		padding: 0;
		margin: 0;
		list-style: none;
	}
	.post-list a {
		display: flex;
		align-items: baseline;
		gap: 16px;
		padding: 16px 14px;
		border-radius: 6px;
	}
	.post-list a.selected,
	.post-list a:hover {
		background: var(--bg-hover);
	}
	.file-mark {
		color: var(--green);
	}
	.post-summary {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.post-summary strong {
		color: var(--fg-bright);
		font-size: 14px;
		font-weight: 400;
	}
	.post-summary > span,
	time {
		color: var(--fg-muted);
		font-size: 12px;
	}
	.dashboard-hint {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 28px;
		padding: 18px 14px 0;
		border-top: 1px solid var(--line-soft);
		color: var(--fg-muted);
		font-size: 11px;
	}
	.dashboard-hint > span {
		margin-left: 14px;
	}
	kbd {
		color: var(--green);
		font: inherit;
	}
	.file-tree {
		width: 225px;
		flex-shrink: 0;
		padding: 18px 0;
		border-right: 1px solid var(--line-soft);
		background: #1a1c1e;
	}
	.file-tree a {
		display: flex;
		gap: 10px;
		padding: 9px 16px;
		font-size: 12px;
		color: var(--fg);
		overflow-wrap: anywhere;
	}
	.file-tree .directory {
		color: var(--fg-muted);
		margin-bottom: 12px;
	}
	.file-tree a[aria-current='page'] {
		color: var(--green);
		background: var(--bg-hover);
	}
	.posts-toggle {
		display: none;
	}
	.article-view {
		padding: 36px 24px 64px 0;
	}
	article {
		max-width: 82ch;
		margin: 0 auto;
	}
	.source-row {
		display: grid;
		grid-template-columns: 56px minmax(0, 1fr);
		column-gap: 12px;
	}
	.line-number {
		color: var(--fg-dim);
		font-size: 12px;
		line-height: 2;
		text-align: right;
		padding-right: 10px;
		user-select: none;
	}
	.title-row {
		border-left: 3px solid var(--green);
		background: #242820;
		padding: 8px 0;
	}
	.title-row .line-number {
		color: var(--green);
	}
	.title-row h1 {
		font-size: 22px;
		overflow-wrap: anywhere;
	}
	.metadata-row {
		margin-bottom: 32px;
	}
	.post-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		color: var(--fg-muted);
		font-size: 12px;
	}
	.source-row > p {
		margin: 0 0 24px;
		font-size: 14px;
		line-height: 1.9;
		overflow-wrap: anywhere;
	}
	.post-image {
		display: block;
		max-width: 100%;
		height: auto;
	}
	.metadata-row p {
		margin-top: 12px;
		font-size: 12px;
	}
	.metadata-row .line-number {
		padding-top: 10px;
	}
	.status-bar {
		display: flex;
		align-items: center;
		gap: 16px;
		min-height: 30px;
		background: var(--bg-hover);
		color: var(--fg-muted);
		font-size: 11px;
	}
	.status-mode {
		align-self: stretch;
		display: flex;
		align-items: center;
		padding: 0 14px;
		background: var(--green);
		color: var(--bg);
		font-weight: 700;
	}
	.status-path {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.status-detail {
		margin-left: auto;
	}
	.key-hint {
		padding-right: 14px;
		white-space: nowrap;
	}
	a:focus-visible,
	button:focus-visible {
		outline: 2px solid var(--yellow);
		outline-offset: -2px;
	}
	@media (max-width: 640px) {
		.editor-bar {
			gap: 10px;
			padding-right: 12px;
		}
		.dashboard-link {
			padding: 0 12px;
		}
		.buffer-name {
			display: none;
		}
		.workspace {
			flex-direction: column;
		}
		main {
			padding: 28px 16px;
		}
		.intro {
			gap: 20px;
			flex-wrap: wrap;
			margin-bottom: 32px;
		}
		.beaver {
			font-size: 9px;
		}
		.intro p {
			max-width: none;
			margin-bottom: 0;
		}
		.post-list a {
			flex-wrap: wrap;
			gap: 10px;
		}
		.post-list time {
			width: 100%;
			margin-left: 22px;
		}
		.posts-toggle {
			display: flex;
			justify-content: space-between;
			padding: 12px 16px;
			border: 0;
			border-bottom: 1px solid var(--line-soft);
			background: var(--bg-bar);
			color: var(--fg);
			font: inherit;
			font-size: 12px;
			cursor: pointer;
		}
		.file-tree {
			display: none;
			width: auto;
			padding: 8px 0;
			border-right: 0;
			border-bottom: 1px solid var(--line);
		}
		.file-tree.expanded {
			display: block;
		}
		.article-view {
			padding: 24px 16px 40px 0;
		}
		.source-row {
			grid-template-columns: 30px minmax(0, 1fr);
			column-gap: 8px;
		}
		.line-number {
			padding-right: 4px;
		}
		.title-row h1 {
			font-size: 20px;
		}
		.status-bar {
			gap: 10px;
		}
		.status-detail {
			padding-right: 12px;
		}
		.key-hint {
			display: none;
		}
	}
</style>
