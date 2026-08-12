<script lang="ts">
	import { contact } from '$lib/content';
</script>

<div class="links">
	{#each contact.channels as channel (channel.label)}
		<a href={channel.href}>{channel.label}</a>
	{/each}
</div>
<div class="note">
	{contact.note}<br />
	{contact.copyright} · type <span class="cmd">help</span> below
</div>

<style>
	.links {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.links a {
		border: 1px solid var(--line-strong);
		border-radius: 6px;
		padding: 9px 15px;
		font-size: 13px;
		color: var(--fg);
	}

	.links a:hover {
		border-color: var(--green);
		color: var(--green);
	}

	.note {
		font-size: 12px;
		color: var(--fg-faint);
		margin-top: 12px;
		line-height: 1.7;
	}

	.cmd {
		color: var(--fg-dim);
	}
</style>
