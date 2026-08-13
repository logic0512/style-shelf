# 个人风格仓库开发计划

> 暂定工作名：Style Shelf / 风格仓库  
> 产品形态：跨平台、本地优先、可开源的 Web 工作台，Electron 作为独立桌面启动外壳
> 目标系统：macOS / Windows / Linux  
> 当前阶段：Phase 16 Electron 桌面外壳与图片资产管理
> 核心原则：前端是产品交互核心；Codex 是首个后台执行引擎；Skill 是可持续置入的风格能力单元。

## 1. 事实、决策与假设边界

### 1.1 已验证事实

- 现有火柴人动画项目已经跑通：本地图片路径交给 Codex / ImageGen，结果保存为本地文件，再由本地页面读取显示。
- Codex App Server 能提供线程、Turn、流式事件、用户输入请求、审批请求和 Skill 调用能力。
- WorkBuddy 官方文档公开了自定义模型、Custom API URL、MCP、Skill 和本地 HTTP API；其中 HTTP API 当前标注为 Beta。
- Imagen 等外部生图服务可以通过 API 接入，但不同服务的鉴权方式和编辑能力并不一致。

### 1.2 已确定的产品决策

- Web 是唯一的交互与业务实现；Electron 是可选但可运行的独立桌面启动外壳，不复制另一套业务逻辑。
- 浏览器只负责界面；本地 Node.js 服务负责文件、任务、Codex 调用和结果映射。
- 默认真实执行链路使用 Codex；WorkBuddy 仅保留本地执行器适配和生图接口预留，不在本阶段验证外部生图模型。
- 仓库从第一天按开源和跨平台约束开发，提供人工安装与本地 Agent 辅助安装两条入口。
- 用户可在前端检索本机 Codex Skills 并勾选导入，也可从 GitHub 安装、更新、移出工作台和可恢复删除图片 Skill；“移出”只改工作台调用清单，不删除本机 Codex Skill，维护过程只反馈状态，不展示 Codex 内部链路。

### 1.3 未来兼容假设

- 用户可把仓库地址交给具有本机文件和命令权限的 Codex 或 WorkBuddy，由 Agent 完成克隆、依赖安装、环境检查和启动。
- WorkBuddy 可通过本地执行器适配替代 Codex；其生图模型仍由 WorkBuddy 外部配置，Style Shelf 不保存密钥。
- Imagen、Flux、ComfyUI 或其他生图服务仍只保留接口预留，真实 Provider 接入和出图验证不属于本阶段。
- 云端聊天页面若没有用户电脑的文件和命令权限，不能替用户在本机完成安装。

未来假设不会进入首版完成标准；首版只保留低成本替换边界，并用固定测试样例防止前端、存储和 Codex 私有协议耦合。

## 2. 产品目标

构建一个“个人风格滤镜仓库”：用户通过图片化风格卡片使用本地图片 Skill，而不是记忆 Skill 名称或进入 Codex 对话页。

- 浏览和维护已加入工作台的个人风格卡片。
- 点击卡片后，根据对应 Skill 的真实要求展示图片、文字、多图、选项或组合输入。
- 支持图片转绘、文字生图、参考图和运行时多轮追问。
- 同一 Skill 可以同时创建多个 Job；任务可以在后台继续，用户可返回仓库切换其他 Skill。
- 每个完成 Job 都保留自己的运行成果，创作页按 Skill 展示运行历史，避免最新结果覆盖旧结果。
- 输入、输出、任务状态、Skill 来源和版本全部保存在本地。
- 新 Skill 安装完成后自动出现在风格仓库，卡片资料可独立编辑。

## 3. 最终成果定义

### 3.1 首版必须具备

1. 通过本机浏览器打开工作台，默认进入风格仓库，不出现 Codex 对话页。
2. 只有“风格仓库”和“结果图库”两个一级入口。
3. 首批四个 Skill 以正式风格卡片接入：
   - `photo-abstract-editorial`
   - `gc-minimal-zine-poster-v0-1`
   - `scene-distillation-zine-v1-3`
   - `scenes-gathered-zine-v1-3`
4. 不同 Skill 可显示不同的初始输入，并在运行时继续请求图片、文字、选项或确认。
5. Codex 在后台执行指定 Skill；前端持续显示排队、运行、等待输入、成功和失败状态。
6. 用户离开生成工作区后任务继续运行，待回答或完成时由全局任务栏提醒。
7. 输入、输出、状态、日志摘要和 Skill 版本本地落盘，服务重启后可恢复。
8. 结果图库支持原图/结果对照、再次生成、下载和来源追溯。
9. 用户可从前端添加、更新、停用和可恢复删除图片 Skill。
10. 支持 macOS、Windows、Linux 的同一套 Web 前端和 Node.js 本地服务。
11. 仓库提供明确的安装、检查、启动和本地配置流程，适合人工执行，也适合本地 Agent 执行。

### 3.2 首版明确不做

- Electron/Tauri 的签名安装包、自动更新和商店分发；当前先提供 Electron 源码启动入口，不改变 Web 架构。
- WorkBuddy 外部生图模型的真实生产验证，以及 Imagen、Flux、ComfyUI 的 Provider 适配。
- 多用户、账号系统、云端同步、社区市场和商业计费。
- ComfyUI 式节点编辑器、通用 Skill 代码编辑器或任意脚本 UI。
- 自动把用户 Skill 发布到 GitHub。
- 为每个已知 Provider 预建空目录、工厂类或配置面板。
- 对第三方 Skill 审美和出图质量做重复验证；只验证工作台链路。

### 3.3 检查点只检查应用

- 设计结构：信息层级、卡片视觉和动态输入是否正确。
- 真实链路：前端输入是否能形成 Job，Codex 是否执行，结果是否回填。
- 本地闭环：素材、状态、结果和版本是否可靠保存与恢复。
- Skill 扩展：新增 Skill 是否无需修改前端代码即可出现并使用。
- 开源安装：全新克隆后能否安装、诊断、配置并启动。
- 跨平台：路径、进程和权限差异是否被限制在平台薄层。

## 4. 产品信息架构与设计约束

本节吸收 `huashu-design` 对前一版方案的评估结论。

### 4.1 一级入口

1. **风格仓库**：浏览、添加和维护已加入工作台的风格卡片。
2. **结果图库**：查看任务结果、输入来源、再次生成和下载。

其他功能不占一级导航：

- 生成工作区由风格卡片进入。
- Skill 添加位于仓库顶部；更新、停用、移出工作台和卡片编辑位于卡片菜单。
- 设置只负责执行引擎、存储、凭据状态和诊断等低频内容。
- 运行中任务进入全局任务栏；运行时追问显示为当前 Job 的问题卡。

### 4.2 动态生成工作区

前端不预设所有 Skill 都是“上传一张图 + 一个提示词”。入口由风格配置和运行时事件共同决定：

- 直接转绘：图片上传后可直接执行。
- 文字生图：输入想法后按 Skill 审美生成。
- 混合输入：图片、文字、多参考图或选项组合。
- 引导式 Skill：先接收最小输入，再通过一轮或多轮问题卡补充信息。
- 未知问题：退化为通用文本问题卡，不打开聊天页。

### 4.3 非阻塞交互

- 提交后可返回仓库或结果图库，任务继续执行。
- 同一 Skill 的多个任务互不覆盖；每个 Job 的输出按任务 ID 保留并可回到创作页继续处理。
- 全局任务栏统一显示 `queued`、`running`、`waiting_input`、`completed`、`failed`、`cancelled`。
- `waiting_input` 给出明显但不打断当前操作的提醒。
- 完成结果先挂在对应 Job 的运行历史中；用户完成 4:3 / 3:4 封面取景并保存后，才进入结果图库。失败不得进入成功图库。

### 4.4 视觉规则

- 卡片图片是第一视觉层级，导航、标签和操作控件退居次要。
- 优先使用 Skill 自带且来源清楚的真实示例；没有素材时使用诚实占位，不用无关图库图填充。
- 用户可把任意成功结果设为封面。
- 卡片名称、说明、标签、封面和默认提示可编辑，但不直接修改 Skill 源代码。
- 固化轻量设计系统：字体层级、单一强调色、8pt 间距、图片比例、断点和任务状态。
- Skill 卡片封面固定使用 4:5 图片框；封面来源必须是 Skill 真实产出。无样例 Skill 只能显示待生成状态，首次成功保存结果后自动写入封面。
- 明确排除通用 AI Dashboard 套路：统计卡、装饰性图标、无意义状态点、紫色科技渐变和多层圆角容器。
- 实施界面必须检查字体、字号、行距、对齐、边距、换行和实际桌面尺寸下的留白。

## 5. 总体架构

```text
┌──────────────────────────────────────────────────────────────┐
│ Browser UI · http://127.0.0.1:<port>                        │
│ 风格仓库 / 动态生成工作区 / 全局任务栏 / 结果图库 / 设置      │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTP + polling
┌───────────────────────────▼──────────────────────────────────┐
│ Local Node.js Service                                        │
│ API · Job Queue · Style Registry · Local Storage · Events    │
└───────────────┬──────────────────────────────┬───────────────┘
                │                              │
┌───────────────▼──────────────┐  ┌────────────▼───────────────┐
│ Codex Runner · 默认执行器     │  │ Local Data                 │
│ App Server / Skill / ImageGen │  │ styles / jobs / artifacts  │
└──────────────────────────────┘  └────────────────────────────┘

┌──────────────────────────────┐
│ WorkBuddy Runner · 接口预留  │
│ 生图模型由 WorkBuddy 外部配置│
└──────────────────────────────┘
```

### 5.1 Web 前端

- React + JSX，负责所有产品交互。
- 不直接启动进程，不直接读写任意本地路径，不保存 Provider 密钥。
- 通过 HTTP 创建任务和轮询 Job 状态；不依赖浏览器 WebSocket。
- 同一套前端服务 macOS、Windows 和 Linux，不维护三套界面。

### 5.2 本地 Node.js 服务

- 只绑定 `127.0.0.1`，不默认暴露到局域网。
- 提供风格卡片、文件上传、任务、结果和设置 API。
- 负责 Job 目录、原子写入、任务状态、Codex 进程和结果接纳。
- 校验 Origin、请求令牌、文件类型、路径范围和输出归属。
- 浏览器关闭不等于立即终止任务；服务保存状态，重开页面后重新订阅。

### 5.3 Codex Runner

首版优先接入 Codex App Server：

- 启动、继续和恢复线程。
- 显式指定 Skill。
- 将 App Server 事件规范化为工作台事件。
- 使用 `skills/list`、`skills/changed`、`skills/config/write` 同步启停状态。
- 接纳完成事件中属于当前 Job 的真实本地图片路径。

若当前运行时的 App Server 启动方式阻塞开发，允许先用 `@openai/codex-sdk` 完成单轮链路，再补运行时追问；这只是实现降级，不改变前端和存储协议。

### 5.4 为未来替换保留的最小边界

首版不创建多实现工厂，只固定三种跨层数据：

```ts
type ExecutionRequest = {
  jobId: string;
  styleId: string;
  mode: "text" | "image" | "mixed";
  text?: string;
  imagePaths: string[];
  answers: Array<{ requestId: string; value: unknown }>;
  outputDir: string;
};

type ExecutionEvent =
  | { type: "queued" | "running"; message?: string }
  | { type: "need_input"; requestId: string; field: InputField }
  | { type: "progress"; stage: string; message: string }
  | { type: "result"; artifacts: ImageArtifact[] }
  | { type: "error"; code: string; message: string; recoverable: boolean };

type ImageArtifact = {
  path: string;
  mime: string;
  width?: number;
  height?: number;
  metadata?: Record<string, unknown>;
};
```

Codex Runner 和 WorkBuddy Runner 共用同一 Job/Turn/产物契约；WorkBuddy 的生图模型由 WorkBuddy 配置，本阶段不做模型 API 测试。

外部图片 Provider 还需要声明能力，例如 `textToImage`、`imageToImage`、`maskEdit`、`styleReference`、`subjectReference`、`multiImage`。前端只能显示当前 Provider 确实支持的输入，不根据 Provider 名称猜测能力。

### 5.5 Style Package 与原生 Skill 的关系

工作台不能把卡片数据永久绑死在 Codex Skill 安装路径。首版采用一个最小中立记录：

```text
styles/<style-id>/
  style.json          # 卡片、输入提示、来源、版本、能力
  assets/             # 封面和示例
```

- `style.json` 引用 Codex Skill 名称和路径，但前端只读取工作台字段。
- Skill 指令仍由原始 `SKILL.md` 管理，不复制一份容易漂移的指令正文。
- WorkBuddy Runner 已作为实际适配层存在；外部生图模型仍由 WorkBuddy 配置，Style Shelf 不复制或保存其密钥。

## 6. 本地存储与安全

数据根目录通过平台薄层解析，不在业务代码写死 macOS 路径：

```text
<user-data>/StyleShelf/
  registry/
    styles.json
  styles/
    <style-id>/
      style.json
      assets/
  jobs/
    <job-id>/
      job.json
  temp/
    jobs/<job-id>/output/
  logs/
  trash/

<picture-library>/Style Shelf/
  Uploads/
    <job-id>/
  Generated/
    <job-id>/
```

- JSON 索引使用临时文件加原子替换；数据规模实际造成性能问题后再迁移 SQLite。
- 内部 Job、Skill 索引和临时文件留在应用数据目录；用户上传副本进入可见 `Uploads/`，生成原图进入可见 `Generated/`。
- 首次迁移只复制旧 Job 的 `input/output` 并更新引用，不删除旧文件；旧路径在迁移期间保持可读。
- 输出只从当前任务完成事件接纳，并复制到 `Generated/<job-id>/`；图库删除仍只移除索引，实际文件清理由存储管理明确执行。
- Skill 目录日常只读；维护任务使用独立权限范围。
- 删除 Skill 优先移动到应用回收目录。
- 密钥不得写入仓库、Skill、Job、日志或 Agent 对话。
- 开发阶段可使用被 Git 忽略的 `.env`；公开版本优先使用系统安全凭据存储或 Provider 自身登录态。

## 7. 安装、配置与开源使用路径

### 7.1 仓库必须提供

```text
README.md
AGENTS.md
.env.example
scripts/
  setup.mjs
  doctor.mjs
  start.mjs
config/
  schema.json
```

统一使用跨平台 Node.js 脚本，不把 `.sh` 作为唯一入口：

```bash
npm install
npm run setup
npm run doctor
npm run start
```

### 7.2 人工安装

1. 克隆或下载仓库。
2. 安装项目声明的 Node.js 版本和依赖。
3. 运行 `npm run setup` 创建本地目录和默认配置。
4. 在本地设置页完成 Codex 状态、存储位置和必要凭据检查。
5. 运行 `npm run doctor`，通过后启动工作台。

### 7.3 本地 Agent 辅助安装

用户可把仓库地址交给拥有本机权限的 Codex 或 WorkBuddy，并要求它：

1. 克隆仓库并阅读 `AGENTS.md` 与 `README.md`。
2. 检查 Node.js、包管理器、端口、目录权限和 Codex 可用性。
3. 执行相同的 `setup`、`doctor`、`start` 命令。
4. 把需要用户本人填写的密钥留在本地设置页，不要求用户粘贴到对话。

Agent 安装不是另一套安装系统；它只是自动执行仓库中已验证、可重复的标准命令。

### 7.4 `doctor` 最小检查

- 本地服务能启动并仅监听回环地址。
- 数据目录可写，路径解析符合当前系统。
- Codex Runtime 或授权状态可用。
- 风格注册表可加载。
- 首批 Skill 状态可识别。
- 测试文件能进入 Job 目录并被结果 API 正确读取。
- 密钥缺失时给出明确配置入口。
- 默认不触发付费真实生图；付费检查由用户显式选择。

## 8. 两类后台任务

### 8.1 RUN_STYLE

1. 用户点击风格卡片。
2. 工作台读取 `style.json`，显示最小初始输入。
3. 本地服务创建独立 Job 并复制输入素材。
4. Codex Runner 启动线程并显式传入 Skill 与必要路径。
5. 原生事件转换为 `ExecutionEvent`，通过 WebSocket 推送前端。
6. 若收到 `need_input`，前端显示问题卡并继续同一任务。
7. 只接纳当前 Job 返回的有效图片文件。
8. 结果复制到 Job 输出目录，写入索引并进入结果图库。

### 8.2 SYNC_SKILL

1. 用户从仓库顶部或卡片菜单发起添加、更新、停用或移出工作台。
2. 本地服务查询 Codex 的真实 Skill 状态。
3. 添加时只收集 GitHub 地址、本地目录或明确描述。
4. Codex 在受限维护范围执行安装或更新。
5. 工作台读取 Skill 特点，生成或更新最小 `style.json`。
6. 用户可修改卡片名称、说明、标签、封面和默认提示。
7. 通过原子更新刷新仓库；前端只显示安装中、已更新、失败或需授权。

## 9. 建议项目结构

```text
style-shelf/
  src/
    client/              # React Web UI
    server/              # HTTP、WebSocket、Job、文件与 Codex Runner
    shared/              # 请求、事件、卡片和 Job 类型
    platform/            # 路径、进程、浏览器启动的系统差异
  styles/                # 工作台风格记录和卡片素材
  scripts/               # setup / doctor / start
  config/                # 配置 schema 和默认值
  tests/                 # 最小链路与跨平台检查
  docs/
    EXECUTION_PLAN.md
```

首版保持一个应用工程。只有第二个执行器或图片 Provider 真正进入开发时，才创建 `adapters/` 或拆分 package。

## 10. 分阶段实施与确认节点

### Phase 1：最终 Web 工程与核心前端

目标：直接在最终 React + JSX 工程中确定信息结构，不做一次性视觉原型。

任务：

- 建立最终 Web 工程和能提供模拟 API 的最小 Node 服务。
- 实现风格仓库、动态生成工作区、全局任务栏/问题卡、结果详情。
- 用首批 Skill 的真实示例或诚实占位构建风格卡片。
- 固化字体、颜色、8pt 间距、卡片比例、桌面断点和任务状态。
- 使用模拟任务验证离开工作区后仍能浏览、返回和回答问题。

**确认点 A：设计结构**

- 两个一级入口是否足够。
- 不同 Skill 的入口是否能呈现不同输入。
- 卡片图片是否保持第一视觉层级。
- 任务反馈是否非阻塞且没有退化成聊天页。

预计：3–5 个工作日。

### Phase 2：本地服务与数据闭环（已完成首版闭环）

目标：把 Phase 1 的模拟数据替换为真实本地数据，不改变已确认的界面结构。

任务：

- 建立本地 HTTP 服务、Job 状态机和平台路径薄层。
- 实现 Style、Job、输入、输出、结果索引和原子写入。
- 完成上传复制、结果接纳、服务重启恢复和浏览器重连。
- 加入回环地址、Origin、请求令牌、文件和路径校验。

内部检查：创建 Job、复制输入、写入结果、重启服务后，页面状态与磁盘记录一致。

预计：3–5 个工作日。

当前已完成：

- 本地结果服务绑定 `127.0.0.1:4317`，提供健康检查、结果读取、结果写入和封面参数更新 API。
- 结果 JSON 使用临时文件写入后原子替换，默认落在被 Git 忽略的 `.styleshelf-data/`，也可通过 `STYLE_SHELF_DATA_DIR` 指定目录。
- 前端启动时尝试恢复本地结果；服务不可用时保留当前内存演示，不阻塞设计预览。
- 生成页保存结果时同步写入本地服务，封面比例和取景位置随结果保存。
- 生成提交会创建本地 Job，图片输入复制到用户可见的 `Uploads/<job-id>/`，执行临时文件放在内部 `temp/jobs/<job-id>/output/`，运行状态写入 `job.json`；前端通过 HTTP 轮询本地 Job 状态。
- 工作台启动时读取本地 Job 列表，任务栏可以恢复历史任务记录。
- Job 输出目录、结果图片接纳和结果文件 URL 已纳入本地服务；真实 Codex 输出由 Phase 3 Runner 驱动。

下一步：

- 将结果图库的原图、封面和来源元数据统一纳入本地索引。
- 继续补齐动态 Skill 输入和多轮追问。

### Phase 3：Codex 真实执行链路（已完成首轮验证）

目标：验证整个应用链路，不重复验证 Skill 本身。

任务：

- 发现当前可用的 Codex Runtime，接入 App Server 或 SDK 降级链路。
- 前端提交输入后创建 Job，并把限定路径交给指定 Skill。
- 规范化等待、运行、追问、成功和失败事件。
- 将真实结果复制到 Job 输出目录并回填前端。
- 保存本次运行的 Codex 路径、版本、Thread/Turn 和 Skill hash。

当前已完成：

- 优先发现桌面版内置 Runtime `/Applications/ChatGPT.app/Contents/Resources/codex`，当前探测版本为 `0.146.0-alpha.9.2`；不把已验证会被系统杀掉的全局 CLI 作为首选。
- 接入 stdio App Server 的 `initialize`、`thread/start`、`turn/start`、通知监听和服务端请求拒绝处理。
- 捕获 `imageGeneration.savedPath`，复制到用户可见的 `Generated/<job-id>/`，通过本地 API 暴露给前端。
- 前端已用 Job 状态轮询替换模拟计时，完成后进入封面设置面板。
- 已用只读 Skill 探针跑通真实 Thread/Turn。
- 已用 `photo-abstract-editorial` 对项目样图 `case-1.jpg` 完成一次真实生图：输出 `1023×1537 PNG`，接纳到本地 Job，并写入结果图库索引。
- 已验证结果图片 URL 可读取，原图输入仍保留在 Job 的 `input/` 目录。

**确认点 B：真实链路**

- 已完成：从本地图片创建 Job、运行真实 Skill、回收图片并写入结果图库。
- 已完成：页面轮询 Job 状态，输出完成后进入封面设置面板。
- 已完成：追问型 Skill 从 `waiting_input` 继续到同一 Job 的真实 Codex Thread/Turn，并成功接纳输出图片。
- 已完成：服务重启时将未完成的 `running` Job 明确标记为失败，不自动重复执行；无效 Skill 不进入成功图库。

预计：2–4 个工作日，不含外部生成排队时间。

### Phase 4：首批四个风格与动态交互

目标：四个 Skill 成为正式产品内容，而不是四个写死按钮。

任务：

- 接入首批四个 Skill 的卡片、输入方式和真实执行。
- 按风格记录显示图片、文字、多图、选项或组合输入。
- 运行时追问使用标准问题卡并恢复同一线程。
- 完成取消、失败重试、再次生成和原图/结果对照。

当前已完成首轮：

- 前端改为读取每张 Skill 卡片自己的 `inputSchema`，不再按全局 `mode` 写死输入区。
- 已覆盖图片、文字、图片 + 文字、选项、画幅和引导式问题组五类输入。
- 必填条件由当前 Skill 的字段声明计算，现有 Job 提交和真实 Runner 链路保持兼容。
- 已将首批 Skill 的展示与输入元数据移入 `public/skill-catalog.json`；前端启动时加载并与离线 fallback 合并，恢复历史 Job 使用当前目录配置。
- 首批四个 Skill 已完成真实回归覆盖：`photo-abstract-editorial` 单图转绘、`gc-minimal-zine-poster-v0-1` 文字生图、`scene-distillation-zine-v1-3` 图片转绘、`scenes-gathered-zine-v1-3` 引导式生成。

内部检查：不同 Skill 得到正确输入与反馈；失败不进入成功图库，不覆盖输入和历史结果。

预计：3–5 个工作日。

### Phase 5：Skill 添加、更新与工作台目录管理

目标：让风格仓库具备持续扩展能力。

任务：

- 支持从 GitHub 地址或本地目录添加图片 Skill。
- 同步真实 Skill 状态，支持启用、停用和更新。
- 后台完成来源检查、安装、读取说明和风格记录生成。
- 保留历史任务对应的旧版本信息。
- 支持卡片资料编辑与可恢复移出工作台；不删除本机 Codex Skill。

当前已完成首轮：

- Skill 目录落到本地 `.styleshelf-data/skills.json`，首次启动从 `public/skill-catalog.json` 初始化。
- 前端 `Skill Workshop` 已改为输入 GitHub 仓库/Skill 地址或 Skill 名称，由本地 Skill Installer 安装到 Codex Skills 目录，再读取 `SKILL.md` 自动生成卡片配置；不再要求用户填写名称、描述、输入方式或色系。
- Workshop 现在可以检索本机 `~/.codex/skills`（排除 `.system`），勾选一个或多个已有 Skill 导入；导入只读取 `SKILL.md` 生成工作台卡片，不移动或复制原始 Skill 文件。移出工作台只写入目录回收记录，不删除原始 Skill。
- 目录变更会持久化并刷新风格仓库；不再要求用户手填 Skill 元数据。
- 输入方式会根据保存的 `inputSchema` 重新渲染，服务端会校验字段结构；移出进入工作台回收站，可在 Workshop 恢复，原始 Codex Skill、历史结果和 Job 不被删除。

**确认点 C：Skill 扩展**

- 从前端添加一个首批列表之外的图片 Skill。
- 无需修改前端代码即可出现卡片并进入输入界面。
- 卡片编辑不影响 Skill 本体。
- 更新和移出后，工作台目录、磁盘索引和历史记录一致，原始 Codex Skill 仍可重新导入。

预计：3–5 个工作日。

### Phase 6：可重复安装与本地配置

目标：让开源仓库既能人工安装，也能被本地 Agent 可靠安装。

任务：

- 完成 `README.md`、`AGENTS.md`、`.env.example` 和配置 schema。
- 实现 `setup.mjs`、`doctor.mjs`、`start.mjs`。
- 建立本地设置页：Codex 状态、存储目录、凭据状态和诊断结果。
- 从全新克隆分别执行一次人工安装和 Codex 辅助安装。
- 确认日志、Job、Git 状态和对话中没有密钥。

内部检查：一台未配置项目的环境能根据仓库说明完成启动；缺依赖或凭据时错误信息能指向下一步。

预计：2–4 个工作日。

### Phase 7：完整产品体验（已完成）

目标：补齐日常使用所需的仓库和结果管理。

任务：结果图库按时间倒序展示、按 Skill 分类筛选、下载、再次生成、等待输入恢复、取消和失败重试。

当前已完成：结果图库按时间倒序展示，支持按 Skill 分类筛选；查看、下载、再次生成和删除结果已接入。删除只移除结果图库索引，不删除原始 Job 文件。再次生成会恢复已保存的文字、画幅、选项和原始 Job 图片，输入文件通过本地 Job 路径校验后读取。任务栏支持等待回答、取消和失败重试；同一 Skill 可并行创建多个 Job，每个完成 Job 的输出会在对应 Skill 的运行历史中保留，服务重启后从 Job JSON 恢复。

明确不做：搜索、收藏、独立详情页、独立日志导出和自动磁盘清理；结果卡片保持轻量操作入口，历史 Job 与结果由本地数据目录保留。Skill 进入工作台即视为已收录，不再提供单独收藏状态。

内部检查：以真实数据完成主要路径；在常见桌面尺寸下检查字体、层级、间距、换行、对齐和留白，并完成最小真实点击测试。日志摘要直接来自 Job 状态、消息和 Runner 元数据，不另建日志中心。

预计：3–5 个工作日。

### Phase 8：跨平台、安全与开源发布

目标：以同一仓库完成 macOS、Windows、Linux 的可用发布。

任务：

- 检查三平台的路径、可执行文件发现、进程启动/终止、端口和浏览器打开。
- 检查路径穿越、伪造结果路径、无效图片、覆盖写入、异常退出和 localhost 请求来源。
- 补齐许可证、贡献说明、隐私/凭据说明和故障排查。
- 在至少一台 macOS 和一台 Windows 实机完成全新安装；Linux 进入自动检查并在可用环境做人工抽查。
- Electron 源码启动外壳已移入 Phase 16；签名安装包、自动更新和 Tauri 方案仍留在后续发布阶段。

**确认点 D：首版最终成果**

- 从全新克隆完成安装、诊断、启动、图片转绘、文字生图和一次 Skill 添加。
- 数据全部本地可追溯，Codex 始终在后台，界面不退化成聊天页。
- macOS、Windows、Linux 使用同一前端和本地服务代码。

预计：4–7 个工作日。

### 首版整体估算

23–40 个工作日。包含设计、开发、联调、开源安装和跨平台检查，不包含外部模型排队时间，也不包含 WorkBuddy/Imagen 的正式适配。

### 首版之后：兼容性验证里程碑

只有首版稳定后再执行：

1. 选择一个真实替代执行器，优先评估 WorkBuddy HTTP API 或 MCP 路径。
2. 选择一个真实外部图片 Provider，按其官方鉴权和能力接入。
3. 新增执行器/Provider 选择器，并验证同一风格卡片、Job、事件和结果图库无需重写。
4. 若 WorkBuddy Beta API 变化，只修改对应适配层，不修改前端和历史数据。

这一里程碑用于证明可替换性，不在首版提前建设多个空适配器。

## 11. 关键风险与处理策略

### 风险 1：浏览器无法直接管理本地文件和进程

必须通过只绑定回环地址的 Node.js 服务处理；纯静态网页不能完成本项目目标。

### 风险 2：Codex Runtime 位置和版本漂移

启动时动态发现并握手，不依赖固定路径或 shell `PATH`；保存每次任务使用的路径和版本。

### 风险 3：Skill 输出协议不统一

只接纳当前任务事件中的有效本地图片；找不到有效图片时任务失败，不把文字回复当出图成功。

### 风险 4：Skill 没有前端输入 schema

用最小风格记录描述初始输入，未知部分通过运行时问题卡补足；不让 Skill 执行任意前端 HTML/JavaScript。

### 风险 5：第三方 Skill 和安装供应链

安装前检查来源、依赖、网络和写入范围；日常运行只读 Skill；工作台移出可恢复且不删除原始 Skill；高风险操作进入明确授权。

### 风险 6：本地服务攻击面

仅监听 `127.0.0.1`，校验 Origin、请求令牌、路径范围和文件类型；不接受任意输出路径或任意命令。

### 风险 7：跨平台差异

系统路径、进程和浏览器启动集中在平台薄层；业务代码不写死 `/Users/...`、反斜杠或 macOS 应用路径。

### 风险 8：WorkBuddy 与 Codex Skill 不天然兼容

工作台风格记录保持中立，但实际指令格式和调用方式由未来适配实现；不把“支持 Skill”误写为“无改造兼容所有 Skill”。

### 风险 9：图片 Provider 能力不一致

Provider 必须声明真实能力，界面按能力开放功能。Imagen 的项目、区域和凭据配置不能被简化为通用 API URL。

### 风险 10：Agent 安装被误解为零配置

Agent 可以自动执行标准安装步骤，但无法绕过 Node、Codex、账号、模型权限或付费 Provider 凭据要求。敏感信息仍由用户在本地设置页完成。

## 12. 测试矩阵

| 场景 | 关键输入/条件 | 预期结果 |
|---|---|---|
| 直接转绘 | 1 张图片 | 返回当前 Job 的有效图片 |
| 文字生成 | 一段描述 | 返回有效图片并保存来源 |
| 引导式任务 | 图片或文字 + 两轮问题 | 同一 Job 继续并出图 |
| 多参考图 | 2–3 张图片 | 每张输入有明确记录 |
| 后台生成 | 提交后离开工作区 | 任务继续，状态全局可见 |
| 等待回答 | 浏览其他页面时收到追问 | 点击提醒回到原 Job |
| 执行失败 | 无效输出或进程异常 | 不进入成功图库，可诊断/重试 |
| 服务重启 | 已完成或等待输入任务 | 状态可恢复或明确终止 |
| Skill 添加 | GitHub 地址或本地目录 | 新卡片出现并可进入 |
| 卡片编辑 | 标题、封面、默认提示 | 不修改 Skill 本体 |
| Skill 更新 | 来源有新版本 | 原位更新并保留历史引用 |
| Skill 移出工作台 | 明确确认 | 进入工作台回收目录并可恢复，原始 Skill 保留 |
| 全新人工安装 | 新克隆仓库 | setup、doctor、start 成功 |
| Codex 辅助安装 | Agent 获得本机权限 | 执行同一套标准命令成功 |
| 凭据缺失 | 未配置所需登录/密钥 | doctor 和设置页给出下一步 |
| 凭据保护 | 安装、运行、失败日志 | Git、Job、日志和对话无密钥 |
| localhost 防护 | 异常 Origin/令牌/路径 | 请求被拒绝且无文件泄露 |
| Windows 路径 | 空格、盘符、反斜杠 | 上传、运行、结果读取正常 |
| macOS 路径 | App Support/空格路径 | 同上 |
| Linux 路径 | XDG 数据目录 | 同上 |
| Provider 能力 | 模拟缺少图片编辑能力 | 前端不显示不可用操作 |

## 13. 首版完成标准

1. 两个一级入口和动态生成工作区按确认的层级工作。
2. 首批四个 Skill 成为可使用的风格卡片，并支持其实际输入差异。
3. 至少覆盖单图转绘、文字生图、参考图和运行时追问。
4. Codex 全程在后台，用户无需进入 Codex 页面。
5. 上传图片先进入当前 Job，输出再进入同一 Job 的输出目录。
6. 成功结果带真实图片、输入、Skill 名称/hash、Thread/Turn、耗时和状态。
7. 结果只从当前任务完成事件接纳，不扫描目录猜测。
8. 失败不显示为成功，不覆盖原图和历史结果。
9. 页面或服务重启后，卡片、任务和结果可恢复或被明确处理。
10. 任务可后台执行，用户能跨页面查看状态、回答问题和打开结果。
11. 用户可从前端添加、更新、停用和可恢复移出工作台的图片 Skill，原始 Codex Skill 不被删除。
12. 卡片资料可编辑且不修改 Skill 本体。
13. 结果图库按时间倒序展示，分类筛选、下载和再次生成可用。
14. `setup`、`doctor`、`start` 在全新克隆可重复执行。
15. macOS、Windows、Linux 共用同一 Web 前端和本地服务，平台差异限制在薄层。
16. 本地服务通过回环监听、请求来源、路径和文件校验。
17. 仓库、日志、Job 和 Agent 对话不包含敏感凭据。
18. 留下最小自动检查，覆盖 Job 状态、结果接纳、Skill 同步、安装诊断和跨平台路径。

## 14. 推荐开工顺序

```text
最终 Web 工程 + 核心前端
  → 确认点 A：设计结构
  → 本地服务 + 数据闭环
  → Codex + Skill + 本地结果
  → 确认点 B：真实链路
  → 首批四个 Skill + 动态追问
  → Skill 添加 / 更新 / 工作台目录管理
  → 确认点 C：扩展能力
  → 可重复安装 + 本地配置
  → 完整产品体验
  → 跨平台、安全、开源发布
  → 确认点 D：首版最终成果
  → 后续用户具备模型 API 后再验证 WorkBuddy + 外部图片 Provider
```

确认本计划后从 Phase 1 开始。所有阶段在同一个最终 Web 工程中推进，不维护一次性原型分支；确认点只校准关键方向，不把第三方 Skill 质量当作应用验收对象。

### 当前推进记录

- Phase 5 已完成：前端可扫描并导入本机 Codex Skill，远程 Skill 可安装；“移出工作台”是可恢复的目录操作，不删除原始 Skill。
- Phase 6 已完成基础闭环：`setup` 初始化数据目录，`doctor` 检查 Node、Python、Codex Runner、Skill 目录，`start` 同时启动本地 API 和 Web 页面；README 与项目规则已补齐。
- 全新克隆验证已通过：临时目录完成 `npm install`、`setup`、`doctor`、`build`，并验证 `start` 后 API 与 Web 页面均可访问。
- 本地数据闭环已通过：Job 创建、真实图片上传、任务目录落盘和状态读取正常，结果图库未被提前写入。
- 顶部设置与侧栏诊断入口已接通 `/api/health`，显示本地 API、数据目录、执行方式和端口配置；补齐 `.env.example`。
- 已验证自定义 API/前端端口：`start` 自动注入 `VITE_API_BASE`，CORS 按前端端口放行；非法 Origin、Job 路径和伪造图片均被拒绝。
- 本次人工回归发现并修复重复提交问题：运行按钮现在会锁定并显示“后台处理中”；服务重启时不再自动重复启动旧的 `running` Job，未完成任务会被明确标记为失败。
- 进一步补齐 Runner 并发锁、回答问题按钮锁和浏览器刷新后的 running Job 监听；无效 Skill 的并发 `/run` 回归确认只产生一次失败，不会启动重复 Runner。
- 真实 Codex Runner 已完成单图、文字、引导式任务回归；结果图库和任务栏收尾已完成，当前进入跨平台、安全和开源发布检查。
- Phase 8 已完成第一段：启动脚本读取 `.env`、使用跨平台子进程树终止方式，`doctor` 支持 `CODEX_BIN` 诊断，临时端口启动冒烟通过。
- Phase 8 补充验证：当前本地 API 的异常 Origin 返回 `403`，Job 路径穿越请求返回 `400`；`setup` 与 `doctor/start` 已统一读取 `.env`。
- Phase 8 文档段已补齐：贡献说明、隐私与凭据边界、页面/端口/Runner/Skill/任务排查入口已从 README 可达。
- Phase 8 发布内容检查：项目内部 `.workbuddy/` 已加入忽略规则，发布清单不再包含记忆与截图；旧 `src/` 仍按计划保留。
- Phase 8 发布冒烟：临时发布目录的 `setup`、`doctor`、`build` 及 API/Web 启动均通过；依赖安装仍需在可联网环境复核。
- Phase 8 跨平台自动检查：新增 GitHub Actions 矩阵，覆盖 macOS、Windows、Linux 的依赖安装、初始化、诊断和构建。
- 当前前端依赖 Vite 8，标准运行环境统一为 Node.js 20.19+ 或 22.12+；若未来要支持 Node 18，需要先降级并重新验证依赖链。

## 16. 桌面应用与图片资产管理（当前阶段）

本阶段把“类似 App”变成可运行的 Electron 外壳，同时不替换已经验证的 Web、Node API、Job 和 Codex Runner。桌面入口通过 Electron 启动本地 API，API 同时提供构建后的页面，关闭窗口时结束本地服务树。

图片资产采用两层目录：

- 用户可见图片库：`<图片目录>/Style Shelf/Uploads/<job-id>/` 保存上传图片副本；`<图片目录>/Style Shelf/Generated/<job-id>/` 保存生成原图。
- 应用内部目录：系统 App 数据目录保存 Job、Skill 目录、结果索引、临时执行文件和迁移标记。

已有 `.styleshelf-data/jobs/*/input|output` 会在本地服务启动时复制到新目录并更新引用，旧文件不自动删除。诊断面板显示两类目录、文件数量和占用空间；桌面模式可直接打开文件夹，清理由用户在系统文件管理器中完成。

当前入口：

```text
npm run desktop
  ├─ npm run build
  ├─ Electron 启动本地 API + 构建页面
  └─ 关闭窗口时结束 API 子进程
```

桌面外壳不负责安装 Codex、模型或第三方 Provider；首启诊断必须明确显示执行器未配置、Skill 不存在或凭据缺失。Electron 打包入口、动态 API 端口、用户图片目录和 preload 资源路径已完成启动冒烟；打包应用会读取用户 App 数据目录中的 `.env`，不把 WorkBuddy 凭据写入安装包。签名、公证和自动更新仍属于正式公开分发阶段。

## 15. 能力依据

- Codex SDK：<https://developers.openai.com/codex/sdk>
- Codex App Server：<https://developers.openai.com/codex/app-server>
- Codex Skills：<https://developers.openai.com/codex/skills>
- Codex Authentication：<https://developers.openai.com/codex/auth>
- WorkBuddy 自定义模型：<https://www.workbuddy.ai/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Model>
- WorkBuddy MCP：<https://www.workbuddy.ai/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/MCP-Guide>
- WorkBuddy HTTP API（Beta）：<https://www.workbuddy.ai/docs/cli/http-api>
- Vertex AI 图片生成概览：<https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/overview>
- Vertex AI 图片参考能力：<https://docs.cloud.google.com/vertex-ai/generative-ai/docs/image/subject-customization>
