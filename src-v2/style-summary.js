const URL_PATTERN = /https?:\/\/[^\s<>"'）】。，；！？]+/gi

function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function getStyleSourceUrl(style = {}) {
  const candidates = [text(style.sourceUrl), ...[style.summary, style.summaryZh, style.styleSummaryZh, style.desc]
    .flatMap((value) => text(value).match(URL_PATTERN) || [])]
  for (const candidate of candidates) {
    if (!candidate) continue
    try {
      const url = new URL(candidate.replace(/[.,;!?)\]]+$/, ''))
      if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) return url.href
    } catch { /* An invalid source is not a link. */ }
  }
  return ''
}

// Display-only excerpt: the full description and generation template stay intact.
export function getStyleSummary(style = {}, maxLength = 72) {
  const limit = Number.isFinite(maxLength) ? Math.max(1, Math.floor(maxLength)) : 72
  const summary = [style.summaryZh, style.styleSummaryZh, style.summary, style.desc]
    .map((value) => text(value)
      .replace(/(?:来源|source)\s*[:：]\s*https?:\/\/[^\s<>"'）】。，；！？]+/gi, '')
      .replace(URL_PATTERN, '')
      .replace(/\s+/g, ' ')
      .trim())
    .find((value) => /[\p{L}\p{N}]/u.test(value)) || ''
  if ([...summary].length <= limit) return summary
  const prefix = [...summary].slice(0, limit - 1).join('')
  const sentence = [...prefix.matchAll(/[。！？；]|[.!?;](?=\s|$)/g)].at(-1)
  if (sentence) return prefix.slice(0, sentence.index + 1)
  const clause = [...prefix.matchAll(/[，、]|,(?=\s)|\s/g)].at(-1)
  return `${(clause ? prefix.slice(0, clause.index) : prefix).trimEnd()}…`
}
