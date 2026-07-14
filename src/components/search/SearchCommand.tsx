import { useEffect, useState } from "react";

import "../../styles/ui.css";

import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";

type Language = "en" | "ko";
type SearchStatus = "idle" | "loading" | "ready" | "error";

type PagefindSubResult = {
	title: string;
	url: string;
	excerpt: string;
};

type PagefindData = {
	url: string;
	meta: { title?: string };
	excerpt: string;
	sub_results?: PagefindSubResult[];
};

type PagefindResult = {
	id: string;
	data: () => Promise<PagefindData>;
};

type PagefindResponse = {
	results: PagefindResult[];
};

type PagefindApi = {
	init: () => Promise<void>;
	debouncedSearch: (
		term: string,
		options?: Record<string, never>,
		debounceTimeoutMs?: number,
	) => Promise<PagefindResponse | null>;
};

const PAGE_SIZE = 5;
const PAGEFIND_URL = "/pagefind/pagefind.js";
let pagefindPromise: Promise<PagefindApi> | undefined;

const copy = {
	en: {
		label: "Search posts",
		placeholder: "Search posts…",
		hint: "Start typing to search blog posts.",
		loading: "Searching…",
		empty: (query: string) => `No results for “${query}”.`,
		error: "Search could not be loaded. Please try again.",
		results: (count: number) => `${count} ${count === 1 ? "post" : "posts"} found.`,
		more: "Load more",
	},
	ko: {
		label: "블로그 글 검색",
		placeholder: "검색어를 입력하세요",
		hint: "검색어를 입력하면 블로그 글을 찾습니다.",
		loading: "검색 중…",
		empty: (query: string) => `“${query}”에 대한 결과가 없습니다.`,
		error: "검색을 불러오지 못했습니다. 다시 시도해 주세요.",
		results: (count: number) => `${count}개의 글을 찾았습니다.`,
		more: "더 보기",
	},
};

function loadPagefind() {
	if (!pagefindPromise) {
		pagefindPromise = import(/* @vite-ignore */ PAGEFIND_URL)
			.then(async (module: PagefindApi) => {
				await module.init();
				return module;
			})
			.catch((error) => {
				pagefindPromise = undefined;
				throw error;
			});
	}

	return pagefindPromise;
}

export default function SearchCommand({ lang }: { lang: Language }) {
	const text = copy[lang];
	const [query, setQuery] = useState("");
	const [status, setStatus] = useState<SearchStatus>("idle");
	const [resultRefs, setResultRefs] = useState<PagefindResult[]>([]);
	const [pages, setPages] = useState<PagefindData[]>([]);
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
	const [loadingMore, setLoadingMore] = useState(false);

	useEffect(() => {
		const term = query.trim();
		let active = true;

		setResultRefs([]);
		setPages([]);
		setVisibleCount(PAGE_SIZE);
		setLoadingMore(false);

		if (!term) {
			setStatus("idle");
			return () => {
				active = false;
			};
		}

		setStatus("loading");
		loadPagefind()
			.then((pagefind) => pagefind.debouncedSearch(term, {}, 180))
			.then((response) => {
				if (!active || !response) return;
				setResultRefs(response.results);
				if (response.results.length === 0) setStatus("ready");
			})
			.catch(() => {
				if (active) setStatus("error");
			});

		return () => {
			active = false;
		};
	}, [query]);

	useEffect(() => {
		if (resultRefs.length === 0) return;
		let active = true;
		// Fetch only the newly revealed slice and append; "Load more" keeps
		// already-loaded pages instead of re-fetching every visible result.
		// ponytail: reads pages.length from closure (not a dep) on purpose —
		// adding `pages` would re-run and re-append forever.
		const start = pages.length;
		if (start >= visibleCount) return;
		setLoadingMore(start > 0);

		Promise.allSettled(resultRefs.slice(start, visibleCount).map((result) => result.data()))
			.then((settled) => {
				if (!active) return;
				const loaded = settled
					.filter((s): s is PromiseFulfilledResult<PagefindData> => s.status === "fulfilled")
					.map((s) => s.value);
				// One failed data() no longer discards the whole set; only a total
				// failure on the first page surfaces the error state.
				if (start === 0 && loaded.length === 0) {
					setStatus("error");
					return;
				}
				setPages((prev) => [...prev, ...loaded]);
				setStatus("ready");
			})
			.finally(() => {
				if (active) setLoadingMore(false);
			});

		return () => {
			active = false;
		};
	}, [resultRefs, visibleCount]);

	return (
		<div role="search" aria-label={text.label}>
			<Command label={text.label} shouldFilter={false} loop>
				<CommandInput
					value={query}
					onValueChange={setQuery}
					onFocus={() => void loadPagefind().catch(() => setStatus("error"))}
					placeholder={text.placeholder}
					aria-label={text.label}
					autoCapitalize="none"
					enterKeyHint="search"
				/>
				<CommandList aria-busy={status === "loading" || loadingMore}>
					{status === "idle" && (
						<p className="m-0 px-4 py-10 text-center text-sm text-muted-foreground">{text.hint}</p>
					)}
					{status === "loading" && pages.length === 0 && (
						<p role="status" className="m-0 px-4 py-10 text-center text-sm text-muted-foreground">
							{text.loading}
						</p>
					)}
					{status === "error" && (
						<p role="alert" className="m-0 px-4 py-10 text-center text-sm text-destructive">
							{text.error}
						</p>
					)}
					{status === "ready" && resultRefs.length === 0 && (
						<CommandEmpty>{text.empty(query.trim())}</CommandEmpty>
					)}
					{pages.map((page) => {
						const matches = page.sub_results?.length
							? page.sub_results
							: [
									{
										title: page.meta.title ?? page.url,
										url: page.url,
										excerpt: page.excerpt,
									},
								];

						return (
							<CommandGroup key={page.url} heading={page.meta.title ?? page.url}>
								{matches.map((match, index) => (
									<CommandItem
										key={`${match.url}:${index}`}
										value={`${page.url}:${match.url}:${index}`}
										onSelect={() => window.location.assign(match.url)}
									>
										<div className="min-w-0">
											<p className="m-0 font-medium text-foreground">{match.title}</p>
											{match.excerpt && (
												<p
													className="mt-1 mb-0 line-clamp-2 text-sm leading-6 text-muted-foreground"
													// excerpt is Pagefind-generated HTML from our own build-time
													// indexed content (contains <mark> highlights), not user input.
													dangerouslySetInnerHTML={{ __html: match.excerpt }}
												/>
											)}
										</div>
									</CommandItem>
								))}
							</CommandGroup>
						);
					})}
				</CommandList>

				{status === "ready" && resultRefs.length > 0 && (
					<div className="flex items-center justify-between gap-4 border-t px-4 py-3">
						<p aria-live="polite" className="m-0 text-sm text-muted-foreground">
							{text.results(resultRefs.length)}
						</p>
						{visibleCount < resultRefs.length && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={loadingMore}
								onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
							>
								{loadingMore ? text.loading : text.more}
							</Button>
						)}
					</div>
				)}
			</Command>
		</div>
	);
}
