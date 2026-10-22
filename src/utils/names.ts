/**
 * The name shown big in the hero: the nickname plus the last word of the full name, e.g.
 * "Jan Adrian Manzanero" with the nickname "Jam" becomes "Jam Manzanero". The full name in
 * site.ts is left alone, since the page title, footer and photo description still use it.
 */
export function shortName(site: { name: string; nickname: string }): string {
  const lastName = site.name.trim().split(/\s+/).at(-1) ?? '';
  return `${site.nickname.trim()} ${lastName}`.trim();
}
