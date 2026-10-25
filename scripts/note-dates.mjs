// Writes src/data/note-dates.json from git.
//
// A note has no frontmatter. Its published date is the author date of the earliest
// commit that touches the current path, and its updated date is the author date of
// the latest. `git log --follow` keeps the earlier date across renames.
//
// GitHub Actions and Cloudflare Pages check out a shallow clone, so the site build
// reads the committed JSON instead of running git. Run this on a full clone after
// adding or editing notes. A shallow clone is refused so it cannot overwrite real dates.

import { execFileSync } from 'node:child_process';
import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

function git(args) {
	return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
}

const shallow = git(['rev-parse', '--is-shallow-repository']).trim();
if (shallow === 'true') {
	console.error(
		'This clone is shallow, so git cannot see when each note was added. Run npm run note-dates on a full clone.',
	);
	process.exit(1);
}

/** @param {string} path repo-relative path */
function datesFor(path) {
	const dates = git(['log', '--follow', '--format=%aI', '--', path])
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
	if (dates.length === 0) {
		console.error(`${path} is not in git history. Commit the note, then re-run npm run note-dates.`);
		process.exit(1);
	}
	// git log is newest first.
	return { published: dates[dates.length - 1], updated: dates[0] };
}

const notes = {};
for (const lang of ['en', 'ko']) {
	const directory = join(root, 'src/content/notes', lang);
	const files = (await readdir(directory)).filter((name) => name.endsWith('.md')).sort((a, b) => a.localeCompare(b, lang));
	for (const file of files) {
		const key = `${lang}/${file}`.normalize('NFC');
		notes[key] = datesFor(join('src/content/notes', key));
	}
}

const output = {
	source:
		'Author date of the earliest (published) and latest (updated) git commit that touches the current path, including renames. Regenerate with npm run note-dates on a full clone. See src/content/notes/README.md.',
	notes,
};

await writeFile(join(root, 'src/data/note-dates.json'), `${JSON.stringify(output, null, '\t')}\n`);
console.log(`Wrote ${Object.keys(notes).length} note dates.`);
