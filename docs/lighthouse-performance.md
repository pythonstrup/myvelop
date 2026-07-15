# Lighthouse 성능 최적화

2026년 7월 15일, `pythonstrup.com`의 모바일 Lighthouse Performance 중앙값을 개선했다. 이 문서는 같은 병목을 다시 만들지 않고 결과를 재현하기 위한 기록이다.

## 결과

Lighthouse 13.2.0으로 운영 환경의 canonical URL 52개를 한 번씩 순차 측정했다. 커스텀 404 페이지는 집계에서 제외했다.

| 지표 | 변경 전 | 변경 후 |
| --- | ---: | ---: |
| 전체 Performance 중앙값 | 88.5 | **97.5** |
| 전체 Performance 평균 | 85.8 | **94.9** |
| 90점 이상인 페이지 | 26/52 | **41/52** |
| 한국어 페이지 중앙값 | 78.5 | **99** |
| 한국어 글 중앙값 | 76 | **99** |
| 한국어 글 LCP 중앙값 | 4.05초 | **2.00초** |
| 한국어 글 폰트 전송량 중앙값 | 411 KiB | **226 KiB** |
| 한국어 글 폰트 요청 수 중앙값 | 16개 | **9개** |

변경 후 최저점은 81점이며, 11개 페이지는 여전히 90점 미만이다. 주로 한국어 About과 글 목록 페이지다. 이번 작업의 완료 기준은 모든 페이지 90점이 아니라 전체 중앙값 90점 이상이었다.

## 원인

성능 저하의 핵심은 Pretendard 동적 서브셋이었다.

- 공통 CSS가 92개의 `@font-face`를 포함했다.
- 긴 한국어 글은 첫 화면 밖의 글자까지 매칭하면서 WOFF2 파일을 13~20개 요청했다.
- 공통 CSS를 받은 뒤에야 폰트 요청을 시작해 렌더링 경로가 길어졌다.
- Markdown 이미지는 WebP로 변환됐지만 `srcset`이 비어 있어 모바일에서도 큰 이미지를 받았다.

폰트 전송량과 한국어 페이지 LCP 사이의 상관관계가 강했고, 영어 페이지는 이미 중앙값 92점이었다. 따라서 React나 Mermaid 번들보다 폰트와 이미지가 우선순위였다.

## 적용한 변경

### 반응형 이미지

[`astro.config.mjs`](../astro.config.mjs)에 다음 설정을 추가했다.

```js
image: {
  layout: "constrained",
},
```

Astro가 Markdown 이미지와 `<Image>`에 `srcset`과 `sizes`를 생성한다. 기존 전역 `img { max-width: 100%; height: auto; }`가 반응형 레이아웃을 담당하므로 `responsiveStyles`는 추가하지 않았다.

빌드 시 이미지 변형 파일은 456개로 늘었고 `dist` 크기는 약 17 MiB에서 26 MiB가 됐다. 배포 용량보다 모바일 전송량 감소 효과가 더 컸기 때문에 이 설정을 유지한다.

### Pretendard 비차단 로딩

- Pretendard import를 [`global.css`](../src/styles/global.css)에서 [`fonts.css`](../src/styles/fonts.css)로 분리했다.
- [`BaseHead.astro`](../src/components/BaseHead.astro)에서 폰트 CSS를 `preload`하고, 로드된 뒤 stylesheet로 활성화한다.
- [`astro.config.mjs`](../astro.config.mjs)의 작은 PostCSS 변환으로 Pretendard의 `font-display`를 `optional`로 바꾼다.
- JavaScript가 꺼진 환경에서는 `<noscript>`의 일반 stylesheet가 동작한다.

느린 첫 방문에서는 시스템 fallback을 먼저 보여줄 수 있다. 늦은 폰트 교체로 LCP와 CLS가 다시 계산되는 것보다 내용을 즉시 표시하는 쪽을 선택했다.

### 한국어 장문 본문

[`BlogPost.astro`](../src/layouts/BlogPost.astro)는 한국어 글의 `.prose`에 OS 기본 산세리프를 사용한다. 제목, 브랜드, 헤더, 메뉴와 영어 글은 계속 Pretendard를 사용한다.

```css
.system-prose {
  font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
}
```

이 변경으로 대표 한국어 장문 글의 초기 폰트 요청이 20개·537 KiB에서 8개·201 KiB로 줄었다. OS마다 본문 글꼴 모양은 조금 다를 수 있지만 기존 `line-height: 1.7`을 유지해 레이아웃 차이를 제한했다.

## 적용하지 않은 방법

- 전체 Pretendard variable 파일은 약 2 MiB이므로 동적 서브셋보다 불리하다.
- `subset.91` 하나만 preload해도 긴 한국어 글이 요구하는 나머지 서브셋은 줄지 않는다.
- 모든 CSS를 HTML에 인라인하면 첫 요청 하나는 줄지만, 페이지마다 약 18~20 KiB를 반복하고 공통 CSS 캐시를 잃는다.
- 페이지별 폰트 서브셋 생성은 Pretendard를 완전히 유지할 수 있지만 새 글마다 빌드 파이프라인과 검증이 필요해 현재 목표에는 과하다.

## 재측정 방법

Lighthouse는 실행마다 점수가 흔들릴 수 있다. 전체 회귀 검사는 sitemap의 canonical URL을 한 번씩 순차 측정해 중앙값을 비교하고, 특정 페이지를 진단할 때는 세 번 실행한 중앙값을 사용한다. 같은 장비에서 병렬 실행하면 CPU 경합으로 결과가 왜곡될 수 있다.

```sh
npx --yes lighthouse@13.2.0 https://pythonstrup.com/ko/blog/17/ \
  --only-categories=performance \
  --throttling-method=simulate \
  --output=json \
  --output-path=./lighthouse.json \
  --quiet \
  --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage"
```

변경 후에는 다음 항목도 확인한다.

1. `npm run build`가 성공하는가?
2. 빌드된 Markdown 이미지의 `srcset`이 비어 있지 않은가?
3. 배포 HTML이 `fonts.*.css`를 비차단으로 불러오는가?
4. 375px 화면에서 글, About, 검색, 모바일 메뉴에 가로 overflow가 없는가?
5. 라이트·다크 모드의 제목과 본문 줄바꿈이 자연스러운가?

전체 중앙값이 다시 90점 아래로 내려갈 때 먼저 한국어 목록과 About의 폰트 범위를 확인한다. 모든 개별 페이지를 90점 이상으로 만들 필요가 생겼을 때만 페이지별 폰트 서브셋을 검토한다.
