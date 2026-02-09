/* eslint-disable no-await-in-loop */
import {simpleGit, CleanOptions} from 'simple-git';
import type {SimpleGit} from 'simple-git';
import LeafDoc from 'leafdoc';
import {writeFile, mkdir, emptyDir} from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import currentPackageJson from '../package.json';

const TAGS_LIMIT = 5;

const info = function (message: string) {
	console.log(chalk.blue(message));
};

const error = function (...message: string[]) {
	console.error(chalk.red(...message));
};

const warn = function (message: string) {
	console.warn(chalk.yellow(message));
};

const success = function (message: string) {
	console.log(chalk.green(message));
};

type DocId = string;

interface RootDoc {
	[key: string]: ClassDoc;
}

type SuperSectionKeys = 'option' | 'example' | 'constructor' | 'event' | 'method' | 'function' | 'property' | 'pane';
interface ClassDoc {
	name: string;
	aka: string[];
	comments: string[];
	supersections: Record<SuperSectionKeys, SuperSection>;
	inherits: string[];
	relationships: unknown[];
	id: DocId;
}

interface SuperSection {
	name: string;
	aka: string[];
	comments: string[];
	sections: Record<string, Section>;
	id: DocId;
}

interface Section {
	name: string;
	aka: string[];
	comments: string[];
	uninheritable: boolean;
	documentables: Record<string, Documentable>;
	type: string;
	id: DocId;
}

interface Documentable {
	name: string;
	aka: string[];
	comments: string[];
	params: Record<string, Param>;
	type: string | null;
	optional: boolean;
	defaultValue: string | number | boolean | null;
	id?: DocId;
}

interface Param {
	name: string;
	type?: string;
}

type TableRow = (string | boolean | number)[];

type SidebarItem = {
	text: string;
	link: string;
	items?: SidebarItem[];
	collapsed?: boolean;
};

info('Building Leaflet documentation with Leafdoc ...');


// const out = doc.outputStr();
const outputPath = './output.json';
const apiDataPath = path.join(__dirname, '../hub/develop/api');
const tagsCachePath = path.join(__dirname, '../leaflet-repo-cache');
const vitepressDirectoryPath = path.join(__dirname, '../hub/.vitepress');

// taken from https://github.com/valeriangalliat/markdown-it-anchor/blob/master/index.js#L3
const slugify = (string: string) => encodeURIComponent(String(string).trim().toLowerCase().replace(/\s+/g, '-'));

class ApiDocumentation {
	apiJson: RootDoc;
	className: string;
	classData : ClassDoc;
	inherits: ApiDocumentation[];
	markdownContent: string = '';
	methods: Section[] = [];
	functions: Section[] = [];
	events: Section[] = [];
	properties: Section[] = [];
	options: Section[] = [];
	panes: Section[] = [];

	inheritedMethods: {
		classData: ClassDoc;
		methods: Section[];
	}[] = [];

	inheritedOptions: {
		classData: ClassDoc,
		options: Section[];
	}[] = [];

	inheritedEvents: {
		classData: ClassDoc;
		events: Section[];
	}[] = [];

	inheritedProperties: {
		classData: ClassDoc;
		properties: Section[];
	}[] = [];

	constructor(classData: ClassDoc, json: RootDoc) {
		this.className = classData.name;
		this.classData = classData;
		this.apiJson = json;
		this.inherits = this.getAllInheritances();

		const {comments} = classData;
		this.markdownContent += `## ${this.classData.name}\n`;
		if (comments.length) {
			this.markdownContent += `${comments.join('\n')}\n`;
		}

		this.getClassProperties();
		this.getInheritedClassProperties();
	}

	getAllInheritances(): ApiDocumentation[] {
		let inheritances: ApiDocumentation[] = [];
		for (const inheritName of this.classData.inherits) {
			const parentDoc = new ApiDocumentation(this.apiJson[inheritName], this.apiJson);
			inheritances.push(parentDoc);
			inheritances = inheritances.concat(parentDoc.getAllInheritances());
		}
		return inheritances;
	}

	getInheritedClassProperties() {
		for (const parent of this.inherits) {
			if (parent.methods.length > 0) {
				this.inheritedMethods.push({
					classData: parent.classData,
					methods: parent.methods
				});
			}

			if (parent.options.length > 0) {
				this.inheritedOptions.push({
					classData: parent.classData,
					options: parent.options
				});
			}

			if (parent.events.length > 0) {
				this.inheritedEvents.push({
					classData: parent.classData,
					events: parent.events
				});
			}

			if (parent.properties.length > 0) {
				this.inheritedProperties.push({
					classData: parent.classData,
					properties: parent.properties
				});
			}
		}
	}

	getClassProperties() {
		const {method, function: functionSection, event, property, option, pane} = this.classData.supersections;
		if (method) {
			this.methods = Object.values(method.sections).toSorted((a, b) => a.name.localeCompare(b.name));
		}

		if (functionSection) {
			this.functions = Object.values(functionSection.sections).toSorted((a, b) => a.name.localeCompare(b.name));
		}

		if (event) {
			this.events = Object.values(event.sections).toSorted((a, b) => a.name.localeCompare(b.name));
		}

		if (property) {
			this.properties = Object.values(property.sections).toSorted((a, b) => a.name.localeCompare(b.name));
		}

		if (option) {
			this.options = Object.values(option.sections).toSorted((a, b) => a.name.localeCompare(b.name));
		}

		if (pane) {
			this.panes = Object.values(pane.sections).toSorted((a, b) => a.name.localeCompare(b.name));
		}
	}

	createTable(headers: string[], rows: TableRow[]) {
		let table = `| ${headers.join(' | ')} |\n`;
		table += `| ${headers.map(() => '---').join(' | ')} |\n`;
		for (const row of rows) {
			table += `| ${row.join(' | ')} |\n`;
		}
		return table;
	}

	generateParamsString(params: Record<string, Param>) {
		const content = Object.values(params).map((param) => {
			const {name: paramName, type: paramType} = param;
			const safeParamType = paramType ? paramType.replace(/\|/g, '\\|') : '';
			return `<div class="param-definition">${paramName}: ${safeParamType}</div>`;
		}).join('');

		if (content.trim() === '') {
			return content;
		}
		return `${content}`;
	}

	generateConstructor(constructorSection?: SuperSection) {
		if (!constructorSection || !constructorSection.sections) {
			return '';
		}
		let constructorContent = '### Constructor ';
		constructorContent += `{#${slugify(`${this.className}-constructor-list`)}}\n\n`;
		for (const constructor of Object.values(constructorSection.sections)) {
			const constructorData = constructor.documentables;
			if (!constructorData) {
				continue;
			}

			const overloads = Object.values(constructorData);

			const headers = ['Signature', 'Description'];
			const rows: TableRow[] = [];

			for (const overload of overloads) {
				const {name, comments, params} = overload;

				const paramsString = this.generateParamsString(params);
				const constructor = `L.${name}(${paramsString})`;

				rows.push([constructor, comments.join(' ')]);
			}
			constructorContent += this.createTable(headers, rows);
		}

		return constructorContent;
	};

	generateExample(exampleSection?: SuperSection) {
		if (!exampleSection) {
			return '';
		}

		let exampleContent = '### Examples ';
		exampleContent += `{#${slugify(`${this.className}-examples-list`)}}\n\n`;
		for (const example of Object.values(exampleSection.sections)) {
			const exampleData = example.documentables['__default'];
			if (!exampleData) {
				continue;
			}

			if (exampleData.comments.length) {
				exampleContent += `${exampleData.comments.join('\n')}\n`;
			}
		}
		return exampleContent;
	};

	generateEventDocumentable(eventDoc: Documentable[]) {
		const headers = ['Event', 'Data', 'Description'];
		const rows: TableRow[] = [];
		for (const entry of Object.values(eventDoc)) {
			const {name, comments, type} = entry;
			rows.push([name, type || '', comments.join(' ')]);
		}

		return this.createTable(headers, rows);
	}

	getEventsContent(events: Section[], parentClassName?: string) {
		let content = '';

		for (const entry of events) {
			const {name, documentables, comments} = entry;
			let title = name !== '__default' ? `### ${name}` : '';

			// if has a parent class, wrap in collapsible data.
			if (parentClassName) {
				title = name === '__default' ? `Events inherited from ${parentClassName}` : `${name} inherited from ${parentClassName}`;
				content += `<CollapsibleData title="${title}">\n\n`;
			} else {
				content += `${title}\n`;
			}

			if (comments.length) {
				content += `${comments.join('\n')}\n`;
			}

			content += this.generateEventDocumentable(Object.values(documentables));

			if (parentClassName) {
				content += '</CollapsibleData>\n\n';
			}
		}

		return content;
	}

	generateEventsSection() {
		if (this.events.length === 0 && this.inheritedEvents.length === 0) {
			return '';
		}

		let content = '### Events ';
		content += `{#${this.classData.id}-events-list}\n\n`;

		for (const event of Object.values(this.events)) {
			content += this.generateEventDocumentable(Object.values(event.documentables));
		}

		for (const inheritedEvent of this.inheritedEvents) {
			const parentClassName = inheritedEvent.classData.name;
			content += this.getEventsContent(inheritedEvent.events, parentClassName);
		}

		return content;
	};

	generateOptionsDocumentable(optionDoc: Documentable[]) {
		const headers = ['Option', 'Description'];
		const rows: TableRow[] = [];

		for (const entry of Object.values(optionDoc)) {
			const {name, type, defaultValue, comments} = entry;

			const typeContent = type ? type.replace(/\|/g, '\\|') : '';
			const defaultValueContent = `<span class='default-value'>default: ${defaultValue ?? 'none'}</span>`;
			rows.push([`<div class="option-definition">${name} (${typeContent})</div>${defaultValueContent}`, comments.join(' ')]);
		}

		return this.createTable(headers, rows);
	}

	generateOptionsContent(options: Section[], parentClassName?: string) {
		let content = '';

		for (const entry of options) {
			const {name, documentables, comments} = entry;
			let title = name !== '__default' ? `### ${name}` : '';

			// if has a parent class, wrap in collapsible data.
			if (parentClassName) {
				title = name === '__default' ? `Options inherited from ${parentClassName}` : `${name} inherited from ${parentClassName}`;
				content += `<CollapsibleData title="${title}">\n\n`;
			} else {
				content += `${title}\n`;
			}

			if (comments.length) {
				content += `${comments.join('\n')}\n`;
			}

			content += this.generateOptionsDocumentable(Object.values(documentables));

			if (parentClassName) {
				content += '</CollapsibleData>\n\n';
			}
		}

		return content;
	}

	generateOptionsSection() {
		if (this.options.length === 0 && this.inheritedOptions.length === 0) {
			return '';
		}

		let content = '### Options ';
		content += `{#${this.classData.id}-options-list}\n\n`;

		for (const option of Object.values(this.options)) {
			content += this.generateOptionsContent([option]);
		}

		for (const inheritedOption of this.inheritedOptions) {
			const parentClassName = inheritedOption.classData.name;
			content += this.generateOptionsContent(inheritedOption.options, parentClassName);
		}

		return content;
	};

	generateMethodDocumentable(methodDoc: Documentable[]) {
		const headers = ['Signature', 'Description'];
		const rows: TableRow[] = [];
		for (const entry of Object.values(methodDoc)) {
			const {name, comments, type, params} = entry;

			const paramsString = this.generateParamsString(params);
			const methodSignature = `.${name}(${paramsString}): ${type || 'void'}`;

			rows.push([methodSignature, comments.join(' ')]);
		}

		return this.createTable(headers, rows);
	}

	generateMethodsContent(methods: Section[], parentClassName?: string) {
		let content = '';

		for (const entry of methods) {
			const {name, documentables, comments} = entry;
			let title = name !== '__default' ? `### ${name}` : '';

			// if has a parent class, wrap in collapsible data.
			if (parentClassName) {
				title = name === '__default' ? `Methods inherited from ${parentClassName}` : `${name} inherited from ${parentClassName}`;
				content += `<CollapsibleData title="${title}">\n\n`;
			} else {
				content += `${title}\n`;
			}

			if (comments.length) {
				content += `${comments.join('\n')}\n`;
			}

			content += this.generateMethodDocumentable(Object.values(documentables));

			if (parentClassName) {
				content += '</CollapsibleData>\n\n';
			}
		}

		return content;
	}

	generateMethodsSection(
		methods: Section[],
		inheritedMethods: {classData: ClassDoc; methods: Section[]}[],
		type: 'method' | 'function' = 'method'
	) {
		if (methods.length === 0 && inheritedMethods.length === 0) {
			return '';
		}

		if (this.classData.name.toLowerCase() === 'errorevent') {
			console.log('METHID has methods:', methods.length, 'and inherited methods:', inheritedMethods);
		}

		const typeTitle = type === 'method' ? 'Methods' : 'Functions';
		let content = `### ${typeTitle} `;
		content += `{#${this.classData.id}-${typeTitle.toLowerCase()}-list}`;
		content += '\n\n';

		content += this.generateMethodsContent(methods);

		for (const inheritedMethod of inheritedMethods) {
			const parentClassName = inheritedMethod.classData.name;
			content += this.generateMethodsContent(inheritedMethod.methods, parentClassName);
		}

		return content;
	};

	generatePropertyDocumentable(propertyDoc: Documentable[]) {
		const headers = ['Property', 'Description'];
		const rows: TableRow[] = [];
		for (const entry of Object.values(propertyDoc)) {
			const {name, comments, type} = entry;
			const safeType = type ? type.replace(/\|/g, '\\|') : '';
			rows.push([`<div class="property-definition">${name} (${safeType})</div>`, comments.join(' ')]);
		}

		return this.createTable(headers, rows);
	}

	generatePropertiesContent(properties: Section[], parentClassName?: string) {
		let content = '';

		for (const entry of properties) {
			const {name, documentables, comments} = entry;
			let title = name !== '__default' ? `### ${name}` : '';

			// if has a parent class, wrap in collapsible data.
			if (parentClassName) {
				title = name === '__default' ? `Properties inherited from ${parentClassName}` : `${name} inherited from ${parentClassName}`;
				content += `<CollapsibleData title="${title}">\n\n`;
			} else {
				content += `${title}\n`;
			}

			if (comments.length) {
				content += `${comments.join('\n')}\n`;
			}

			content += this.generatePropertyDocumentable(Object.values(documentables));

			if (parentClassName) {
				content += '</CollapsibleData>\n\n';
			}
		}

		return content;
	}

	generatePropertiesSection() {
		if (this.properties.length === 0 && this.inheritedProperties.length === 0) {
			return '';
		}

		let content = '### Properties ';
		content += `{#${this.className}-properties-list}\n\n`;

		for (const entry of this.properties) {
			if (entry.name !== '__default') {
				content += `#### ${entry.name}\n`;
			}

			content += this.generatePropertyDocumentable(Object.values(entry.documentables));
		}

		for (const inheritedProperty of this.inheritedProperties) {
			const parentClassName = inheritedProperty.classData.name;
			content += this.generatePropertiesContent(inheritedProperty.properties, parentClassName);
		}
		return content;
	};

	generatePaneDocumentable(paneDoc: Documentable[]) {
		const headers = ['Pane', 'Description'];
		const rows: TableRow[] = [];
		for (const entry of Object.values(paneDoc)) {
			const {name, comments, type, defaultValue} = entry;
			const safeType = type ? type.replace(/\|/g, '\\|') : '';
			const defaultValueContent = `<span class='default-value'>z-index: ${defaultValue ?? 'none'}</span>`;
			rows.push([`<div class="pane-definition">${name} (${safeType})</div> ${defaultValueContent}`, comments.join(' ')]);
		}

		return this.createTable(headers, rows);
	}

	generatePanesSection() {
		if (this.panes.length === 0) {
			return '';
		}

		let content = '### Panes ';
		content += `{#${slugify(`${this.className}-panes-list`)}}\n\n`;
		for (const pane of Object.values(this.panes)) {
			content += `${pane.comments.join('\n')  }\n`;
			content += this.generatePaneDocumentable(Object.values(pane.documentables));
		}

		return content;
	};

	getOutput() {
		this.markdownContent += this.generateExample(this.classData.supersections.example);
		this.markdownContent += this.generateConstructor(this.classData.supersections.constructor);
		this.markdownContent += this.generateOptionsSection();
		this.markdownContent += this.generateEventsSection();
		this.markdownContent += this.generateMethodsSection(this.methods, this.inheritedMethods, 'method');
		this.markdownContent += this.generateMethodsSection(this.functions, [], 'function');
		this.markdownContent += this.generatePropertiesSection();
		this.markdownContent += this.generatePanesSection();

		return this.markdownContent;
	}

}

const generateJson = function (path?: string): RootDoc {
	const doc = new LeafDoc({
		templateDir: 'build/leafdoc-templates',
		showInheritancesWhenEmpty: true,
		leadingCharacter: '@'
	});

	doc.registerDocumentable('pane', 'Map panes');
	doc.registerDocumentable('projection', 'Defined projections');
	doc.registerDocumentable('crs', 'Defined CRSs');

	doc.addFile('build/docs-index.leafdoc', false);
	if (path) {
		doc.addDir(`${path}/src`);
	} else {
		doc.addDir('src');
	}
	doc.addFile('build/docs-misc.leafdoc', false);
	return JSON.parse(doc.outputJSON());
};

const generateApiDocumentation = async function (version: string, json: RootDoc) {

	let markdownContent = '---\n';
	// markdownContent += 'outline: [2]\n';
	markdownContent += '---\n\n';
	markdownContent += '<!-- This file is auto-generated with the script "scripts/generate-api.ts" -->\n\n';
	markdownContent += `# API Reference - ${version}\n\n`;
	for (const classDoc of Object.values(json)) {
		const apiDoc = new ApiDocumentation(classDoc, json);
		markdownContent += apiDoc.getOutput();
	}

	// style
	markdownContent += '\n<style>\n';
	markdownContent += `
.default-value {
	font-size: 0.9em;
	color: var(--text-secondary);
}

.param-definition {
	white-space: nowrap;
	padding-inline-start: 10px;
}

.param-definition:not(:last-child):after {
	content: ',';
}

.option-definition {
	white-space: nowrap;
}

.property-definition {
	white-space: nowrap;
}

.pane-definition {
	white-space: nowrap;
}
`;
	markdownContent += '\n</style>\n';

	await writeFile(path.join(apiDataPath, `${version}.md`), markdownContent);
};

const shouldPullFromRemport = function () {
	const args = process.argv.slice(2);
	const expectedArgs = ['--pull'];
	if (args.length !== expectedArgs.length || !args.every((arg, index) => arg === expectedArgs[index])) {
		return false;
	}
	return true;
};

/**
 * Retrive tags that are present in the Leaflet repository.
 * Exclude current tag (from package.json) and tags that have -dev, -beta, -alpha, -rc in their name.
 * also exclude tag without a valid semver format to avoid issues with grouping and organization of the sidebar.
 * @param tags list of tags to organize and filter
 * @returns organized and filtered list of tags
 */
const organizeTags = function (tags: string[]) {
	const currentVersion = currentPackageJson.version;
	return tags.filter((tag) => {
		const isCurrentTag = tag === currentVersion;
		const isPreRelease = /-dev|-beta|-alpha|-rc/.test(tag);
		const isValidSemver = /^(v)?\d+\.\d+\.\d+(-.+)?$/.test(tag);
		return !isCurrentTag && !isPreRelease && isValidSemver;
	}).sort((a, b) => {
		const [aMajor, aMinor, aPatch] = a.substring(1).split('.').map(Number);
		const [bMajor, bMinor, bPatch] = b.substring(1).split('.').map(Number);

		if (aMajor !== bMajor) {
			// Sort by major version descending
			return bMajor - aMajor;
		}
		if (aMinor !== bMinor) {
			// Sort by minor version descending
			return bMinor - aMinor;
		}
		// Sort by patch version descending
		return bPatch - aPatch;
	});
};

const writeSidebarFile = async function (content: SidebarItem[]) {
	const sidebarPath = path.join(vitepressDirectoryPath, 'generated-sidebars', 'api-sidebar.ts');
	mkdir(path.dirname(sidebarPath), {recursive: true});
	let sidebarContent = '// This file is auto-generated by scripts/generate-api.ts\n';
	sidebarContent +=  `export default ${JSON.stringify(content, null, '\t')};\n`;
	await writeFile(sidebarPath, sidebarContent);
};

const fetchAndCopyTags = async function (): Promise<SidebarItem[]> {
	const shouldPull = shouldPullFromRemport();
	info('Fetching tags from Leaflet repository...');
	info('This may take a while on the first run, as it needs to clone the repository and fetch all tags.');
	info(`Creating cache directory for Leaflet repository tags at: ${tagsCachePath}`);
	mkdir(tagsCachePath, {recursive: true});

	const git: SimpleGit = simpleGit({
		baseDir: tagsCachePath,
	}).clean(CleanOptions.FORCE);

	if (shouldPull) {
		info('Cloning Leaflet repository');
		await git.clone('https://github.com/Leaflet/Leaflet.git', tagsCachePath, ['--depth', '1', '--tags']);

		info('Fetching all tags from the repository...');
		await git.fetch(['--tags']);
	}

	const tags = await git.tags();

	if (tags.all.length === 0) {
		warn('No tags found. Make sure to fetch the tags first.');
		return [];
	}

	const sidebar: SidebarItem[] = [];
	// checkout each tag, generate the API documentation, and save it in the apiDataPath with the tag name as a subdirectory
	for (const tag of organizeTags(tags.all).slice(0, TAGS_LIMIT)) {
		info(`Processing tag: ${tag}`);
		await git.checkout(tag);
		const json = generateJson(tagsCachePath);
		const tagWithoutPrefix = tag.startsWith('v') ? tag.substring(1) : tag;
		await generateApiDocumentation(tagWithoutPrefix, json);
		sidebar.push({
			text: tagWithoutPrefix,
			link: `/develop/api/${tagWithoutPrefix}`
		});
	}

	return sidebar;
};

/**
 * Group and organize tags based on their major version.
 * For example, v1.0.0, v1.2.0, and v1.3.0 will be grouped under v1.x.x.
 *
 * @param {SidebarItem[]} sidebar list of sidebar items to organize
 * @returns {SidebarItem[]} organized list of sidebar items with major versions as groups and tags as subitems
 */

const organizeSidebar = function (sidebar: SidebarItem[]): SidebarItem[] {
	const organized: Record<string, SidebarItem[]> = {};

	for (const item of sidebar) {
		const majorVersionMatch = item.text.match(/^(\d+)\./);
		if (majorVersionMatch) {
			const majorVersion = `${majorVersionMatch[1]}.x.x`;
			if (!organized[majorVersion]) {
				organized[majorVersion] = [];
			}
			const itemWithoutVersionPrefix = {
				...item,
				text: item.text.replace(/^v?/, '')
			};
			organized[majorVersion].push(itemWithoutVersionPrefix);
		} else {
			if (!organized['Other']) {
				organized['Other'] = [];
			}
			organized['Other'].push(item);
		}
	}

	const result: SidebarItem[] = [];
	for (const [group, items] of Object.entries(organized)) {
		result.push({
			text: group,
			// link to the first item in the group
			link: items[0].link,
			items,
			collapsed: true
		});
	}

	return result;
};

const startProcess = async function () {
	try {
		// delete apiDataPath content before starting to generate new documentation
		await emptyDir(apiDataPath);
		const sidebar = await fetchAndCopyTags();
		const json = generateJson();
		await generateApiDocumentation(`v${currentPackageJson.version}`, json);

		// const organizedSidebar = organizeSidebar(sidebar);
		sidebar.unshift({
			text: `v${currentPackageJson.version}`,
			link: `/develop/api/v${currentPackageJson.version}`
		});
		await writeSidebarFile(sidebar);

		success('Completed generating API documentation!');
	} catch (errorCaught) {
		error('Error generating API documentation:', errorCaught.message);
	}
};

startProcess();
