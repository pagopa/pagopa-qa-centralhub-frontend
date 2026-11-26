/** Query parameter that selects a Docs & Decks item when the page is opened. */
export const DOC_ITEM_PARAM = "item";

/** Request header carrying the path (with query) the person asked for, set by the proxy, read by the portal layout. */
export const RETURN_TO_HEADER = "x-return-to";

/** Shareable address of a Docs & Decks item: the hub opens the section on that item. */
export function docShareUrl(origin: string, itemId: string): string {
  return `${origin}/docs?${DOC_ITEM_PARAM}=${encodeURIComponent(itemId)}`;
}

/**
 * Accepts only a path inside this app, so the login cannot be used as an open redirect.
 * Anything else (absolute URL, protocol-relative `//host`, backslash tricks) falls back to "/".
 */
export function safeCallbackUrl(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/";
  return raw;
}
