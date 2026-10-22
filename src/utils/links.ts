/**
 * Links that lead to a different website open in a new tab, so visitors never lose their place on
 * this site. The rules live here so templates and the runtime safety net in Layout.astro agree.
 */

/** Attributes for a link that opens in a new tab. `noopener` stops the new page from controlling
 *  this one, and `noreferrer` keeps this site's address from being sent along. */
export const EXTERNAL_LINK_ATTRS = { target: '_blank', rel: 'noopener noreferrer' } as const;

/** Read by screen readers after the link text, so nobody is surprised by a new tab. */
export const NEW_TAB_HINT = ' (opens in a new tab)';

/**
 * True when `href` leads to a different website: an absolute http(s) address, or "//host/...",
 * on another origin. Relative links, "#sections", "mailto:" and "tel:" are not external.
 * Pass this site's origin so that absolute links back to it stay in the same tab.
 */
export function isExternalUrl(href: string, currentOrigin?: string): boolean {
  if (!/^(https?:)?\/\//i.test(href)) return false;
  if (!currentOrigin) return true;
  try {
    return new URL(href, currentOrigin).origin !== new URL(currentOrigin).origin;
  } catch {
    return true;
  }
}
