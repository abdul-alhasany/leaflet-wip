import {createContentLoader} from 'vitepress';
import {existsSync} from 'fs';
import path from 'node:path';

interface Tutorial {
	title: string
	url: string
	excerpt: string | undefined
	thumbnail: string
}

declare const data: Tutorial[];
export {data};

/**
 * check that a thumbnail exists for the post in public folder,
 * the name of the thumbnail should be the same as the post but with .png extension
 * @param {string} url  the url of the post, used to derive the thumbnail url
 * @returns {string}  the url of the thumbnail if it exists, otherwise an empty string
 */
const getPostThumbnail = (url: string): string => {
	const fileName = path.basename(url, '.html');
	const thumbnailUrl = path.join(__dirname, '../../public/images/tutorials', `${fileName}.png`);

	const thumbnailExists = existsSync(thumbnailUrl);
	if (!thumbnailExists) {
		console.warn(`Thumbnail not found for ${url} at ${thumbnailUrl}`);
		return '';
	}
	return `/images/tutorials/${fileName}.png`;

};


export default createContentLoader('guide/tutorials/*.md', {
	excerpt: false,
	transform(raw): Tutorial[] {
		return raw
			.filter(data => data.url.endsWith('.html'))
			.map((data) => {
				const {url, frontmatter} = data;

				return {
					title: frontmatter.title,
					url,
					excerpt: frontmatter.description || '',
					thumbnail: getPostThumbnail(url),
					order: frontmatter.order || 0
				};
			}).sort((a, b) => a.order - b.order);
	}
});
