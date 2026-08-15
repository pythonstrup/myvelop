---
name: gsc-index
description: Inspect blog post URLs in Google Search Console and click "Request indexing" only for pages that are not indexed yet. Triggers — "색인 요청", "서치 콘솔 등록", "구글 색인", "인덱싱 요청", "request indexing", or after deploying new posts to pull indexing forward.
---

# Search Console indexing requests

Drive the logged-in Search Console UI with Claude in Chrome and request indexing **only for URLs that are not indexed**.

APIs are not an alternative. The URL Inspection API is read-only, and the Indexing API is restricted to job postings and livestreams — using it for a regular blog violates Google policy. UI automation is the only way.

UI strings below match the **English** console. If the console shows Korean, the screens are the same but every label differs — switch the console language or match by position.

## Prerequisites

- A Chrome profile logged into the personal Google account that owns the pythonstrup.com property must be connected via Claude in Chrome.
- Verify the connection: after `tabs_context_mcp`, navigate to Search Console. If the **welcome / "Add property" page** appears instead of the property, you are on the wrong account. Use `list_connected_browsers` → AskUserQuestion to pick a browser; if no profile matches, ask the user to click Connect in that profile's extension.
- Never sign in on the user's behalf (security rule).

## Entry point (verified)

Navigate a new tab directly here — the shared company account is the default (authuser=0), so the personal account is `u/1`:

```
https://search.google.com/u/1/search-console?resource_id=sc-domain:pythonstrup.com
```

If the welcome page appears, the account is wrong. Do not use the `inspect?…&id=…` deep link — it 404s.

## Choosing target URLs — start from the not-indexed report

Do not inspect URLs one by one. First collect the not-indexed list from **Indexing > Pages**:

1. Click "Pages" in the sidebar and scroll to the "Why pages aren't indexed" table.
2. Drill into the **"Discovered – currently not indexed"** and **"Crawled – currently not indexed"** rows and read the URL lists. Only these two buckets are request targets.
3. **The report lags by a few days.** Diff against the full sitemap: any URL absent from both the indexed list and the not-indexed buckets (usually the newest posts) must be checked live with an individual URL inspection, then requested only if not indexed. Read the indexed list via the "View data about indexed pages" drilldown — the rows-per-page dropdown may ignore the first click; if so, flip the sort with the "Last crawled" header or page through with pagination.
4. Exclude:
   - The "Redirect error" and "Page with redirect" buckets — these are duplicate URLs without the trailing slash and are not request targets. (Slash-less URLs 308-redirect, so requesting them never results in indexing.)
   - Feeds such as `rss.xml` — they don't need indexing.
   - Posts missing from the sitemap (`curl -s https://pythonstrup.com/sitemap-0.xml`) — they are not deployed yet; exclude them and tell the user.

## Procedure (repeat per URL)

1. Click the URL inspection search box at the top ("Inspect any URL in …") → **wait 1 second** (focus sometimes doesn't take) → type the URL → Enter. If a previous value remains, `cmd+a` then type — but only right after clicking, because `cmd+a` without focus selects the whole page.
2. Wait 10 seconds, then screenshot and confirm the inspected URL at the top of the page changed to the one you just typed. If not, the input was dropped — redo step 1.
3. Judge the result:
   - **"URL is on Google"** → already indexed. Click nothing and skip. (Quota preservation — the core rule of this skill)
   - **"URL is not on Google"** → click the "Request indexing" link on the right → wait about 30 seconds → when the "Indexing requested" dialog appears, close it (the "Got it" / "Close" button).
   - **"Redirect error"** → the URL form is wrong (check the trailing slash). Do not request; note it in the report.
4. **If a quota-exceeded dialog appears, stop immediately** and report how far you got. The request quota is roughly 10 per property per day and resets the next day.

## Reporting

Summarize as a table: URL / result (already indexed · requested · error) / notes. For URLs left over due to quota, tell the user to continue the next day. Close the tabs you created when done.
