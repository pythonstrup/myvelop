// Reading path for the "Running LLM APIs" / "LLM API 운영" series.
// Step blurbs only restate what those posts say. The build checks that the
// slugs, series name, and seriesOrder still match. mcp-proxy-memory is not
// in the series, so it stays beside the path instead of becoming a step.

export const LLM_GATEWAY_GUIDE_PATH = '/guides/llm-gateway/';

type Copy = { en: string; ko: string };

export interface GuideStep {
	slug: string;
	blurb: Copy;
}

export const llmGatewayGuide: {
	path: string;
	series: Copy;
	title: Copy;
	description: Copy;
	lead: Copy;
	orderNote: Copy;
	steps: GuideStep[];
	related: { slug: string; heading: Copy; note: Copy; blurb: Copy };
} = {
	path: LLM_GATEWAY_GUIDE_PATH,
	series: { en: 'Running LLM APIs', ko: 'LLM API 운영' },
	title: {
		en: 'LLM gateway and proxy operations',
		ko: 'LLM 게이트웨이와 프록시 운영',
	},
	description: {
		en: 'Reading order for the Running LLM APIs series: choosing an LLM gateway, monitoring a LiteLLM proxy, when prompt caching pays off, and handing small judgments to Jev.',
		ko: '연재 「LLM API 운영」을 읽는 순서다. LLM 게이트웨이를 고르고, LiteLLM 프록시를 모니터링하고, 프롬프트 캐시가 언제 이득인지 따지고, 작은 판단을 Jev에 맡긴다.',
	},
	lead: {
		en: 'Four posts from the series Running LLM APIs. The first asks what an LLM gateway takes on when service code stops calling providers itself. The second runs a LiteLLM proxy and records what the Admin UI shows, and what shows up only with Grafana and Langfuse. The third separates prompt caching from a response cache and asks when the cache pays for itself. The fourth hands an agent\'s small judgments to Jev, a model that returns probabilities instead of text, and asks when it should and should not be used.',
		ko: '연재 「LLM API 운영」의 글 네 편이다. 첫 글은 서비스 코드가 프로바이더를 직접 부르지 않을 때 LLM 게이트웨이가 무엇을 맡는지를 본다. 둘째는 LiteLLM 프록시를 띄워, Admin UI가 보여주는 것과 Grafana와 Langfuse가 있어야 보이는 것을 적는다. 셋째는 프롬프트 캐시와 응답 캐시를 가르고, 캐시가 언제 이득인지 따진다. 넷째는 에이전트의 작은 판단을 글 대신 확률을 돌려주는 Jev에 맡기고, 언제 쓰고 언제 쓰지 말아야 하는지 따진다.',
	},
	orderNote: {
		en: 'The number is the reading order. The date is only when the post was published.',
		ko: '번호가 읽는 순서다. 날짜는 그 글이 발행된 날이다.',
	},
	steps: [
		{
			slug: 'llm-gateway',
			blurb: {
				en: 'Calling the OpenAI, Anthropic, and Gemini APIs from service code repeats format differences, failover, and key and cost management in every service. The post follows how a gateway pulls that into one layer, what you give up for it, and how OpenRouter, LiteLLM, and Cloudflare AI Gateway compare on latency, fallbacks, response caching, and per-team budgets. The comparison uses official docs and published measurements. Cloudflare added 26–37 ms to the first token. OpenRouter added a little over 200 ms.',
				ko: 'OpenAI, Anthropic, Gemini API를 서비스 코드에서 직접 부르면 형식 차이, 장애 대응, 키와 비용 관리가 서비스마다 반복된다. 게이트웨이가 그 반복을 한 계층으로 모을 때 무엇을 내주는지 짚고, OpenRouter, LiteLLM, Cloudflare AI Gateway를 지연, fallback, 응답 캐시, 팀별 예산으로 비교한다. 비교는 공식 문서와 공개된 측정을 기준으로 했다. 첫 토큰까지는 Cloudflare가 26~37ms, OpenRouter가 200ms 남짓 더 걸렸다.',
			},
		},
		{
			slug: 'litellm-proxy-monitoring',
			blurb: {
				en: 'A LiteLLM proxy with Postgres attached shows who spent how much. Failure rate, latency, and whether fallback actually happens need Prometheus and Grafana before they show up as time series and alerts. Request bodies, sessions, traces, and scores need a tracing tool such as Langfuse. The post runs the same mock traffic through all three for 14 minutes and writes down what each screen shows.',
				ko: 'Postgres를 붙인 LiteLLM 프록시는 누가 얼마나 썼는지를 보여준다. 실패율, 지연, fallback이 실제로 일어나는지는 Prometheus와 Grafana가 있어야 시계열과 알림으로 보인다. 요청 본문, 세션, 트레이스, 점수는 Langfuse 같은 트레이싱 도구가 있어야 보인다. 같은 mock 트래픽을 14분간 흘리고 각 화면이 무엇을 보여주는지 적었다.',
			},
		},
		{
			slug: 'llm-prompt-caching',
			blurb: {
				en: 'A cache hit on an AI API does not hand back a stored answer. It reuses the KV computed for the start of the input. The post works out which requests hit, how high the hit rate has to be to break even once write costs are counted, and compares an agent with a chatbot using Claude Code measurements and production logs from a Slack chatbot. In the agent sessions, 97.6% of input tokens were cache reads.',
				ko: 'AI API의 캐시 히트는 저장해 둔 답을 돌려주는 응답 캐시가 아니다. 입력 앞부분을 계산해 둔 KV를 다시 쓴다. 어떤 요청이 적중하는지, 쓰기 비용을 감안하면 적중률이 얼마여야 본전인지 따지고, Claude Code 실측과 슬랙 챗봇 운영 로그로 에이전트와 챗봇을 비교한다. 에이전트 세션은 입력의 97.6%가 캐시 읽기였다.',
			},
		},
		{
			slug: 'jev-small-judgments',
			blurb: {
				en: 'Handing an agent\'s small judgments to Haiku is still expensive, not because of the unit price but because the model writes its answers as text. The post asks Jev, a System One model that returns probabilities instead of text, narrow questions bundled in one request, then draws bands on the returned probabilities so code handles the sure answers and a person or a larger model takes the unsure ones. It also shows how to call Jev through a LiteLLM gateway. With the same 20 judgments on one made-up resume, Jev was 61 times faster and 14 times cheaper than Haiku with thinking.',
				ko: '에이전트의 작은 판단을 Haiku에 맡겨도 비싼 이유는 단가가 아니라 답을 글로 쓰기 때문이다. 글 대신 확률을 돌려주는 System One 모델 Jev에 좁은 질문을 한 요청에 묶어 묻고, 돌아온 확률로 구간을 나눠 확실한 답은 코드가, 애매한 답은 사람이나 큰 모델이 맡게 한다. LiteLLM 게이트웨이로 부르는 법도 적었다. 지어낸 이력서 한 장에 같은 판단 20개를 시키자 생각하는 Haiku보다 61배 빠르고 14배 쌌다.',
			},
		},
	],
	related: {
		slug: 'mcp-proxy-memory',
		heading: { en: 'Beside the series', ko: '연재 옆에' },
		note: {
			en: 'This post is not part of the series. It is about a different kind of proxy, so it sits next to the path.',
			ko: '이 글은 연재에 들어 있지 않다. 다른 종류의 프록시라 읽기 순서 옆에 둔다.',
		},
		blurb: {
			en: 'stdio MCP servers were duplicated for every Claude Code session: 169 processes and 6.7GB of RSS. The post builds a proxy so those sessions share one process, then asks whether the servers still need to be MCP at all.',
			ko: '세션마다 복제되는 stdio MCP 서버가 프로세스 169개, 메모리 6.7GB를 차지했다. 프로세스를 하나로 공유하는 프록시를 만들었고, 끝에 가서는 이 서버들이 지금도 MCP여야 하는지를 묻는다.',
		},
	},
};
