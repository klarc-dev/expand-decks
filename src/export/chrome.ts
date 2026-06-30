/**
 * Persistent deck chrome — the configurable footer and the organisation logo.
 *
 * Both are rendered by Slidev *per-slide* layers (`slide-bottom.vue` /
 * `slide-top.vue`) written into the build workdir, NOT global layers: per-slide
 * layers carry the correct `$frontmatter` + `$nav` state into the PDF export
 * without needing `--per-slide` (Slidev's "wrong global layer state" caveat).
 *
 * Footer content is normalized: the Presentation stores TEMPLATES with
 * placeholders. Static tokens (`{org.name}`, `{title}`, `{date}`…) are
 * pre-resolved at build time via resolveVars (the SSOT in vars.ts) before the
 * config is embedded; only `{page}`/`{total}` stay LIVE and are resolved by the
 * Vue layer at render time. Slides flagged `hideChrome: true`
 * (cover/section/cta) get no footer.
 *
 * Pure module: builds strings only, no fs/Payload imports.
 */

export interface FooterConfig {
  enabled: boolean;
  left: string;
  center: string;
  right: string;
}

/**
 * YAML-embed the footer config so the Vue layer reads it via `$slidev.configs`.
 * The left/center/right strings are expected to be ALREADY resolved for static
 * tokens by the caller (runner); the Vue layer only resolves `{page}`/`{total}`.
 */
export function buildFooterHeadmatter(
  footer: Partial<FooterConfig> | null | undefined,
  logoUrl?: string | null,
): string {
  if (!footer?.enabled) return logoUrl ? `klarcLogo: ${jsonInline(logoUrl)}\n` : '';
  const block = {
    left: footer.left ?? '',
    center: footer.center ?? '',
    right: footer.right ?? '',
  };
  const logoLine = logoUrl ? `klarcLogo: ${jsonInline(logoUrl)}\n` : '';
  return `klarcFooter: ${jsonInline(block)}\n${logoLine}`;
}

/** JSON on one line — safe as a YAML scalar (YAML is a JSON superset). */
function jsonInline(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * `slide-bottom.vue`: resolves the `{page}`/`{total}` tokens (static tokens are
 * already resolved at build), hides itself on `hideChrome` slides. Returns ''
 * when no footer config is present.
 *
 * page/total come from per-slide frontmatter (`kPage`/`kTotal`) baked at build
 * time by buildSlidesMd — NOT from live nav state (`$page`/`useNav`). That makes
 * the footer counter correct in a SINGLE-PASS PDF export (no `--per-slide`),
 * where the global nav.currentPage stays stuck at 1 because every slide renders
 * at once. The mapping is deterministic (one block → one slide → one page), so a
 * baked literal is exactly the live nav value, minus the export-mode caveat.
 */
export function buildFooterLayer(hasFooter: boolean): string {
  if (!hasFooter) return '';
  return `<script setup lang="ts">
import { computed } from 'vue'
import { useSlideContext } from '@slidev/client'
const { $slidev, $frontmatter } = useSlideContext()
const cfg = computed(() => $slidev?.configs?.klarcFooter)
const hidden = computed(() => $frontmatter?.hideChrome === true)
function resolve(t: string): string {
  if (!t) return ''
  return t.replace(/\\{(page|total)\\}/g, (_m, k) => {
    if (k === 'page') return String($frontmatter?.kPage ?? '')
    return String($frontmatter?.kTotal ?? '')
  })
}
const left = computed(() => resolve(cfg.value?.left ?? ''))
const center = computed(() => resolve(cfg.value?.center ?? ''))
const right = computed(() => resolve(cfg.value?.right ?? ''))
</script>

<template>
  <footer v-if="cfg && !hidden" class="k-slide-footer">
    <span>{{ left }}</span>
    <span>{{ center }}</span>
    <span class="page">{{ right }}</span>
  </footer>
</template>
`;
}

/**
 * `global-top.vue`: renders the organisation logo top-left on every slide that
 * isn't full-bleed chrome. Logo URL resolves through the build's `media` symlink.
 */
export function buildLogoLayer(hasLogo: boolean): string {
  if (!hasLogo) return '';
  return `<script setup lang="ts">
import { computed } from 'vue'
import { useSlideContext } from '@slidev/client'
const { $slidev, $frontmatter } = useSlideContext()
const url = computed(() => $slidev?.configs?.klarcLogo)
const hidden = computed(() => $frontmatter?.hideChrome === true)
</script>

<template>
  <img v-if="url && !hidden" :src="url" class="k-slide-logo" alt="" />
</template>
`;
}
