import { error } from '@sveltejs/kit';
import { posts } from '$lib/shell/content';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => posts.map(({ slug }) => ({ slug }));

export const load: PageLoad = ({ params }) => {
	const post = posts.find((post) => post.slug === params.slug);
	if (!post) error(404, 'Post not found');
	return { post };
};
