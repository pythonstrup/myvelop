import { basename } from 'node:path';
import { type CollectionEntry, getCollection } from 'astro:content';

export type Note = CollectionEntry<'notes'>;
export type NoteLang = 'en' | 'ko';

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

/** 제목 순. 날짜가 없으니 목록은 색인처럼 읽는다. */
export async function getNotes(lang: NoteLang) {
	return (await getCollection('notes', ({ id }) => id.startsWith(`${lang}/`))).sort((a, b) =>
		noteTitle(a).localeCompare(noteTitle(b), lang),
	);
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
