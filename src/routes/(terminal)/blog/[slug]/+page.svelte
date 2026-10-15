<script lang="ts">
	import BlogReader from '$lib/blog/reader.svelte';

	let { data } = $props();
</script>

<BlogReader post={data.post} />
