// 시리즈에 앞으로 나올 글. 시리즈 상자에 링크 없이 "(준비중)"으로 보인다.
// 키는 언어별 series 값, order는 그 글의 seriesOrder가 될 번호다.
// 같은 번호의 실제 글이 생기면 실제 글이 대신 보이므로, 글을 올릴 때 해당 항목을 지운다.
// 저장소가 공개되어 있어 여기 적은 제목은 바로 공개된다.

export const upcomingSeriesPosts: Record<'en' | 'ko', Record<string, { order: number; title: string }[]>> = {
	ko: {
		'EKS 노드 운영하기': [
			{ order: 3, title: 'Kubernetes 노드 포화 - 요청값, 스케줄링, 분산' },
			{ order: 4, title: 'Kubernetes 노드 모니터링 - node exporter, kube-state-metrics, 경보' },
		],
	},
	en: {
		'Running EKS Nodes': [
			{ order: 2, title: 'EKS Nodes and Clusters - EC2, Allocatable Capacity, Node Groups' },
			{ order: 3, title: 'Kubernetes Node Saturation - Requests, Scheduling, Spread' },
			{ order: 4, title: 'Kubernetes Node Monitoring - node exporter, kube-state-metrics, Alerts' },
		],
	},
};
