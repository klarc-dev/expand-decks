/**
 * Persistent deck chrome — the configurable footer and the organisation logo.
 *
 * Both are rendered by Slidev *per-slide* layers (`slide-bottom.vue` /
 * `slide-top.vue`) written into the build workdir, NOT global layers: per-slide
 * layers carry the correct `$frontmatter` + `$nav` state into the PDF export
 * without needing `--per-slide` (Slidev's "wrong global layer state" caveat).
 *
 * Footer content is normalized: the Presentation stores TEMPLATES with
 * placeholders (`{org.name}`, `{title}`, `{date}`, `{page}`, `{total}`) plus
 * static vars; the Vue layer resolves them at render time so `{page}`/`{total}`
 * stay live and nothing resolved is ever persisted. Slides flagged
 * `hideChrome: true` (cover/section/cta) get no footer.
 *
 * Pure module: builds strings only, no fs/Payload imports.
 */

export interface FooterConfig {
  enabled: boolean;
  left: string;
  center: string;
  right: string;
}

export interface ChromeVars {
  'org.name': string;
  title: string;
  date: string;
}

/** YAML-embed the footer config + static vars so the Vue layer reads them via `$slidev.configs`. */
export function buildFooterHeadmatter(
  footer: Partial<FooterConfig> | null | undefined,
  vars: ChromeVars,
  logoUrl?: string | null,
): string {
  if (!footer?.enabled) return logoUrl ? `klarcLogo: ${jsonInline(logoUrl)}\n` : '';
  const block = {
    left: footer.left ?? '',
    center: footer.center ?? '',
    right: footer.right ?? '',
    vars,
  };
  const logoLine = logoUrl ? `klarcLogo: ${jsonInline(logoUrl)}\n` : '';
  return `klarcFooter: ${jsonInline(block)}\n${logoLine}`;
}

/** JSON on one line — safe as a YAML scalar (YAML is a JSON superset). */
function jsonInline(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * `slide-bottom.vue`: resolves the footer templates against live nav + static
 * vars, hides itself on `hideChrome` slides. Returns '' when no footer config
 * is present so the file isn't written.
 */
export function buildFooterLayer(hasFooter: boolean): string {
  if (!hasFooter) return '';
  return `<script setup lang="ts">
import { computed } from 'vue'
import { useNav, useSlideContext } from '@slidev/client'
const { currentPage, total } = useNav()
const { $slidev, $frontmatter } = useSlideContext()
const cfg = computed(() => $slidev?.configs?.klarcFooter)
const hidden = computed(() => $frontmatter?.hideChrome === true)
function resolve(t: string): string {
  if (!t) return ''
  const v = cfg.value?.vars ?? {}
  return t.replace(/\\{([\\w.]+)\\}/g, (_m, k) => {
    if (k === 'page') return String(currentPage.value)
    if (k === 'total') return String(total.value)
    return v[k] ?? ''
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
