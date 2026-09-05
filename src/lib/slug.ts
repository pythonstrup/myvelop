// "pub/sub", "@Transactional", "Nexters 27기"처럼 URL에 못 쓰는 문자가 있어서
// 글자·숫자(한글 포함)만 남기고 하이픈으로 잇는다. 대소문자만 다른 값은 하나로 합친다.
// astro.config.mjs의 위키링크 플러그인도 쓰므로 이 파일은 astro:content를 import하지 않는다.
export function tagSlug(tag: string) {
	return tag
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '');
}
