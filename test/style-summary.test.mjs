import test from 'node:test'
import assert from 'node:assert/strict'
import { getStyleSummary, getStyleSourceUrl } from '../src-v2/style-summary.js'

test('display excerpts preserve the source data and prefer curated summaries', () => {
  const style = {
    summaryZh: '纸面浮雕，保留主体。',
    summary: '完整说明。仅供个人使用。来源：https://example.com/style',
    template: 'Keep all generation instructions unchanged.',
  }
  const original = JSON.stringify(style)
  assert.equal(getStyleSummary(style), style.summaryZh)
  assert.equal(getStyleSourceUrl(style), 'https://example.com/style')
  assert.equal(JSON.stringify(style), original)
  assert.equal(getStyleSummary({ summary: '清晰线稿。颜色淡雅，纸张纹理自然，适合建筑和人物。' }, 17), '清晰线稿。')
  assert.equal(getStyleSummary({ summary: 'Soft paper, warm colors and delicate shadows.' }, 20), 'Soft paper, warm…')
  assert.equal(getStyleSummary({ summary: '来源：https://example.com' }), '')
  assert.equal(getStyleSummary({ summary: 'https://example.com', desc: '备用说明' }), '备用说明')
  assert.equal(getStyleSummary({ summary: '😀😀😀😀😀' }, 3), '')
  assert.equal([...getStyleSummary({ summary: '无分隔的长文本说明' }, 5)].length, 5)
  assert.equal(getStyleSummary(), '')
})

test('source links allow only usable http(s) URLs without credentials', () => {
  assert.equal(getStyleSourceUrl({ sourceUrl: 'javascript:alert(1)' }), '')
  assert.equal(getStyleSourceUrl({ sourceUrl: 'https://user:password@example.com' }), '')
  assert.equal(getStyleSourceUrl({ sourceUrl: 'https://example.com/style', summary: 'https://other.example' }), 'https://example.com/style')
  assert.equal(getStyleSourceUrl({ summary: '来源：https://example.com/style。个人非商业。' }), 'https://example.com/style')
  assert.equal(getStyleSourceUrl({ summary: 'Source: https://example.com/style. More details.' }), 'https://example.com/style')
  assert.equal(getStyleSourceUrl(), '')
})
