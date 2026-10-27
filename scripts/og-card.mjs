import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

// 글마다 같은 틀의 OG 카드(1200×630 PNG)를 헤드리스 Chrome으로 찍는다.
// 위치와 색은 기존 og.png에서 잰 값이고, 글꼴은 macOS 시스템 글꼴(SF Pro) 기준이다.
const usage = 'node scripts/og-card.mjs --title "How OCR Works" --keywords "detection · recognition · masking · vlm" --out src/assets/blog/<slug>/og.png';

const root = fileURLToPath(new URL('../', import.meta.url));
const { values } = parseArgs({
	options: {
		title: { type: 'string' },
		keywords: { type: 'string' },
		out: { type: 'string' },
		chrome: { type: 'string' },
	},
});
if (!values.title || !values.keywords || !values.out) {
	console.error(`usage: ${usage}`);
	process.exit(1);
}

const chrome = values.chrome ?? process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const logo = await readFile(join(root, 'public/favicon.svg'), 'utf8');
const escape = (text) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
	html, body { margin: 0; }
	body { width: 1200px; height: 630px; position: relative; overflow: hidden;
		font-family: system-ui, -apple-system, sans-serif;
		background:
			radial-gradient(circle at 1080px 60px, rgba(200, 206, 255, 1) 0, rgba(200, 206, 255, 0) 420px),
			linear-gradient(160deg, #ffffff 0%, #f7f8ff 55%, #eef1ff 100%); }
	.logo { position: absolute; left: 72px; top: 70px; width: 96px; height: 96px; }
	.logo svg { display: block; width: 96px; height: 96px; }
	h1 { position: absolute; left: 72px; top: 262px; margin: 0; font-size: 89px; font-weight: 700; letter-spacing: -2.2px; color: rgb(15, 18, 25); line-height: 1; white-space: nowrap; }
	.bar { position: absolute; left: 72px; top: 386px; width: 88px; height: 8px; border-radius: 4px; background: #2337ff; }
	.kw { position: absolute; left: 72px; top: 432px; font-size: 35px; color: #2337ff; line-height: 1.25; white-space: nowrap; }
	.domain { position: absolute; left: 72px; top: 534px; font-size: 23.5px; font-weight: 700; letter-spacing: 2px; color: rgb(96, 115, 159); line-height: 1; }
</style></head><body>
	<div class="logo">${logo}</div>
	<h1>${escape(values.title)}</h1>
	<div class="bar"></div>
	<div class="kw">${escape(values.keywords)}</div>
	<div class="domain">PYTHONSTRUP.COM</div>
</body></html>`;

// 제목이나 키워드가 오른쪽 여백(72px)을 넘으면 아랫변을 고정한 채 글자를 줄인다.
const fit = `(async () => {
	await document.fonts.ready;
	const shrink = (el, min, spacing) => {
		const size = parseFloat(getComputedStyle(el).fontSize);
		const top = parseFloat(getComputedStyle(el).top);
		const height = el.offsetHeight;
		let next = size;
		while (el.scrollWidth > 1056 && next > min) {
			next -= 1;
			el.style.fontSize = next + 'px';
			if (spacing) el.style.letterSpacing = (spacing * next) / size + 'px';
		}
		el.style.top = top + height - el.offsetHeight + 'px';
		return el.scrollWidth > 1056 ? null : next;
	};
	return { title: shrink(document.querySelector('h1'), 60, -2.2), keywords: shrink(document.querySelector('.kw'), 24, 0) };
})()`;

const profile = await mkdtemp(join(tmpdir(), 'og-card-'));
const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--force-device-scale-factor=1', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
// Chrome이 프로필에 쓰기를 마치고 끝난 뒤에 지워야 디렉터리가 남지 않는다. 실행에 실패해도 error로 끝난다.
const exited = new Promise((r) => {
	proc.once('exit', r);
	proc.once('error', r);
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
	let port;
	for (let i = 0; i < 100 && !port; i++) {
		await sleep(100);
		port = await readFile(join(profile, 'DevToolsActivePort'), 'utf8').then((s) => s.split('\n')[0], () => undefined);
	}
	if (!port) throw new Error(`Chrome did not start: ${chrome}`);
	const page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page');

	const ws = new WebSocket(page.webSocketDebuggerUrl);
	await new Promise((r, reject) => {
		ws.addEventListener('open', r);
		ws.addEventListener('error', reject);
	});
	let id = 0;
	const pending = new Map();
	const listeners = new Map();
	ws.addEventListener('message', (event) => {
		const message = JSON.parse(event.data);
		if (message.id) pending.get(message.id)?.(message);
		else listeners.get(message.method)?.(message.params);
	});
	const send = (method, params = {}) =>
		new Promise((r, reject) => {
			const current = ++id;
			pending.set(current, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : r(m.result)));
			ws.send(JSON.stringify({ id: current, method, params }));
		});

	await send('Page.enable');
	await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
	const loaded = new Promise((r) => listeners.set('Page.loadEventFired', r));
	await send('Page.navigate', { url: 'data:text/html;base64,' + Buffer.from(html).toString('base64') });
	await loaded;
	const sizes = (await send('Runtime.evaluate', { expression: fit, returnByValue: true, awaitPromise: true })).result.value;
	for (const [name, size] of Object.entries(sizes)) {
		if (size === null) throw new Error(`${name} is too long for one line. Shorten it.`);
	}
	const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 } });
	ws.close();

	const out = resolve(values.out);
	await writeFile(out, Buffer.from(shot.data, 'base64'));
	console.log(`${out} (title ${sizes.title}px, keywords ${sizes.keywords}px)`);
} finally {
	proc.kill();
	await exited;
	await rm(profile, { recursive: true, force: true });
}
