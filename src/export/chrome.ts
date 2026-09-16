/**
 * Persistent deck chrome — the configurable footer and the organisation logo.
 *
 * Both are rendered by Slidev *per-slide* layers (`slide-bottom.vue` /
 * `slide-top.vue`) written into the build workdir, NOT global layers: per-slide
 * layers carry the correct `$frontmatter` + `$nav` state into the PDF export
 * without needing `--per-slide` (Slidev's "wrong global layer state" caveat).
 *
 * Footer content is standardized here rather than stored on each presentation.
 * Static tokens (`{org.name}`) are pre-resolved at build time via resolveVars
 * (the SSOT in vars.ts) before the config is embedded; only `{page}`/`{total}`
 * stay LIVE and are resolved by the Vue layer at render time. Slides flagged
 * `hideChrome: true` (cover/section)
 * get no footer; the logo is the deck's header and stays on every slide, in
 * the variant matching the slide's surface.
 *
 * Pure module: builds strings only, no fs/Payload imports.
 */

import { resolveVarsWith } from './vars';

const FOOTER_LEFT_TEMPLATE = '{org.name}';
const FOOTER_RIGHT_TEMPLATE = '{page} / {total}';

export interface FooterConfig {
  enabled: boolean;
  left: string;
  right: string;
}

/** Build the one canonical footer used by exports and the admin preview. */
export function standardFooter(
  enabled: boolean,
  vars: Record<string, unknown>,
  pageNumbers = true,
): FooterConfig {
  return {
    enabled,
    left: resolveVarsWith(FOOTER_LEFT_TEMPLATE, vars),
    right: pageNumbers ? resolveVarsWith(FOOTER_RIGHT_TEMPLATE, vars) : '',
  };
}

/**
 * Apply the document template's page-number policy to an enabled footer.
 * Page numbering is standardized in the footer's right slot; templates such
 * as the one-page sales sheet retain their left footer content without
 * rendering a redundant “1 / 1”.
 */
export function applyPageNumberChrome<T extends { right?: string }>(
  footer: T | null | undefined,
  pageNumbers: boolean,
): T | null | undefined {
  if (!footer || pageNumbers) return footer;
  return { ...footer, right: '' };
}

/**
 * Organisation logo variants resolved to build-relative URLs. `light` is what a
 * light (paper) slide shows, `dark` what a dark or gradient slide shows.
 */
export interface LogoUrls {
  light: string | null;
  dark: string | null;
}

function mediaUrl(rel: unknown): string | null {
  if (!rel || typeof rel !== 'object') return null;
  const filename = (rel as { filename?: unknown }).filename;
  return typeof filename === 'string' && filename ? `/media/${filename}` : null;
}

/**
 * Pick which uploaded logo each surface shows. The colour version is the
 * natural choice on paper and the white version on dark/gradient surfaces;
 * each falls back to the closest legible variant so an organisation that only
 * uploaded one logo keeps a logo on every slide (a black logo never lands on a
 * dark surface, a white one never on paper).
 */
export function resolveLogoUrls(org: Record<string, unknown> | null | undefined): LogoUrls {
  const color = mediaUrl(org?.logo);
  const white = mediaUrl(org?.logoWhite);
  const black = mediaUrl(org?.logoBlack);
  return {
    light: color ?? black,
    dark: white ?? color,
  };
}

/** The logo URL a slide with the given surface shows, or null when none applies. */
export function pickLogoUrl(logos: LogoUrls | null | undefined, dark: boolean): string | null {
  if (!logos) return null;
  return (dark ? logos.dark : logos.light) ?? null;
}

/** True when a Slidev `class` frontmatter value marks a dark or gradient slide. */
export function isDarkSurfaceClass(classAttr: string | null | undefined): boolean {
  return String(classAttr ?? '')
    .split(/\s+/)
    .includes('k-dark');
}

export function hasAnyLogo(logos: LogoUrls | null | undefined): boolean {
  return Boolean(logos?.light || logos?.dark);
}

/**
 * The organisation's public website, or null. Only an https URL qualifies: it
 * becomes the href of the logo and of the footer's organisation name, so the
 * exported PDF carries a clickable annotation on every slide that shows chrome.
 */
export function resolveOrgUrl(org: Record<string, unknown> | null | undefined): string | null {
  const website = org?.website;
  return typeof website === 'string' && /^https:\/\/\S+$/i.test(website.trim())
    ? website.trim()
    : null;
}

/**
 * YAML-embed the footer config so the Vue layer reads it via `$slidev.configs`.
 * The left/center/right strings are expected to be ALREADY resolved for static
 * tokens by the caller (runner); the Vue layer only resolves `{page}`/`{total}`.
 * The logo variants travel as `klarcLogo: {"light": …, "dark": …}` so the
 * per-slide top layer can swap them on the slide's surface.
 */
export function buildFooterHeadmatter(
  footer: Partial<FooterConfig> | null | undefined,
  logos?: LogoUrls | null,
  orgUrl?: string | null,
): string {
  const logoLine = hasAnyLogo(logos)
    ? `klarcLogo: ${jsonInline({ light: logos?.light ?? null, dark: logos?.dark ?? null })}\n`
    : '';
  const urlLine = orgUrl ? `klarcOrgUrl: ${jsonInline(orgUrl)}\n` : '';
  if (!footer?.enabled) return `${logoLine}${urlLine}`;
  const block = {
    left: footer.left ?? '',
    right: footer.right ?? '',
  };
  return `klarcFooter: ${jsonInline(block)}\n${logoLine}${urlLine}`;
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
const orgUrl = computed(() => $slidev?.configs?.klarcOrgUrl ?? null)
const hidden = computed(() => $frontmatter?.hideChrome === true)
const dark = computed(() => String($frontmatter?.class ?? '').split(/\\s+/).includes('k-dark'))
function resolve(t: string): string {
  if (!t) return ''
  return t.replace(/\\{(page|total)\\}/g, (_m, k) => {
    if (k === 'page') return String($frontmatter?.kPage ?? '')
    return String($frontmatter?.kTotal ?? '')
  })
}
const left = computed(() => resolve(cfg.value?.left ?? ''))
const right = computed(() => resolve(cfg.value?.right ?? ''))
</script>

<template>
  <footer v-if="cfg && !hidden" class="k-slide-footer" :class="{ 'k-slide-footer--dark': dark }">
    <span><a v-if="orgUrl && left" :href="orgUrl">{{ left }}</a><template v-else>{{ left }}</template></span>
    <span class="page">{{ right }}</span>
  </footer>
</template>
`;
}

/**
 * `slide-top.vue`: renders the organisation logo top-left on every slide,
 * including cover and section dividers (`hideChrome` only drops the footer),
 * swapping the variant on the slide's surface: dark
 * and gradient slides (class `k-dark`) show the `dark` URL, paper slides the
 * `light` one. Logo URLs resolve through the build's `media` symlink. With a
 * `klarcOrgUrl` config the logo is wrapped in a link to the organisation site.
 */
export function buildLogoLayer(hasLogo: boolean): string {
  if (!hasLogo) return '';
  return `<script setup lang="ts">
import { computed } from 'vue'
import { useSlideContext } from '@slidev/client'
const { $slidev, $frontmatter } = useSlideContext()
const logos = computed(() => $slidev?.configs?.klarcLogo)
const orgUrl = computed(() => $slidev?.configs?.klarcOrgUrl ?? null)
const dark = computed(() => String($frontmatter?.class ?? '').split(/\\s+/).includes('k-dark'))
const url = computed(() => (dark.value ? logos.value?.dark : logos.value?.light) ?? null)
</script>

<template>
  <a v-if="url && orgUrl" :href="orgUrl" class="k-slide-logo-link" aria-label="Site web">
    <img :src="url" class="k-slide-logo" alt="" />
  </a>
  <img v-else-if="url" :src="url" class="k-slide-logo" alt="" />
</template>
`;
}
