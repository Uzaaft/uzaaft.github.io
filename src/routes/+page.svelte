<script lang="ts">
	import ContactLinks from '$lib/components/ContactLinks.svelte';
	import FetchCard from '$lib/components/FetchCard.svelte';
	import Hero from '$lib/components/Hero.svelte';
	import PostList from '$lib/components/PostList.svelte';
	import ProjectList from '$lib/components/ProjectList.svelte';
	import Section from '$lib/components/Section.svelte';
	import Terminal from '$lib/components/Terminal.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import { crumbs, sectionLabels, site, type SectionKey } from '$lib/content';

	const SCROLL_OFFSET = 80;
	const CRUMB_THRESHOLD = 220;

	let pageEl: HTMLElement | undefined = $state();
	let sectionEls: Partial<Record<SectionKey, HTMLElement>> = $state({});
	let crumb = $state('~/');

	function updateCrumb() {
		let current = '~/';
		for (const { key, label } of crumbs) {
			const el = sectionEls[key];
			if (el && el.getBoundingClientRect().top < CRUMB_THRESHOLD) current = label;
		}
		crumb = current;
	}

	function navigate(section: SectionKey) {
		const el = sectionEls[section];
		if (!el || !pageEl) return;
		pageEl.scrollTo({ top: el.offsetTop - SCROLL_OFFSET, behavior: 'smooth' });
	}
</script>

<svelte:head>
	<title>{site.title}</title>
	<meta name="description" content={site.description} />
</svelte:head>

<div class="shell">
	<TopBar {crumb} />

	<main bind:this={pageEl} onscroll={updateCrumb}>
		<div class="content">
			<div bind:this={sectionEls.home}>
				<Hero />
			</div>

			<FetchCard />

			<div bind:this={sectionEls.about}></div>

			<Section label={sectionLabels.projects} bind:el={sectionEls.work}>
				<ProjectList />
			</Section>

			<Section label={sectionLabels.blog} bind:el={sectionEls.blog}>
				<PostList />
			</Section>

			<Section label={sectionLabels.contact} bind:el={sectionEls.contact}>
				<ContactLinks />
			</Section>
		</div>
	</main>

	<Terminal onNavigate={navigate} />
</div>

<style>
	.shell {
		height: 100vh;
		height: 100dvh;
		display: flex;
		flex-direction: column;
		background: var(--bg);
		overflow: hidden;
	}

	main {
		position: relative;
		flex: 1;
		overflow-y: auto;
		scroll-behavior: smooth;
	}

	.content {
		max-width: 820px;
		margin: 0 auto;
		padding: 88px 32px 120px;
		display: flex;
		flex-direction: column;
		gap: 64px;
	}
</style>
