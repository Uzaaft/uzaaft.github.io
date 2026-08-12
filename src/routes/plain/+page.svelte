<script lang="ts">
	import { base } from '$app/paths';
	import { about, contactRows, now, posts, projects } from '$lib/shell/content';
</script>

<svelte:head>
	<title>Uzair Aftab — plain portfolio</title>
	<meta
		name="description"
		content="A plain, accessible version of Uzair Aftab's portfolio."
	/>
</svelte:head>

<a class="skip-link" href="#content">Skip to content</a>

<header>
	<a href={`${base}/`}>← interactive terminal</a>
</header>

<main id="content">
	<h1>Uzair Aftab</h1>
	<p class="lede">Software engineer in Oslo, Norway. Rust, Zig, and developer tooling.</p>

	<section aria-labelledby="about-heading">
		<h2 id="about-heading">About</h2>
		{#each about as paragraph}
			{#if paragraph}<p>{paragraph}</p>{/if}
		{/each}
	</section>

	<section aria-labelledby="now-heading">
		<h2 id="now-heading">Now</h2>
		<ul>
			{#each now as item}<li>{item.replace(/^·\s*/, '')}</li>{/each}
		</ul>
	</section>

	<section aria-labelledby="projects-heading">
		<h2 id="projects-heading">Projects</h2>
		<ul class="cards">
			{#each projects as project}
				<li>
					<h3>{project.name}</h3>
					<p><span class="language">{project.language}</span> {project.description}</p>
				</li>
			{/each}
		</ul>
	</section>

	<section aria-labelledby="writing-heading">
		<h2 id="writing-heading">Recent writing</h2>
		<ul>
			{#each posts as post}
				<li>
					<span>{post.title}</span>
					<span class="meta">{post.date} · {post.minutes}</span>
				</li>
			{/each}
		</ul>
	</section>

	<section aria-labelledby="contact-heading">
		<h2 id="contact-heading">Contact</h2>
		<address>
			<ul>
				{#each contactRows as row}
					<li><span>{row.label}</span> <a href={row.uri}>{row.value}</a></li>
				{/each}
			</ul>
		</address>
	</section>
</main>

<style>
	:global(body) {
		overflow-y: auto;
	}

	.skip-link {
		position: fixed;
		top: 8px;
		left: 8px;
		z-index: 2;
		padding: 8px 12px;
		transform: translateY(-160%);
		color: #1d1f21;
		background: #f0c674;
		border-radius: 4px;
	}

	.skip-link:focus {
		transform: translateY(0);
	}

	header,
	main {
		width: min(44rem, calc(100% - 2rem));
		margin-inline: auto;
	}

	header {
		padding-block: 1.5rem 0;
	}

	main {
		padding-block: 3rem 6rem;
		font-family: system-ui, sans-serif;
		font-size: 1.0625rem;
		line-height: 1.65;
	}

	h1,
	h2,
	h3 {
		color: #e8eaea;
		line-height: 1.2;
	}

	h1 {
		margin: 0;
		font-size: clamp(2.25rem, 8vw, 4rem);
	}

	h2 {
		margin-top: 3rem;
		font-size: 1.5rem;
	}

	h3 {
		margin: 0;
		font-size: 1.05rem;
	}

	p,
	ul {
		margin-block: 0.75rem;
	}

	.lede {
		max-width: 38rem;
		font-size: 1.2rem;
		color: #b8bcba;
	}

	a {
		color: #9fc5e0;
		text-decoration: underline;
		text-underline-offset: 0.18em;
	}

	a:focus-visible {
		outline: 3px solid #f0c674;
		outline-offset: 3px;
	}

	.cards {
		display: grid;
		gap: 1rem;
		padding: 0;
		list-style: none;
	}

	.cards li {
		padding: 1rem;
		background: #202325;
		border: 1px solid #3a3f43;
		border-radius: 6px;
	}

	.language,
	.meta,
	address span {
		color: #aeb3b8;
	}

	.meta {
		display: block;
		font-size: 0.9rem;
	}

	address {
		font-style: normal;
	}

	@media (forced-colors: active) {
		.cards li {
			border-color: CanvasText;
		}
	}
</style>
