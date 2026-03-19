const HTTP_URL_PATTERN = /^https?:\/\//

/**
 * Parse a raw multi-line string into an array of valid HTTP(S) URLs.
 * Trims whitespace and filters out non-URL lines.
 */
export function parseUrls(raw: string): string[] {
  return raw
    .split(/[\r\n]+/)
    .map((line) => line.trim())
    .filter((line) => HTTP_URL_PATTERN.test(line))
}
