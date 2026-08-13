# Skill 元数据规则

工作台中的 Skill 标题和介绍不再由前端自行翻译或起名，统一由本地安装器读取 Skill 仓库的 `SKILL.md` 生成。

## 展示规则

- `name`：必须等于 `SKILL.md` front matter 中的 `name`；没有 `name` 时才使用 Skill 目录名。不能用工作台自定义中文名替代原名。
- `sourceDescription`：保留仓库的原始 `description`，用于追溯，不直接作为中文界面文案。
- `summaryZh`：风格仓库卡片专用的短摘要，控制在 160 个字符以内，建议一句话说明“风格效果 + 适合主题”。不得直接复用长篇内页说明。
- `desc`：Skill 执行页使用的完整中文介绍，说明视觉风格效果、适合的主题／素材方向和关键限制（例如是否保留原图）。
- `styleSummaryZh`、`subjectSummaryZh`：分别保存风格效果和适用主题，供后续卡片、筛选和诊断使用。

## 元数据来源优先级

1. `SKILL.md` 中的 `styleshelf-metadata` JSON 块；
2. 工作台已核对的 Skill 元数据；
3. `SKILL.md` 中已有的中文说明；
4. 如果 Skill 没有现成的中文说明，安装器会依据 `SKILL.md` 的名称、原始 description、输入字段和比例自动生成中性中文摘要与详情；不把元数据缺口交给用户处理，也不根据英文标题单独臆造具体风格。

第三方 Skill 可以在 `SKILL.md` 中加入：

```html
<!-- styleshelf-metadata
{
  "summaryZh": "卡片用的一句话短摘要：风格效果 + 适合主题。",
  "descriptionZh": "中文说明：呈现什么风格，适合什么主题或素材，并说明关键限制。",
  "styleSummaryZh": "一句话概括视觉效果。",
  "subjectSummaryZh": "一句话概括适合的主题或素材。"
}
-->
```

重新安装或刷新本地 Skill 时会重新读取上述元数据；这只更新工作台目录记录，不修改原始 Skill 文件。
