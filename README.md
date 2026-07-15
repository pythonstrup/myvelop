# pythonstrup

[pythonstrup.com](https://pythonstrup.com)의 소스 저장소다. Astro로 정적 HTML을 만들고 Cloudflare Pages에 배포한다. 영어는 루트 경로, 한국어는 `/ko` 경로에서 제공한다.

## 로컬 개발

Node.js 22.12 이상과 npm이 필요하다.

```sh
npm ci
astro dev --background
```

개발 서버는 `astro dev status`, `astro dev logs`, `astro dev stop`으로 관리한다.

## 검증과 배포

```sh
npm run check
npm run preview
```

`npm run check`는 Astro 타입 검사, 정적 빌드, Pagefind 검색 색인 생성, 저장소·산출물 검증을 차례로 실행한다. Cloudflare Pages의 빌드 명령은 `npm run build`, 출력 디렉터리는 `dist`다.

## 문서

- [아키텍처와 변경 경계](docs/architecture.md)
- [글 작성과 번역](docs/content-authoring.md)
- [Lighthouse 성능 최적화](docs/lighthouse-performance.md)

이 디자인은 [Bear Blog](https://github.com/HermanMartinus/bearblog/)를 바탕으로 시작했다.
