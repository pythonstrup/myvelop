// @ts-check

import { unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";
import { readdirSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { tagSlug } from "./src/lib/slug.ts";

// Keep delayed Korean subsets from replacing already-rendered text.
/** @param {import("postcss").AtRule} rule */
function useOptionalPretendard(rule) {
  let isPretendard = false;
  rule.walkDecls("font-family", (declaration) => {
    isPretendard ||= declaration.value.includes("Pretendard Variable");
  });
  if (!isPretendard) return;
  rule.walkDecls("font-display", (declaration) => {
    declaration.value = "optional";
  });
}

const optionalPretendard = {
  postcssPlugin: "pretendard-font-display",
  AtRule: { "font-face": useOptionalPretendard },
};

// Tables need a scroll container to span full width without breaking mobile.
function rehypeWrapTables() {
  /** @param {{ tagName?: string, children?: any[] }} node */
  return function walk(node) {
    if (!node.children) return;
    node.children = node.children.map((child) => {
      walk(child);
      if (child.tagName !== "table") return child;
      return {
        type: "element",
        tagName: "div",
        properties: { className: ["table-wrap"] },
        children: [child],
      };
    });
  };
}

// [[제목]]과 [[제목|별칭]]을 노트 링크로 바꾼다. 같은 이름의 노트 파일이 없으면 일반 텍스트로 두어
// verify-build의 내부 링크 검사에 걸리지 않게 한다. 사용법은 src/content/notes/README.md에 있다.
const NOTES_DIR = fileURLToPath(new URL("./src/content/notes/ko", import.meta.url));
const WIKILINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

function remarkWikilinks() {
  /** @param {any} tree @param {{ path?: string }} file */
  return (tree, file) => {
    if (file.path && !file.path.includes("/content/notes/")) return;
    // ponytail: 노트 파일마다 디렉토리를 다시 읽는다. 노트 수백 개까지는 비용이 없다.
    const titles = new Set(
      readdirSync(NOTES_DIR)
        .filter((name) => name.endsWith(".md"))
        .map((name) => basename(name, ".md")),
    );
    /** @param {any} node */
    const walk = (node) => {
      if (!node.children) return;
      node.children = node.children.flatMap((/** @type {any} */ child) => {
        if (child.type !== "text" || node.type === "link") {
          walk(child);
          return [child];
        }
        const parts = [];
        let last = 0;
        for (const match of child.value.matchAll(WIKILINK)) {
          const [raw, title, alias] = match;
          const target = title.trim();
          const label = (alias ?? title).trim();
          if (match.index > last) parts.push({ type: "text", value: child.value.slice(last, match.index) });
          parts.push(
            titles.has(target)
              ? { type: "link", url: `/ko/notes/${tagSlug(target)}/`, children: [{ type: "text", value: label }] }
              : { type: "text", value: label },
          );
          last = match.index + raw.length;
        }
        if (parts.length === 0) return [child];
        if (last < child.value.length) parts.push({ type: "text", value: child.value.slice(last) });
        return parts;
      });
    };
    walk(tree);
  };
}

// https://astro.build/config
export default defineConfig({
  site: "https://pythonstrup.com",
  i18n: {
    locales: ["en", "ko"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    mdx(),
    react(),
    sitemap({
      filter: (page) => !["/404/", "/ko/404/"].includes(new URL(page).pathname),
    }),
  ],

  image: {
    layout: "constrained",
  },

  markdown: {
    processor: unified({
      remarkPlugins: [remarkWikilinks],
      rehypePlugins: [rehypeWrapTables],
    }),
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark-high-contrast",
      },
      wrap: true,
    },
  },

  vite: {
    css: {
      postcss: {
        plugins: [optionalPretendard],
      },
    },
    plugins: [tailwindcss()],
  },
});
