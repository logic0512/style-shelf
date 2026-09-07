# Skill 封面来源 / Skill cover provenance

> 历史记录：本文描述 0.2.2 以前的设计或验证。0.2.2 已移除所有内置 Skill、Prompt、样例和自动安装入口；当前使用方式以 README 为准。旧 Git 历史与 Release 本次未删除。

## 中文

Skill、Prompt 封面及 Skill 样例引用本地 Job 输出时，持久化为不含端口的 `/api/jobs/.../output/...` 路径；读取时映射到当前服务端口，兼容旧的 localhost 完整地址。回归检查：`node --test test/cover-image-port.test.mjs`。

首版 8 张默认卡片均保留维护者使用对应 Skill 生成的封面，不复制上游仓库的示例图。封面只用于识别风格，不作为图库作品，也不计入使用次数。

| Skill | 封面文件 | 发布状态 |
| --- | --- | --- |
| `photo-abstract-editorial` | `public/skill-assets/photo-abstract-editorial/cover.png` | 已生成并保留 |
| `ian-xiaohei-illustrations` | `public/skill-assets/ian-xiaohei-illustrations/cover.png` | 已生成并保留 |
| `ink-wash-poster` | `public/skill-assets/ink-wash-poster/cover.png` | 已生成并保留 |
| `gc-minimal-zine-poster-v0-1` | `public/skill-assets/gc-minimal-zine-poster-v0-1/cover.png` | 已生成并保留 |
| `scene-distillation-zine-v1-3` | `public/skill-assets/scene-distillation-zine-v1-3/cover.png` | 已生成并保留 |
| `scenes-gathered-zine-v1-3` | `public/skill-assets/scenes-gathered-zine-v1-3/cover.png` | 已生成并保留 |
| `heytea-doodle-poster` | `public/skill-assets/heytea-doodle-poster/cover.png` | 已生成并保留；个人非商业版随包附 Skill，来源与限制见 `REDISTRIBUTION-NOTICE.md` |
| `vinyl-image-generator` | `public/skill-assets/vinyl-image-generator/cover.png` | 已生成并保留 |

卡片展示框统一为 `4:5`，默认等比缩放、居中完整展示，空余区域留浅灰底；悬停不放大图片。封面选择窗口与缩略图同步完整展示，仅在用户主动选择“铺满裁切”时按取景位置裁切。不改变封面源文件。新导入 Skill 如果没有可追溯样例，使用 `coverStatus: "needs_sample"`，必须先运行并保存一次结果后才能写入封面。第三方 Skill 的作者、来源与许可见 [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md)。

## English

Local Job references in Skill/Prompt covers and Skill samples are stored as port-free `/api/jobs/.../output/...` paths and resolved to the current API port on read, including legacy localhost URLs. Regression check: `node --test test/cover-image-port.test.mjs`.

All eight default cards retain maintainer-generated covers created with their corresponding Skills. No upstream example image is copied into the release. Covers identify a style only: they are not gallery items and do not increase usage counts.

| Skill | Cover file | Release status |
| --- | --- | --- |
| `photo-abstract-editorial` | `public/skill-assets/photo-abstract-editorial/cover.png` | Generated and retained |
| `ian-xiaohei-illustrations` | `public/skill-assets/ian-xiaohei-illustrations/cover.png` | Generated and retained |
| `ink-wash-poster` | `public/skill-assets/ink-wash-poster/cover.png` | Generated and retained |
| `gc-minimal-zine-poster-v0-1` | `public/skill-assets/gc-minimal-zine-poster-v0-1/cover.png` | Generated and retained |
| `scene-distillation-zine-v1-3` | `public/skill-assets/scene-distillation-zine-v1-3/cover.png` | Generated and retained |
| `scenes-gathered-zine-v1-3` | `public/skill-assets/scenes-gathered-zine-v1-3/cover.png` | Generated and retained |
| `heytea-doodle-poster` | `public/skill-assets/heytea-doodle-poster/cover.png` | Cover retained; included only in the personal/non-commercial bundle with redistribution notice |
| `vinyl-image-generator` | `public/skill-assets/vinyl-image-generator/cover.png` | Generated and retained |

The card frame is fixed at `4:5`; images fit and center in full against a light gray background, without hover zoom. The cover editor and thumbnails also show the full image. Cropping applies only when the user explicitly selects Fill and crop. The source file is unchanged. A newly imported Skill without a traceable sample uses `coverStatus: "needs_sample"` and must produce and save one result before a cover can be assigned. See [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) for authors, sources, and licenses.
