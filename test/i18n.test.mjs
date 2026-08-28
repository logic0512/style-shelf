import test from 'node:test'
import assert from 'node:assert/strict'
import { supportedLocales, translate } from '../src-v2/i18n.js'

test('locale switch has the two supported UI languages and stable fallbacks', () => {
  assert.deepEqual(supportedLocales, ['zh-CN', 'en'])
  assert.equal(translate('图库', 'zh-CN'), '图库')
  assert.equal(translate('图库', 'en'), 'Gallery')
  assert.equal(translate('继续：{name}', 'en', { name: 'Ink Stamp' }), 'Continue: Ink Stamp')
  assert.equal(translate('用户自定义 Prompt', 'en'), '用户自定义 Prompt')
})
