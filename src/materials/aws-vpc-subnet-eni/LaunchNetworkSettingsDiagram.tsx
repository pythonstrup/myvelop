// EC2 인스턴스 시작 화면의 "네트워크 설정" 칸을 단순하게 다시 그린 정적 SVG. 칸마다 이 글에서 다루는 절을 표시한다.
const GRAY = "rgb(var(--gray))";
const Y0 = 72;
const STEP = 66;
// 칸 이름, 칸에 보이는 값(null이면 라디오 버튼), 오른쪽 표시와 그 폭
const LABELS = {
	ko: {
		rows: [
			{ label: "VPC", value: "vpc-0a1b2c3d (기본값)", tag: "→ VPC", tagW: 52 },
			{ label: "서브넷", value: "기본 설정 없음", tag: "→ 서브넷", tagW: 64 },
			{ label: "퍼블릭 IP 자동 할당", value: "활성화", tag: "→ 퍼블릭과 프라이빗", tagW: 130 },
			{ label: "방화벽(보안 그룹)", value: null, tag: "→ 보안 그룹", tagW: 78 },
		],
		title: "▾ 네트워크 설정",
		edit: "편집",
		create: "보안 그룹 생성",
		select: "기존 보안 그룹 선택",
		selectX: 172,
		advanced: "▸ 고급 네트워크 구성",
		aria: "EC2 인스턴스 시작 화면의 네트워크 설정을 단순하게 다시 그린 그림. VPC는 기본 VPC, 서브넷은 기본 설정 없음, 퍼블릭 IP 자동 할당은 활성화, 방화벽은 보안 그룹 생성이 기본으로 골라져 있고, 아래에 고급 네트워크 구성이 접혀 있다. 각 칸 오른쪽에 이 글에서 다루는 절인 VPC, 서브넷, 퍼블릭과 프라이빗, 보안 그룹, ENI가 표시되어 있다.",
	},
	en: {
		rows: [
			{ label: "VPC", value: "vpc-0a1b2c3d (default)", tag: "→ VPC", tagW: 52 },
			{ label: "Subnet", value: "No preference", tag: "→ Subnets", tagW: 72 },
			{ label: "Auto-assign public IP", value: "Enable", tag: "→ Public and private", tagW: 134 },
			{ label: "Firewall (security groups)", value: null, tag: "→ Security groups", tagW: 116 },
		],
		title: "▾ Network settings",
		edit: "Edit",
		create: "Create security group",
		select: "Select existing security group",
		selectX: 196,
		advanced: "▸ Advanced network configuration",
		aria: "A simplified redrawing of the network settings on the EC2 launch instance screen. VPC is the default VPC, subnet is No preference, auto-assign public IP is Enable, and firewall defaults to Create security group, with Advanced network configuration collapsed below. To the right of each field is the section of this post that covers it: VPC, Subnets, Public and private, Security groups, and ENI.",
	},
};
type Lang = keyof typeof LABELS;

function Tag({ y, text, w }: { y: number; text: string; w: number }) {
	return (
		<g>
			<rect x={416 - w} y={y - 10} width={w} height="20" rx="10" fill="var(--secondary)" stroke="var(--accent)" strokeOpacity="0.7" />
			<text x={416 - w / 2} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--accent)">
				{text}
			</text>
		</g>
	);
}

export default function LaunchNetworkSettingsDiagram({ lang = "ko" }: { lang?: Lang }) {
	const L = LABELS[lang];
	const label = { fontSize: 12.5, fontWeight: 600, fill: "var(--foreground)" } as const;
	const value = { fontSize: 12.5, fill: "var(--foreground)" } as const;
	return (
		<svg
			viewBox="0 0 440 392"
			role="img"
			aria-label={L.aria}
			style={{ display: "block", maxWidth: 440, margin: "2rem auto 0.5rem" }}
		>
			<rect x="8" y="8" width="424" height="376" rx="10" fill="var(--background)" stroke={GRAY} strokeOpacity="0.5" />
			<text x="24" y="40" fontSize="15" fontWeight="700" fill="var(--foreground)">
				{L.title}
			</text>
			<rect x="370" y="22" width="46" height="26" rx="6" fill="none" stroke={GRAY} strokeOpacity="0.6" />
			<text x="393" y="40" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--foreground)">
				{L.edit}
			</text>
			<line x1="8" y1="58" x2="432" y2="58" stroke={GRAY} strokeOpacity="0.3" />

			{L.rows.map((row, i) => {
				const y = Y0 + i * STEP;
				return (
					<g key={row.label}>
						<text x="24" y={y + 12} {...label}>
							{row.label}
						</text>
						<Tag y={y + 8} text={row.tag} w={row.tagW} />
						{row.value === null ? (
							<g>
								<circle cx="32" cy={y + 38} r="6" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
								<circle cx="32" cy={y + 38} r="3" fill="var(--accent)" />
								<text x="46" y={y + 42} {...value}>
									{L.create}
								</text>
								<circle cx={L.selectX} cy={y + 38} r="6" fill="none" stroke={GRAY} strokeWidth="1.5" />
								<text x={L.selectX + 14} y={y + 42} {...value}>
									{L.select}
								</text>
							</g>
						) : (
							<g>
								<rect x="24" y={y + 22} width="392" height="32" rx="6" fill="var(--secondary)" stroke={GRAY} strokeOpacity="0.5" />
								<text x="36" y={y + 43} {...value}>
									{row.value}
								</text>
								<text x="402" y={y + 43} textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
									▾
								</text>
							</g>
						)}
					</g>
				);
			})}

			<line x1="8" y1="336" x2="432" y2="336" stroke={GRAY} strokeOpacity="0.3" />
			<text x="24" y="364" {...label}>
				{L.advanced}
			</text>
			<Tag y={360} text="→ ENI" w={50} />
		</svg>
	);
}
