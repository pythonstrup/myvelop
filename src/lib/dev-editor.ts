// 개발 서버에서만 쓰는 글 편집 페이지(/_edit/). 왼쪽에서 원문을 고치고 오른쪽에서 실제 글 화면을 본다.
// 운영 빌드에는 아무것도 붙지 않는다. 편집 화면은 src/lib/dev-editor.html 에 있다.
//
// 지키는 경계
// - `astro dev` 일 때만 서버 처리와 줄 번호를 켠다.
// - 이 PC 자신(루프백)이 localhost 이름으로 보낸 요청만 받는다. 다른 기기와 DNS 리바인딩을 막는다.
// - 저장은 같은 출처(Origin)와 서버를 띄울 때 만든 토큰이 맞아야 받는다.
// - src/content/blog 아래 이미 있는 .md, .mdx 만 고친다. 디스크의 파일이 그새 바뀌었으면 덮어쓰지 않는다.
import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile, realpath, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import type { Plugin } from "vite";

const ENABLED = "DEV_EDITOR_ENABLED";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const LOOPBACK_ADDRS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const MAX_BODY = 4 * 1024 * 1024;

type MdNode = {
	type: string;
	children?: MdNode[];
	position?: { start: { line: number } };
	data?: { hProperties?: Record<string, unknown> };
	name?: string;
	attributes?: { type: string; name: string; value: string | null }[];
};

// 원문 줄로 돌아갈 수 있게 블록마다 data-src-line 을 단다.
// ponytail: MDX 에만 단다. .md 는 렌더 결과가 콘텐츠 캐시에 남아 다음 빌드에 섞일 수 있어서다.
const TAGGED = new Set(["paragraph", "heading", "list", "listItem", "table", "tableRow", "blockquote", "code"]);
const CONTAINERS = new Set(["list", "listItem", "blockquote", "table"]);

export function remarkSourceLines() {
	return (tree: MdNode, file: { path?: string }) => {
		if (process.env[ENABLED] !== "1" || !file.path?.endsWith(".mdx")) return;
		const walk = (parent: MdNode) => {
			if (!parent.children) return;
			parent.children = parent.children.flatMap((node) => {
				const line = node.position?.start.line;
				if (!line) return [node];
				// 그림 같은 컴포넌트에는 속성을 넘길 수 없으니 바로 앞에 보이지 않는 표지를 둔다.
				if (node.type === "mdxJsxFlowElement") return [marker(line), node];
				if (TAGGED.has(node.type)) {
					node.data = { ...node.data, hProperties: { ...node.data?.hProperties, dataSrcLine: line } };
				}
				if (CONTAINERS.has(node.type)) walk(node);
				return [node];
			});
		};
		walk(tree);
	};
}

function marker(line: number): MdNode {
	return {
		type: "mdxJsxFlowElement",
		name: "span",
		attributes: [
			{ type: "mdxJsxAttribute", name: "data-src-line", value: String(line) },
			{ type: "mdxJsxAttribute", name: "hidden", value: null },
		],
		children: [],
	};
}

export function devEditor(): AstroIntegration {
	return {
		name: "dev-editor",
		hooks: {
			"astro:config:setup": ({ command, config, updateConfig, logger }) => {
				if (command !== "dev") return;
				process.env[ENABLED] = "1";
				updateConfig({ vite: { plugins: [editorPlugin(fileURLToPath(config.root))] } });
				logger.info("글 편집 페이지: /_edit/");
			},
		},
	};
}

function editorPlugin(root: string): Plugin {
	const token = randomUUID();
	const blogDir = resolve(root, "src/content/blog");
	const pagePath = resolve(root, "src/lib/dev-editor.html");

	async function blogFile(rel: unknown): Promise<string> {
		if (typeof rel !== "string" || !/\.mdx?$/.test(rel)) throw new HttpError(400, "글 파일이 아닙니다");
		const abs = await realpath(resolve(root, rel)).catch(() => {
			throw new HttpError(404, "파일이 없습니다");
		});
		if (!abs.startsWith(`${await realpath(blogDir)}${sep}`)) throw new HttpError(400, "글 폴더 밖입니다");
		return abs;
	}

	async function handle(req: IncomingMessage, res: ServerResponse) {
		const host = req.headers.host ?? "";
		if (!LOOPBACK_HOSTS.has(host.replace(/:\d+$/, "")) || !LOOPBACK_ADDRS.has(req.socket.remoteAddress ?? "")) {
			throw new HttpError(403, "이 PC 에서만 쓸 수 있습니다");
		}
		const url = new URL(req.url ?? "/", `http://${host}`);

		if (req.method === "GET" && url.pathname === "/") {
			const html = (await readFile(pagePath, "utf8")).replace("__DEV_EDITOR_TOKEN__", token);
			return send(res, 200, html, "text/html; charset=utf-8");
		}
		if (req.method === "GET" && url.pathname === "/api/list") {
			const files = (await readdir(blogDir, { recursive: true }))
				.filter((name) => /\.mdx?$/.test(name))
				.map((name) => relative(root, join(blogDir, name)).split(sep).join("/"))
				.sort();
			return sendJson(res, 200, { files });
		}
		if (req.method === "GET" && url.pathname === "/api/source") {
			const abs = await blogFile(url.searchParams.get("file"));
			const text = await readFile(abs, "utf8");
			return sendJson(res, 200, { text, hash: hashOf(text), pageUrl: pageUrlOf(relative(blogDir, abs)) });
		}
		if (req.method === "POST" && url.pathname === "/api/save") {
			if (req.headers.origin !== `http://${host}` || req.headers["x-dev-editor-token"] !== token) {
				throw new HttpError(403, "출처나 토큰이 맞지 않습니다");
			}
			if (!req.headers["content-type"]?.startsWith("application/json")) throw new HttpError(415, "JSON 만 받습니다");
			const body = JSON.parse(await readBody(req));
			if (typeof body.text !== "string" || typeof body.baseHash !== "string") throw new HttpError(400, "본문이 잘못됐습니다");
			const abs = await blogFile(body.file);
			if (hashOf(await readFile(abs, "utf8")) !== body.baseHash) {
				throw new HttpError(409, "편집을 시작한 뒤 디스크의 파일이 바뀌었습니다. 다시 불러오세요");
			}
			await writeFile(abs, body.text);
			return sendJson(res, 200, { hash: hashOf(body.text) });
		}
		throw new HttpError(404, "없는 경로입니다");
	}

	return {
		name: "dev-editor",
		configureServer(server) {
			server.middlewares.use("/_edit", (req, res) => {
				handle(req, res).catch((error: unknown) => {
					const status = error instanceof HttpError ? error.status : 500;
					if (status === 500) server.config.logger.error(`[dev-editor] ${String(error)}`);
					sendJson(res, status, { error: error instanceof Error ? error.message : String(error) });
				});
			});
		},
	};
}

class HttpError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
	}
}

// ko/foo.mdx → /ko/blog/foo/, en/foo.md → /blog/foo/ (src/pages/{ko/,}blog/[...slug].astro 와 같은 규칙)
function pageUrlOf(relToBlog: string): string {
	const id = relToBlog.split(sep).join("/").replace(/\.mdx?$/, "");
	if (id.startsWith("ko/")) return `/ko/blog/${id.slice(3)}/`;
	if (id.startsWith("en/")) return `/blog/${id.slice(3)}/`;
	throw new HttpError(400, `언어 폴더가 없는 글입니다: ${id}`);
}

function hashOf(text: string): string {
	return createHash("sha256").update(text).digest("hex");
}

function readBody(req: IncomingMessage): Promise<string> {
	return new Promise((done, failed) => {
		const chunks: Buffer[] = [];
		let size = 0;
		req.on("data", (chunk: Buffer) => {
			size += chunk.length;
			if (size > MAX_BODY) failed(new HttpError(413, "본문이 너무 큽니다"));
			else chunks.push(chunk);
		});
		req.on("end", () => done(Buffer.concat(chunks).toString("utf8")));
		req.on("error", failed);
	});
}

function send(res: ServerResponse, status: number, body: string, type: string) {
	res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
	res.end(body);
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
	send(res, status, JSON.stringify(data), "application/json; charset=utf-8");
}
