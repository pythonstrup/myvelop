# 아키텍처와 변경 경계

pythonstrup은 Astro 7로 빌드하는 정적 다국어 블로그다. 서버 런타임은 없으며 `dist` 전체를 Cloudflare Pages가 제공한다.

## 경로 구조

| 기능 | 영어 | 한국어 | 구현 |
| --- | --- | --- | --- |
| 홈 | `/` | `/ko/` | `src/pages/index.astro`, `src/pages/ko/index.astro` |
| 글 목록 | `/blog/` | `/ko/blog/` | `BlogList.astro` |
| 페이지네이션 | `/blog/page/:page/` | `/ko/blog/page/:page/` | `src/pages/**/blog/page/[page].astro` |
| 글 | `/blog/:slug/` | `/ko/blog/:slug/` | `BlogPost.astro` |
| 검색 | `/search/` | `/ko/search/` | `SearchCommand.tsx` |
| 소개 | `/about/` | `/ko/about/` | `AboutPortfolio.astro` |
| RSS | `/rss.xml` | `/ko/rss.xml` | `src/pages/**/rss.xml.js` |
| 오류 안내 | `/404/` | `/ko/404/` | `NotFound.astro` |

영어가 기본 언어이고 한국어만 `/ko` 접두사를 쓴다. 글 목록은 `pubDate` 내림차순이며 한 페이지에 다섯 개, 홈에는 최신 세 개를 표시한다.

## 주요 경계

- `src/components/BaseHead.astro`가 canonical URL, description, Open Graph, Twitter Card, RSS, sitemap, hreflang을 한곳에서 만든다. 글은 실제 번역본이 있을 때만 상대 언어 hreflang을 노출한다.
- `src/content.config.ts`가 글 frontmatter의 단일 스키마다. 원문은 `src/content/blog/{en,ko}`에 있다.
- `src/data/about.ts`가 두 About 페이지의 콘텐츠 소스다. 레이아웃과 섹션 컴포넌트에는 문구를 복제하지 않는다.
- 기본 UI는 Astro의 정적 HTML, scoped CSS, 작은 네이티브 스크립트로 만든다. 현재 React island는 검색의 `SearchCommand.tsx` 하나이며 `client:load`로 활성화된다.
- Tailwind와 shadcn 계열 UI 코드는 `src/styles/ui.css`, `src/components/search`, `src/components/ui` 범위에만 둔다. 정적 페이지를 일관성만을 이유로 React island로 바꾸지 않는다.
- Pagefind는 Astro 빌드 후 `dist`를 읽어 색인을 만든다. 따라서 검색은 개발 서버만으로 완전히 검증할 수 없고 `npm run check` 후 preview가 필요하다.
- Giscus는 글 레이아웃에서만 로드하며 pathname을 Discussion 식별자로 쓴다.
- Mermaid는 다이어그램이 있는 글에서만 동적으로 import하고 화면 가까이에 왔을 때 렌더링한다.
- 정적 호스트가 실제 404 응답에 쓰는 `src/pages/404.astro`는 반드시 유지한다. 한국어 오류 안내는 `src/pages/ko/404.astro`가 담당하며 두 noindex 경로는 sitemap에서 제외한다.

## 성능 불변 조건

다음 선택은 실제 Lighthouse 측정에 근거한다. 바꾸기 전에 [성능 기록](lighthouse-performance.md)과 같은 방식으로 다시 측정한다.

- Astro 이미지의 `layout: "constrained"`를 유지해 반응형 `srcset`을 생성한다.
- Pretendard CSS는 첫 렌더를 막지 않으며 `font-display: optional`을 사용한다.
- 한국어 장문 본문은 OS 시스템 산세리프를 사용한다.
- Mermaid, Giscus처럼 모든 페이지에 필요하지 않은 코드는 전역 번들에 넣지 않는다.

## 피드백 루프

`npm run check`가 정적 빌드와 Pagefind 생성 뒤 다음을 기계적으로 확인한다.

- 문서 링크와 글 번호의 연속성;
- 필수 산출물, sitemap과 canonical의 대응;
- HTML의 title, h1, description, lang, 내부 링크와 정적 자산;
- RSS의 글 집합과 최신순 정렬;
- 반응형 이미지와 Pretendard 비차단 로딩 불변 조건.

GitHub Actions도 같은 명령을 Node 22에서 실행한다. Lighthouse 점수는 실행 편차가 크므로 일반 빌드 차단 조건으로 쓰지 않고 성능 작업 때 별도로 측정한다.
