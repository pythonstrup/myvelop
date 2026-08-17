# 글 작성과 번역

## 파일과 번호

글은 `src/content/blog/en` 또는 `src/content/blog/ko`에 `<번호>.md`로 추가한다. 번호는 1부터 빠짐없이 증가시킨다. 같은 글의 번역본은 `en/19.md`, `ko/19.md`처럼 같은 번호를 사용한다. 한 언어만 먼저 발행할 수 있으므로 두 디렉터리의 글 개수가 항상 같을 필요는 없다.

글 번호는 URL slug가 된다. 게시 순서는 번호가 아니라 `pubDate`로 결정된다.

## Frontmatter

필수 필드:

```yaml
---
title: "글 제목"
description: "검색 결과와 소셜 카드에 쓸 요약"
pubDate: "2026-07-15T09:00:00+09:00"
socialImage: "../../../assets/blog/25/og.png"
---
```

`socialImage`는 필수다. 스키마가 강제하므로 빠뜨리면 `npm run check`가 실패한다. 1200×630 PNG로 만들고 `src/assets/blog/<번호>/og.png`에 둔다. 번역쌍은 같은 파일을 함께 가리킨다.

선택 필드는 `updatedDate`, `heroImage`, `tags`, `series`다. 스키마의 기준은 `src/content.config.ts`다. `series`에 같은 문자열을 넣은 글들은 연재로 묶여 글 상단에 시리즈 박스가 뜨고, 하단 이전/다음 링크가 시리즈 순서(`pubDate` 오름차순)를 따른다. 번역쌍은 언어별 시리즈명을 각각 쓴다(예: 한국어 "BullMQ로 알림 시스템 운영하기", 영어 "Running a Notification System with BullMQ"). `heroImage`를 넣으면 글 상단에 `priority`가 붙은 LCP 이미지로 렌더되므로, 성능을 감안해 필요한 글에만 쓴다.

소셜 이미지는 `socialImage`, `heroImage`, `src/assets/og-default.png` 순서로 대체된다. 본문과 대표 이미지는 `src/assets/blog/<번호>/01.png`처럼 보관하고 Markdown에서는 글 파일을 기준으로 상대 경로를 쓴다.

```yaml
heroImage: "../../../assets/blog/20/01.png"
socialImage: "../../../assets/blog/20/social.png"
```

## 번역과 다이어그램

- 제목, 설명, 본문, 이미지 대체 텍스트를 모두 대상 언어로 작성한다.
- 코드, API 이름, 고유 명칭은 의미가 달라지지 않게 유지한다.
- 영어 글의 구조도는 한국어 이미지 사본을 쓰지 말고 Mermaid로 직접 그린다.
- Mermaid에는 `accTitle`과 `accDescr`를 넣어 다이어그램의 목적과 흐름을 설명한다.

```html
<pre class="mermaid">
flowchart LR
    accTitle: Job delivery flow
    accDescr: A producer adds a job to Redis and a worker processes it.
    Producer --&gt; Redis --&gt; Worker
</pre>
```

## 설명 컴포넌트 (materials)

다이어그램·애니메이션이 필요한 글은 확장자를 `.mdx`로 바꾸고, 컴포넌트를 `src/materials/<번호>/`에 작성한다. 외부 차트·애니메이션 라이브러리는 추가하지 않는다. 상세 규칙과 템플릿은 `/create-material` 스킬(`.claude/skills/create-material/SKILL.md`)에 있다.

```mdx
import PasswordlessAuthDemo from "@/materials/24/PasswordlessAuthDemo";

<PasswordlessAuthDemo client:visible />
```

- 정적 다이어그램(`~Diagram`) — SSR 전용 인라인 SVG, 사이트 CSS 변수로 테마 처리, client 디렉티브 없음. 템플릿: `src/materials/24/TrustChainDiagram.tsx`.
- 애니메이션 데모(`~Demo`) — Canvas 2D + `@/materials/shared`의 `useCanvasScene` 훅, `client:visible` 필수. 테마·DPR·`prefers-reduced-motion`은 훅과 `palette(dark)`가 처리한다. 템플릿: `src/materials/24/PasswordlessAuthDemo.tsx`.
- 두 유형 모두 `role="img"`와 한국어 `aria-label`을 붙인다.

## 발행 전 확인

1. `npm run check`를 실행한다.
2. preview에서 새 글의 영어·한국어 경로와 언어 전환 링크를 확인한다.
3. 모바일과 데스크톱에서 이미지, 코드 블록, Mermaid, 가로 overflow를 확인한다.
4. `/rss.xml`, `/ko/rss.xml`, `/sitemap-index.xml`에 새 경로가 반영됐는지 확인한다.
5. `/search/`와 `/ko/search/`에서 제목이나 본문으로 검색되는지 확인한다.
