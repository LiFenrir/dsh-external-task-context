/**
 * UTF-8 bounded text for projected prompt and answer fields.
 *
 * The projection state is persisted as JSON, so an unbounded model prompt or
 * child closing message would inflate the projection cache without adding
 * information a sidebar can show. The bound is expressed in bytes and never
 * splits a UTF-8 sequence.
 */

/** Maximum UTF-8 size of one projected prompt, answer, or summary. */
export const MAX_CONTEXT_TEXT_BYTES = 64 * 1024

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/**
 * Bound one text value to {@link MAX_CONTEXT_TEXT_BYTES} without splitting a
 * code point.
 *
 * The caller adds its own localized truncation notice; the returned prefix is
 * the original text only, with no marker appended.
 * @param text - the full text.
 * @returns the original text when it fits, otherwise a decoded prefix and `truncated: true`.
 */
export function boundText(text: string): { text: string; truncated: boolean } {
  const bytes = encoder.encode(text)
  if (bytes.byteLength <= MAX_CONTEXT_TEXT_BYTES) return { text, truncated: false }

  // A byte inside a multibyte sequence has the 10xxxxxx prefix; walk back to
  // the leading byte so the slice decodes as well-formed UTF-8.
  let prefixBytes = MAX_CONTEXT_TEXT_BYTES
  while (prefixBytes > 0 && ((bytes[prefixBytes] as number) & 0b1100_0000) === 0b1000_0000) {
    prefixBytes -= 1
  }
  return { text: decoder.decode(bytes.subarray(0, prefixBytes)), truncated: true }
}
