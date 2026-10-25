import { basename } from 'node:path';
import { type CollectionEntry, getCollection } from 'astro:content';
import noteDatesJson from '../data/note-dates.json';

export type Note = CollectionEntry<'notes'>;
export type NoteLang = 'en' | 'ko';

// Keys are NFC paths relative to src/content/notes, e.g. "ko/학습은 기억이 아니라 이해다.md".
const noteDates = new Map<string, { published: string; updated: string }>(
	Object.entries(noteDatesJson.notes),
);

/** `[[제목]]` 또는 `[[제목|별칭]]`. astro.config.mjs의 remarkWikilinks와 같은 패턴이다. */
export const WIKILINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export function noteLang(note: Note): NoteLang {
	return note.id.startsWith('ko/') ? 'ko' : 'en';
}

export function notesBase(lang: NoteLang) {
	return lang === 'ko' ? '/ko/notes' : '/notes';
}

/** 제텔카스텐 노트는 frontmatter가 없고 파일명이 곧 제목이다. */
export function noteTitle(note: Note) {
	return basename(note.filePath ?? note.id, '.md');
}

export function noteHref(note: Note) {
	return `${notesBase(noteLang(note))}/${note.id.replace(/^(?:en|ko)\//, '')}/`;
}

/** 제목 순. 색인과 백링크처럼 날짜와 상관없는 목록에 쓴다. */
export async function getNotes(lang: NoteLang) {
	return (await getCollection('notes', ({ id }) => id.startsWith(`${lang}/`))).sort((a, b) =>
		noteTitle(a).localeCompare(noteTitle(b), lang),
	);
}

/** `src/content/notes/` 아래의 NFC 상대 경로. note-dates.json의 키와 같다. */
export function noteDateKey(note: Note) {
	// 콘텐츠 저장소의 filePath는 `src/content/notes/...`처럼 앞에 슬래시가 없다.
	const filePath = note.filePath?.replaceAll('\\', '/');
	const marker = 'src/content/notes/';
	const index = filePath?.lastIndexOf(marker) ?? -1;
	if (!filePath || index === -1) {
		throw new Error(`Note ${note.id} has no path under src/content/notes`);
	}
	return filePath.slice(index + marker.length).normalize('NFC');
}

/**
 * 발행일은 이 경로를 처음 건드린 커밋의 author date, 수정일은 마지막 커밋의 author date.
 * 값은 `npm run note-dates`가 전체 git 이력에서 읽어 src/data/note-dates.json에 둔다.
 */
export function noteDatesOf(note: Note) {
	const key = noteDateKey(note);
	const entry = noteDates.get(key);
	if (!entry) {
		throw new Error(`Missing note date for ${key}. On a full clone, run npm run note-dates.`);
	}
	const published = new Date(entry.published);
	const updated = new Date(entry.updated);
	if (Number.isNaN(published.valueOf()) || Number.isNaN(updated.valueOf())) {
		throw new Error(`Invalid note date for ${key}`);
	}
	return { published, updated };
}

export interface DatedNote {
	note: Note;
	published: Date;
	updated: Date;
}

/**
 * 처음 커밋된 날의 내림차순. 같은 날이면 제목순이라, 한 커밋에 함께 들어온 노트는 가나다·알파벳으로 갈린다.
 */
export async function getNotesByDate(lang: NoteLang): Promise<DatedNote[]> {
	const notes = await getCollection('notes', ({ id }) => id.startsWith(`${lang}/`));
	return notes
		.map((note) => ({ note, ...noteDatesOf(note) }))
		.sort((a, b) => {
			const byDate = b.published.valueOf() - a.published.valueOf();
			if (byDate !== 0) return byDate;
			return noteTitle(a.note).localeCompare(noteTitle(b.note), lang);
		});
}

export function notesFeedInfo(lang: NoteLang) {
	const ko = lang === 'ko';
	return {
		title: ko ? 'pythonstrup 노트' : 'pythonstrup notes',
		href: ko ? '/ko/notes/rss.xml' : '/notes/rss.xml',
		path: ko ? 'ko/notes/rss.xml' : 'notes/rss.xml',
		description: ko
			? '짧은 노트입니다. 한 편에 주장 하나, 파일명이 제목입니다.'
			: 'Short notes. One claim each, and the filename is the title.',
	};
}

/** 본문 첫 문단을 메타 설명으로 쓴다. 위키링크 괄호와 강조 기호만 벗긴다. */
export function noteDescription(note: Note) {
	const paragraph = (note.body ?? '').trim().split(/\n\s*\n/)[0] ?? '';
	return paragraph
		.replace(WIKILINK, (_, title: string, alias?: string) => (alias ?? title).trim())
		.replace(/[*_`]/g, '')
		.slice(0, 160);
}

/** 이 노트를 `[[제목]]`으로 참조하는 다른 노트들. 같은 언어 안에서만 찾는다. */
export function getBacklinks(note: Note, notes: Note[]) {
	const title = noteTitle(note);
	return notes.filter(
		(other) =>
			other.id !== note.id &&
			[...(other.body ?? '').matchAll(WIKILINK)].some((match) => match[1].trim() === title),
	);
}
