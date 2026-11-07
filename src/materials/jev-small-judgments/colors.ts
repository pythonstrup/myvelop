// 이 글의 정적 그림(SVG)이 함께 쓰는 색. 캔버스 데모는 같은 값을 palette(dark)에서 가져온다.
// 뜻: 파랑 = Jev, 주황 = 생성 모델(Haiku)·확인으로 넘김, 초록 = 바로 처리, 빨강 = 형식 실패.
// 중립(코드·눈금·글자)은 사이트 변수 var(--foreground)·var(--muted-foreground)·var(--border)를 쓴다.
export const SVG_STYLE = `
	.jv-blue { fill: #1971c2; } .jv-blue-line { stroke: #1971c2; } .jv-blue-soft { fill: #d0ebff; }
	.jv-amber { fill: #e8590c; } .jv-amber-line { stroke: #e8590c; } .jv-amber-soft { fill: #ffe8cc; }
	.jv-green { fill: #2f9e44; } .jv-green-line { stroke: #2f9e44; } .jv-green-soft { fill: #d3f9d8; }
	.jv-red { fill: #e03131; } .jv-red-line { stroke: #e03131; } .jv-red-soft { fill: #ffe3e3; }
	.jv-box { fill: #f8f9fa; } .jv-box-line { stroke: #dee2e6; }
	html.dark .jv-blue { fill: #4dabf7; } html.dark .jv-blue-line { stroke: #4dabf7; } html.dark .jv-blue-soft { fill: rgba(77, 171, 247, 0.18); }
	html.dark .jv-amber { fill: #ffa94d; } html.dark .jv-amber-line { stroke: #ffa94d; } html.dark .jv-amber-soft { fill: rgba(255, 169, 77, 0.18); }
	html.dark .jv-green { fill: #69db7c; } html.dark .jv-green-line { stroke: #69db7c; } html.dark .jv-green-soft { fill: rgba(105, 219, 124, 0.18); }
	html.dark .jv-red { fill: #ff6b6b; } html.dark .jv-red-line { stroke: #ff6b6b; } html.dark .jv-red-soft { fill: rgba(255, 107, 107, 0.18); }
	html.dark .jv-box { fill: rgba(255, 255, 255, 0.05); } html.dark .jv-box-line { stroke: rgba(255, 255, 255, 0.2); }
`;
