// Aurora 클러스터에서 ACU로 세는 계산 부분과, 두 저장소(인스턴스마다 붙은 로컬 저장소, 모두가 함께 쓰는 클러스터 저장소)를 나눠 보여주는 정적 그림.
const ARIA =
	"Aurora 클러스터의 구성도. 위에 writer와 reader 인스턴스가 나란히 있고, 각 인스턴스 안에는 ACU로 세는 CPU와 메모리 칸과, 점선으로 그린 로컬 저장소 칸이 있다. 로컬 저장소는 임시 파일을 두는 작업용 공간이다. 아래에는 두 인스턴스가 함께 쓰는 클러스터 저장소가 넓게 있고, 테이블과 인덱스를 세 가용 영역에 두 벌씩, 모두 여섯 벌로 담는다. ACU로 늘고 주는 것은 위쪽의 CPU와 메모리뿐이다.";

function Instance({ x, name }: { x: number; name: string }) {
	return (
		<g>
			<rect x={x} y="10" width="210" height="132" rx="10" fill="none" stroke="rgb(var(--gray))" strokeOpacity="0.6" />
			<text x={x + 12} y="30" fontSize="12.5" fontWeight="600" fill="var(--foreground)">
				{name}
			</text>
			<rect x={x + 12} y="40" width="186" height="44" rx="6" fill="var(--accent)" fillOpacity="0.12" stroke="var(--accent)" strokeWidth="1.4" />
			<text x={x + 105} y="58" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="var(--foreground)">
				CPU와 메모리
			</text>
			<text x={x + 105} y="75" textAnchor="middle" fontSize="11" fill="var(--accent)">
				ACU로 센다
			</text>
			<rect x={x + 12} y="92" width="186" height="38" rx="6" fill="none" stroke="rgb(var(--gray))" strokeOpacity="0.8" strokeDasharray="4 3" />
			<text x={x + 105} y="108" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--foreground)">
				로컬 저장소
			</text>
			<text x={x + 105} y="123" textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
				작업 중 잠깐 쓰는 임시 파일
			</text>
		</g>
	);
}

function Zone({ cx, name }: { cx: number; name: string }) {
	return (
		<g>
			{[-18, 18].map((dx) => (
				<rect key={dx} x={cx + dx - 14} y="240" width="28" height="22" rx="3" fill="var(--secondary)" stroke="rgb(var(--gray))" strokeOpacity="0.7" />
			))}
			<text x={cx} y="280" textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
				{name}
			</text>
		</g>
	);
}

export default function StorageLayoutDiagram() {
	return (
		<svg viewBox="0 0 480 330" role="img" aria-label={ARIA} style={{ display: "block", maxWidth: 480, margin: "2rem auto" }}>
			<defs>
				<marker id="storage-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
					<path d="M0,0 L10,5 L0,10 z" fill="rgb(var(--gray))" />
				</marker>
			</defs>

			<Instance x={20} name="writer" />
			<Instance x={250} name="reader" />

			{[125, 355].map((ax) => (
				<line key={ax} x1={ax} y1="145" x2={ax} y2="183" stroke="rgb(var(--gray))" strokeWidth="1.5" markerStart="url(#storage-arrow)" markerEnd="url(#storage-arrow)" />
			))}

			<rect x="20" y="186" width="440" height="108" rx="10" fill="var(--secondary)" fillOpacity="0.5" stroke="rgb(var(--gray))" strokeOpacity="0.7" />
			<text x="240" y="206" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)">
				클러스터 저장소
			</text>
			<text x="240" y="224" textAnchor="middle" fontSize="11.5" fill="var(--muted-foreground)">
				테이블과 인덱스. writer와 reader가 함께 쓴다
			</text>
			<Zone cx={100} name="가용 영역 A" />
			<Zone cx={240} name="가용 영역 B" />
			<Zone cx={380} name="가용 영역 C" />

			<text x="240" y="318" textAnchor="middle" fontSize="12.5" fill="var(--muted-foreground)">
				ACU로 늘고 주는 것은 파란 칸뿐이다
			</text>
		</svg>
	);
}
