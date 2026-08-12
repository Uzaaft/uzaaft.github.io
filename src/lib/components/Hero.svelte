<script lang="ts">
	import { hero, urls } from '$lib/content';
</script>

<div class="hero">
	<div class="prompt" aria-hidden="true">
		<span class="dollar">$</span><span>{hero.prompt}</span><span class="cursor"></span>
	</div>
	<h1>{hero.heading}</h1>
	<!-- Inline links keep this paragraph in markup; edit the prose here. -->
	<p>
		I'm a software engineer in Oslo, Norway. I work at <span class="employer">Polymath</span>.
		Outside of work I write Rust and Zig, mostly around terminals: I maintain the Rust bindings for
		<a href={urls.crates}>libghostty-vt</a>, the terminal core extracted from Ghostty. Before that,
		and still, I help maintain <a href={urls.astrocommunity}>astrocommunity</a> for AstroNvim.
	</p>
	<div class="actions">
		<a class="primary" href={urls.blog}>{hero.blogCta}</a>
		<a class="secondary" href={urls.github}>{hero.githubCta}</a>
	</div>
</div>

<style>
	.hero {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.prompt {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 12px;
		color: var(--fg-dim);
	}

	.dollar {
		color: var(--green);
	}

	.cursor {
		width: 7px;
		height: 14px;
		background: var(--yellow);
		display: inline-block;
		animation: blink 1.15s steps(1) infinite;
	}

	@keyframes blink {
		0%,
		49% {
			opacity: 1;
		}
		50%,
		100% {
			opacity: 0;
		}
	}

	h1 {
		margin: 0;
		font-size: 40px;
		line-height: 1.25;
		font-weight: 700;
		color: var(--fg-bright);
		letter-spacing: -0.025em;
		max-width: 22ch;
		text-wrap: balance;
	}

	p {
		margin: 0;
		font-size: 15px;
		line-height: 1.8;
		color: var(--fg-muted);
		max-width: 62ch;
		text-wrap: pretty;
	}

	.employer {
		color: var(--fg);
	}

	.actions {
		display: flex;
		gap: 10px;
		margin-top: 8px;
	}

	.actions a {
		font-size: 13px;
		padding: 11px 20px;
		border-radius: 6px;
	}

	.primary {
		background: var(--green);
		color: var(--bg);
		font-weight: 700;
	}

	.primary:hover {
		background: var(--green-bright);
		color: var(--bg);
	}

	.secondary {
		border: 1px solid var(--line-bright);
		color: var(--fg);
	}

	.secondary:hover {
		border-color: var(--cyan);
		color: var(--cyan);
	}
</style>
