import test from 'node:test'
import assert from 'node:assert/strict'

test('required input fields validate their own values', async () => {
  const formState = await import('../src-v2/form-state.js').catch(() => ({}))
  assert.equal(typeof formState.isInputFieldReady, 'function')
  const state = { values: { direction: 'ready', palette: '', ratio: '' }, filesByField: {}, answers: { q1: 'A' } }
  assert.equal(formState.isInputFieldReady({ id: 'direction', type: 'textarea' }, state), true)
  assert.equal(formState.isInputFieldReady({ id: 'palette', type: 'select', options: [{ value: 'red' }] }, state), false)
  assert.equal(formState.isInputFieldReady({ id: 'ratio', type: 'ratio', options: ['1:1'] }, state), false)
  assert.equal(formState.isInputFieldReady({ id: 'questions', type: 'questions', questions: [{ id: 'q1' }, { id: 'q2' }] }, state), false)
})

test('Prompt editor detects changes before closing', async () => {
  const formState = await import('../src-v2/form-state.js').catch(() => ({}))
  assert.equal(typeof formState.hasPromptChanges, 'function')
  const prompt = { name: 'Original', summary: '', mode: 'image', template: 'Template' }
  assert.equal(formState.hasPromptChanges(prompt, { ...prompt }), false)
  assert.equal(formState.hasPromptChanges(prompt, { ...prompt, template: 'Changed' }), true)
})

test('server rejects a Skill job with missing required structured input', async () => {
  const validation = await import('../server/input-validation.mjs').catch(() => ({}))
  assert.equal(typeof validation.assertJobInput, 'function')
  const skill = {
    inputSchema: [
      { id: 'direction', type: 'textarea', required: true },
      { id: 'palette', type: 'select', required: true, options: [{ value: 'red' }] },
      { id: 'ratio', type: 'ratio', required: true, options: ['1:1'] },
    ],
  }
  assert.throws(() => validation.assertJobInput({ payload: { fields: { direction: 'ready' } }, inputs: [] }, skill), /job_input_required:palette/)
  assert.doesNotThrow(() => validation.assertJobInput({ payload: { fields: { direction: 'ready', palette: 'red', ratio: '1:1' } }, inputs: [] }, skill))
})

test('known API failures become actionable messages', async () => {
  const formState = await import('../src-v2/form-state.js')
  assert.equal(formState.userFacingError('skill_installer_unavailable'), '远程 Skill 安装器不可用；请先运行诊断并补齐 Codex 系统安装器。')
  assert.equal(formState.userFacingError('invalid_skill_manifest'), '这个 SKILL.md 的输入配置格式不受支持，请检查字段类型和选项格式。')
  assert.equal(formState.userFacingError('job_input_required:palette'), '请完成所有必填输入后再运行。')
  assert.equal(formState.userFacingError('something_else'), 'something_else')
})
