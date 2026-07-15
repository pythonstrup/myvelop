// @ts-check

import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

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
