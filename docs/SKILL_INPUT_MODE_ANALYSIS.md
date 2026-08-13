# Skill 输入模式误判分析与后续更新规范

> 状态：输入契约、开放式回退和现有 Skill 迁移已实施；真实任务回归待运行
>
> 记录日期：2026-08-08
>
> 适用范围：Style Shelf 的本地 Skill 导入、动态输入表单、图片输入传输和后续新增 Skill

## 1. 结论摘要

本次现象不是 `vinyl-image-generator` 和 `daily-photo-playground` 不支持图生图，而是工作台在导入 Skill 时错误推断了输入模式。

这两个 Skill 的原始说明都包含源图或用户照片的处理流程，但导入后被保存成了：

```json
{
  "mode": "text",
  "modeLabel": "文字生图",
  "inputSchema": [
    { "type": "textarea" }
  ]
}
```

前端根据这份已保存的 `inputSchema` 渲染工作区，因此用户看不到图片上传框。问题发生在“Skill 导入与能力识别层”，不是发生在模型能力层，也不是图片生成模型拒绝图生图。

需要把这次问题作为一类通用架构问题处理：

> Skill 的真实输入能力不能从自然语言说明中靠几个关键词猜测；必须有明确、可校验、可刷新的输入契约。

## 2. 本次涉及的两个 Skill

### 2.1 `vinyl-image-generator`

原始 Skill 有明确的 `User-Provided Image Input` 部分，要求在用户上传或引用一张或多张图片时检查每一张源图，并将源图的主体、构图、材质或情绪转化为黑胶唱片及其包装设计。

它不是单纯的文字生图 Skill。它支持以源图为视觉证据进行转译，也允许根据工作需求做不同程度的保留、裁切、抽象或组合。

原始文件：[`bundled-skills/vinyl-image-generator/SKILL.md`](../bundled-skills/vinyl-image-generator/SKILL.md)

### 2.2 `daily-photo-playground`

原始 Skill 以日常摄影照片为主要输入，流程第一步就是查看原始照片，然后从照片中提取主体、构图、光线、色彩和情绪，再重构成编辑感海报。

它的照片输入不是可有可无的装饰，而是该 Skill 的核心工作材料。文字更接近标题、情绪或方向补充，不能替代原始照片。

原始文件：`${CODEX_HOME}/skills/daily-photo-playground/SKILL.md`（本机 Skill，不随仓库分发）

## 3. 已验证的故障链路

当前链路如下：

```text
SKILL.md
   ↓
server/skill-installer.mjs
   ↓ 关键词推断 inputSchema
.styleshelf-data/skills.json
   ↓ 保存 mode 和字段定义
src-v2/main.jsx
   ↓ 按 inputSchema 渲染表单
用户只能看到文字输入框
   ↓
Job 没有图片文件可上传
```

### 3.1 导入器使用脆弱的关键词推断

`server/skill-installer.mjs` 的 `inferInputSchema` 会扫描整个 `SKILL.md`，大致依赖以下几类字符串：

- 是否出现 `reference image`、`input image`、`supplied photo` 等固定表达；
- 是否出现 `prompt`、`idea`、`description` 等文字输入表达；
- 是否出现 `question`、`interview`、`ask the user` 等引导式表达。

相关代码：[`server/skill-installer.mjs`](../server/skill-installer.mjs)

这个方法有两个结构性问题：

1. Skill 作者可以使用很多等价表达，例如 `source image`、`input photo`、`user-provided image`、`原图`、`用户照片`，但不一定命中导入器的固定词表。
2. `SKILL.md` 是工作说明，不是结构化配置。里面出现的 `prompt` 或 `question` 可能只是描述输出要求或举例，并不代表用户必须输入文字或需要先回答问题。

本次检查结果中，两个 Skill 的文字输入关键词被识别到了，但图片输入关键词没有被识别到，因此最终被判定为文字模式。

### 3.2 错误结果已经写入工作台数据

当前 `.styleshelf-data/skills.json` 中，两个 Skill 都是 `mode: "text"`，且 `inputSchema` 只有一个文本域：

- Daily：`STYLE_SHELF_DATA_DIR/skills.json`
- Vinyl：`STYLE_SHELF_DATA_DIR/skills.json`

这说明问题不是前端临时显示错误，而是导入阶段产生的错误 manifest 已经被持久化。

### 3.3 前端只是按错误配置渲染

前端读取 `skill.inputSchema`，遇到 `type: "image"` 才渲染图片输入，遇到 `type: "textarea"` 才渲染文字输入。

相关代码：[`src-v2/main.jsx`](../src-v2/main.jsx)

因此前端当前行为符合它收到的配置；真正需要修复的是配置生成和刷新机制。

### 3.4 本地 Skill 重装不会自动刷新旧 manifest

本地按名称重新导入时，如果工作台已有同名记录，安装器会直接返回旧记录，而不是重新读取 `SKILL.md`。

相关代码：[`server/skill-installer.mjs`](../server/skill-installer.mjs)

这会产生第二层问题：即使之后改好了输入识别逻辑，用户点击当前的“重装”按钮，也可能仍然看到旧的文字模式。

## 4. 必须区分的四个层次

后续排查类似问题时，不能把下面四层混为一谈：

| 层次 | 要回答的问题 | 本次状态 |
|---|---|---|
| Skill 能力 | 原始 Skill 是否要求或支持源图、文字、多图、选项？ | 两个 Skill 都支持源图；Daily 以照片为核心输入 |
| 导入契约 | 工作台是否正确把能力转换成 `inputSchema`？ | 失败，两个都被写成 text |
| 前端表单 | 是否根据契约显示正确字段？ | 前端按错误契约正常渲染，因此没有上传框 |
| 执行传输 | 用户上传后，文件是否进入 Job 并被运行器实际使用？ | 有路径传输链路；两个 Skill 的真实图生图结果本次尚未单独验证 |

其中，前两层决定用户能不能开始提交；第四层决定提交后是否真的产生图生图效果。必须分别验收。

## 5. 当前后端图片链路的边界

工作台已经有图片上传和 Job 保存流程：前端提交图片后，服务端会把图片保存到当前 Job 的 `input/` 目录，并记录路径。

运行器当前将这些本地路径写入执行提示，要求后台运行时使用这些文件：[`server/codex-runner.mjs`](../server/codex-runner.mjs)

因此：

- 当前“不显示上传框”的直接原因是输入契约错误；
- 修复表单后，图片文件有机会进入执行链路；
- 仍需用真实 Job 验证运行器确实查看并使用了源图，而不是只把路径当成普通文字传给模型；
- “有图片路径”不等于“模型一定使用了图片”，必须把运行记录和结果一起验收。

## 6. 后续更新的推荐方向

### 6.1 使用显式输入契约，停止从自然语言猜测

建议为可导入 Skill 增加结构化输入声明。可以先放在 `SKILL.md` 的 front matter 或受控区块中，由导入器读取；之后如果需要更丰富的卡片配置，再转为工作台自己的 manifest。

示例：

```yaml
input:
  mode: mixed
  fields:
    - id: source_images
      type: image
      label: 源图
      required: true
      multiple: true
    - id: direction
      type: textarea
      label: 补充方向
      required: false
```

对于 Daily，可以声明 `mode: image`，并把源照片设为必填；对于 Vinyl，可以声明 `mode: mixed` 或 `mode: image`，具体取决于是否允许没有源图时仅靠文字生成。

关键词扫描最多只能作为旧 Skill 的兼容回退，不能继续作为唯一依据。

### 6.2 区分“输入字段”与“执行能力”

输入表单描述用户需要提供什么；执行能力描述运行器或 Provider 能做什么。两者不能用同一个 `mode` 字段完全代替。

建议至少分成：

```text
inputSchema:
  用户字段：image / textarea / select / multi-image

capabilities:
  textToImage
  imageToImage
  multiImage
  styleReference
  maskEdit
```

这样可以避免“Skill 要求图片”与“当前执行器是否支持图片编辑”被错误地当成同一件事。

### 6.3 对无法识别的 Skill 保持开放且诚实

如果 Skill 没有显式契约，且关键词推断结果不确定，不应该默认显示“文字生图”。工作台现在默认提供图片和文字两个入口，并标记需要复核：

```text
needs_review: true
mode: mixed
requiredAny: [source_images, direction]
```

只有原始 Skill 明确只处理文章、正文、文字或 Prompt，才会判为 `text`。其余未声明 Skill 使用开放式回退，至少提供一种输入后再执行。

### 6.4 新 Skill 的显式输入契约

未来 Skill 可以在 `SKILL.md` 中增加受控 JSON 区块，导入器会优先读取它：

```html
<!-- styleshelf-input
{
  "mode": "mixed",
  "fields": [
    { "id": "source_images", "type": "image", "required": true, "multiple": true },
    { "id": "direction", "type": "textarea", "required": false }
  ],
  "requiredAny": ["source_images", "direction"],
  "interaction": "guided_optional",
  "capabilities": ["imageToImage", "textToImage", "multiImage"]
}
styleshelf-input -->
```

不修改原始 Skill 文件时，也可以由工作台的已知 Skill 规则提供同样的契约。未知 Skill 保留 `needs_review: true`。

### 6.5 重装必须刷新源文件，但保留用户数据

本地 Skill 更新时建议执行以下规则：

1. 重新读取当前 `SKILL.md`；
2. 重新计算输入契约、描述、版本和源文件指纹；
3. 更新系统生成字段；
4. 保留用户编辑过的卡片名、封面、标签和使用次数；
5. 如果源文件未变化，可以跳过重复解析，但不能用旧 manifest 直接遮蔽“强制重装”。

需要区分“重新读取源 Skill”和“恢复用户自定义卡片资料”，不能用整份旧 JSON 覆盖整份新 JSON。

### 6.6 增加输入模式识别测试夹具

至少应准备以下测试样例：

| 样例 | 期望输入模式 | 关键验收 |
|---|---|---|
| 明确文字生图 Skill | `text` | 只有文字字段 |
| 明确单图转绘 Skill | `image` | 图片必填，显示上传框 |
| 图片加提示词 Skill | `mixed` | 图片和文字都显示 |
| 多参考图 Skill | `image` / `mixed` | 支持多图数量和顺序 |
| 运行时追问 Skill | `guided_optional` 或组合模式 | 追问不被误判成普通文本 |
| 没有结构化声明的旧 Skill | `mixed` + `needs_review` | 不静默冒充 text |
| 只在输出说明中提到 image 的 Skill | 不应自动判为 image | 区分输入图片和输出图片 |

每个样例都应测试完整链路：

```text
导入 → manifest → 表单 → Job payload → 文件保存 → 运行器 → 结果归档
```

## 7. 本次问题的修复验收标准

修复完成后，不能只检查卡片上出现了“图片上传”文字，需要满足以下条件：

1. 重新导入两个 Skill 后，`skills.json` 中的 `mode` 和 `inputSchema` 正确；
2. Vinyl 工作区能选择或上传一张或多张源图，并能填写方向；没有图片时也能用文字启动；
3. Daily 工作区要求上传源照片，文字只作为补充输入；
4. 聚景工作区要求上传源图，同时提供自由想法输入；固定问题不再作为唯一入口；
5. 提交后 Job 的 `payload` 记录结构化字段和图片文件名，Job 的 `input/` 目录确实有文件；
6. 运行器日志或事件能证明它读取了源图；
7. 输出结果与源图存在可解释的主体、构图或情绪关联，而不是无关的纯文字生图；
8. 本地 Skill 修改 `SKILL.md` 后，点击重装能刷新输入契约；
9. 用户编辑的卡片元数据和使用次数不因重装被清零；
10. 至少通过一组文字、单图、混合、多图和未知输入模式测试；
11. 未知 Skill 不再静默显示为“文字生图”。

## 8. 以后遇到类似现象时的排查顺序

遇到“Skill 明明支持图片，但工作台只有文字框”时，按下面顺序检查：

1. 先读原始 `SKILL.md`，确认图片是输入材料、参考材料还是只出现在输出说明中；
2. 查看 `.styleshelf-data/skills.json` 中的 `mode` 和 `inputSchema`；
3. 查看导入器如何生成这两个字段，确认是否为关键词误判；
4. 确认前端是否只是按 `inputSchema` 渲染；
5. 确认重装是否真的重新读取了源文件；
6. 修复表单后，再检查 Job 是否保存图片并交给运行器；
7. 最后用真实任务结果确认模型使用了源图。

不要直接从“没有上传框”推断模型不支持图生图，也不要只改某个 Skill 的关键词来掩盖通用导入问题。

## 9. 当前状态与后续任务边界

本说明记录了已实施的输入契约修复，以及仍需完成的真实任务验证。

后续实施应优先完成：

1. 用 Vinyl、Daily 和聚景各跑一次真实任务；
2. 检查 Job payload、`input/` 文件和 Runner 日志；
3. 补齐文字、单图、混合、多图和未知输入的自动化夹具。
