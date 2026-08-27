import DOMPurify from 'dompurify'

const MAX_SVG_BYTES = 1_000_000

/** Sanitize untrusted SVG before it is measured, stored or inserted in the DOM. */
export function sanitizeSvg(raw: string): string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_SVG_BYTES) {
    throw new Error('SVG must be non-empty and at most 1 MB.')
  }
  const clean = DOMPurify.sanitize(raw, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover'],
  })
  const parsed = new DOMParser().parseFromString(clean, 'image/svg+xml')
  if (parsed.querySelector('parsererror') || parsed.documentElement.tagName.toLowerCase() !== 'svg') {
    throw new Error('Invalid SVG document.')
  }
  return clean
}
