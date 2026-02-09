import {defineConfig} from 'vitepress';
import tailwindcss from '@tailwindcss/vite';
import {fileURLToPath} from 'node:url';
import pluginsSidebar from './generated-sidebars/plugins-sidebar.js';
import apiSidebar from './generated-sidebars/api-sidebar.js';

// https://vitepress.dev/reference/site-config
export default defineConfig({
	title: 'Leaflet Hub',
	description: 'Leaflet blog, api reference and documentation',
	base: '/Leaflet/',
	head: [
		[
			'link',
			{rel: 'stylesheet', href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'}
		],
		[
			'link',
			{rel: 'preconnect', href: 'https://unpkg.com'}
		],
		[
			'script',
			{src: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', integrity: 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=', crossorigin: 'anonymous'}
		],
		[
			'script',
			{},
			`
    	ACCESS_TOKEN = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
		MB_ATTR = 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
			'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';
		MB_URL = 'https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=' + ACCESS_TOKEN;
		OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
		OSM_ATTRIB = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
      `
		]
	],
	themeConfig: {
		// https://vitepress.dev/reference/default-theme-config
		logo: './logo.png',
		search: {
			provider: 'local'
		},
		nav: [
			{text: 'Blog', link: '/blog'},
			{text: 'Guide', link: '/guide/tutorials'},
			{text: 'Plugins', link: '/plugins'},
			{text: 'API Reference', link: '/develop/api/v2.0.0-alpha.1'},
		],
		sidebar: {
			'/blog': [],
			'/plugins': pluginsSidebar,
			'/develop': [
				{
					text: 'Contributing to Leaflet',
					link: '/develop/contributing'
				},
				{
					text: 'Plugin Authoring Guide',
					link: '/develop/plugins'
				},
				{
					text: 'API Reference',
					items: apiSidebar
				}
			],
			'/':[
				{
					text: 'Tutorials',
					link: '/guide/tutorials',
					items: [
						{text: 'Quick Start', link: '/guide/tutorials/quick-start'},
						{text: 'Accessibility', link: '/guide/tutorials/accessible-maps'},
						{text: 'Custom Icons', link: '/guide/tutorials/custom-icons'},
						{text: 'Leaflet on Mobile', link: '/guide/tutorials/mobile'},
						{text: 'Using GeoJSON with Leaflet', link: '/guide/tutorials/geojson'},
						{text: 'Creating a Choropleth Map', link: '/guide/tutorials/choropleth'},
						{text: 'Layer Control', link: '/guide/tutorials/layer-control'},
						{text: 'Zoom Levels', link: '/guide/tutorials/zoom-levels'},
					]
				},
				{text: 'Blog', link: '/blog/'},
				{text: 'API Reference', link: '/api/v2.0.0-alpha.1'},
				{text: 'Documentation', link: '/docs'},
			],
		},
		socialLinks: [
			{icon: 'github', link: 'https://github.com/Leaflet/Leaflet'},
			{icon: 'twitter', link: 'https://x.com/LeafletJS'},
		],
	},
	vite: {
		resolve: {
			alias: {
				'@': fileURLToPath(new URL('../', import.meta.url)),
			},
		},
		plugins: [tailwindcss()],
	},
	// @todo remove later to enforce proper links
	ignoreDeadLinks: true,
});
