const DEFAULT_SITE_URL = "https://a7-property-myanmar.ltunk36.chatgpt.site";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || DEFAULT_SITE_URL;
export const SITE_NAME = "A7 Property";

export function absoluteSiteUrl(path: string) {
  return new URL(path, `${SITE_URL}/`).toString();
}
