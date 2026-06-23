# 多模态证据分析 Agent 设计文档

日期：2026-06-23

## 目标

新建一个独立作品集项目，项目名称为 `multimodal-evidence-agent`。

项目最终存放位置为：

```text
/Users/a67_2024/Desktop/Project/multimodal-evidence-agent
```

`/Users/a67_2024/Desktop/Project` 是你的项目总目录，不是本项目独占目录。因此本项目必须先创建同名文件夹 `multimodal-evidence-agent`，所有代码、文档、Git 仓库内容都放在这个文件夹内部。

这个项目定位为一个有技术深度的 AI 工程系统：用户输入研究问题，并提供文本、CSV、图片、PDF 等混合材料后，系统通过 Agent 工作流把这些材料转化为可追溯的证据发现、轻量数据分析结果和带引用来源的研究简报。

项目要重点展示以下能力：

- Agent 任务规划与工具调用。
- 多模态输入处理。
- 结构化数据分析。
- 证据溯源与引用。
- 小样本评估。
- 无 API Key 时仍可运行的确定性 fallback。

## 目标用户

目标用户是需要快速审阅异构材料的分析师、AI 工程师或研究人员。

第一版支持的材料类型：

- 研究文本或粘贴的资料片段。
- CSV 数据表。
- 图片，例如图表截图、表格截图、论文 figure。
- PDF，第一版先支持基础文本抽取接口或预留可扩展适配器。

项目不限定单一领域，但演示样例建议偏向医疗、生命科学、公共健康或科技分析。原因是这些领域天然重视证据质量、来源引用、不确定性和人工复核，很适合体现项目的技术价值。

## MVP 范围

MVP 必须完成一个可以本地演示的闭环：

1. 在 `/Users/a67_2024/Desktop/Project/multimodal-evidence-agent` 创建独立项目。
2. 提供一个 Web 工作台，让用户输入研究问题并添加资料来源。
3. 支持文本输入、CSV 上传或粘贴、图片上传。
4. 实现结构化 Agent 流程：
   - 根据研究问题和资料类型规划子任务。
   - 从文本中抽取证据。
   - 对 CSV 做简单描述性统计、趋势或分类汇总。
   - 将图片登记为视觉证据，保留文件元数据、用户说明和后续模型识别接口。
   - 合成带来源的 findings。
   - 生成 Markdown 格式的 evidence brief。
5. 提供证据卡片，展示 claim、来源、来源类型、置信等级和限制说明。
6. 没有 `OPENAI_API_KEY` 时，系统必须通过本地确定性逻辑生成可用结果。
7. 如果存在 `OPENAI_API_KEY`，后续可启用 OpenAI 生成更自然的综合报告和图片解释。
8. 内置 5 到 10 个小样本评估任务，用来检查 findings 是否引用了相关来源、是否避免过度声称。
9. README 需要说明架构、演示流程、限制、运行方式和简历 bullet。

MVP 不是万能研究助手。第一版重点是做出一个可理解、可演示、可测试的“证据分析工作台”。

## 非目标

第一版不做以下内容：

- 不做生产级登录、多用户权限或团队协作。
- 不接入大型向量数据库。
- 不声称系统可以证明因果关系或替代专家审查。
- 不做隐藏式网页浏览。
- 不做复杂 PDF 版面还原。

## 技术架构

建议使用 Next.js + TypeScript 构建全栈原型。

建议目录结构：

```text
multimodal-evidence-agent/
  apps/web/
    src/app/
      api/analyze/route.ts
      api/eval/route.ts
      page.tsx
    src/components/
      EvidenceWorkspace.tsx
      EvidenceCard.tsx
      AgentTimeline.tsx
      ReportPanel.tsx
    src/lib/
      agent/
        planner.ts
        pipeline.ts
        synthesizer.ts
      tools/
        textTool.ts
        csvTool.ts
        imageTool.ts
        pdfTool.ts
      eval/
        fixtures.ts
        scorer.ts
      report/
        markdown.ts
      types.ts
  docs/
    prompts/
    eval/
  README.md
```

## 数据流

1. 用户提交研究问题和一个或多个资料来源。
2. API 将每个资料来源标准化成统一的 `SourceDocument` 模型。
3. planner 根据问题和来源类型生成一组简短任务，例如“抽取关键 claims”“汇总 CSV 分布”“检查图片证据”。
4. tool 模块生成类型化 observations：
   - 文本 observation：相关片段、关键句、初步 claim。
   - CSV observation：行数、列名、缺失值、数值统计、分类计数。
   - 图片 observation：文件名、大小、用户说明、模型可处理的元数据和本地 fallback 说明。
   - PDF observation：抽取到的文本，或明确说明当前无法进行复杂版面解析。
5. synthesizer 将 observations 合成为 grounded findings。
6. report generator 生成 Markdown evidence brief，包含 findings、证据强度、引用来源、限制和后续问题。
7. UI 展示 Agent plan、执行时间线、证据卡片、数据摘要和最终报告。

## 核心类型

实现时需要保持清晰的类型边界：

- `SourceDocument`：来源 id、名称、类型、内容或文件元数据。
- `AgentPlan`：有序执行步骤、工具名称和执行理由。
- `Observation`：某个工具对某个 source 的输出。
- `EvidenceFinding`：claim、source ids、confidence、support summary、limitations。
- `EvidenceBrief`：标题、执行摘要、findings、不确定性说明、后续问题。
- `EvalCase`：问题、资料来源、预期 evidence keywords、禁止出现的过度结论模式。

## 错误处理

- 空问题、空来源或无效来源应返回明确验证错误。
- CSV 解析失败时，应说明哪个来源失败，并尽量保留其它有效来源的分析结果。
- 缺少模型凭证时不能导致系统不可用，本地 fallback pipeline 仍要生成可读报告。
- 图片和 PDF 的高级能力不足时，需要诚实显示限制，而不是假装完成识别。
- Agent timeline 应展示失败步骤，不要静默吞掉错误。

## 测试与评估

基础验证需要覆盖：

- planner 行为单元测试。
- CSV summary 与 evidence synthesis 单元测试。
- `/api/analyze` 对无效输入和 fallback 输出的 API 测试。
- 5 到 10 个小样本 eval fixtures。

评估检查重点：

- 每条 finding 至少引用一个相关来源。
- 证据较弱时，报告必须包含限制说明。
- 报告不能过度声称因果关系。
- CSV 相关 finding 要能匹配预期的数值或分类摘要。

## 简历叙事

项目完成后可以用于以下简历表达：

> Built a multimodal evidence-analysis agent that plans research tasks, extracts grounded findings from text, CSV, and image inputs, performs lightweight data analysis, and generates citation-backed evidence briefs with deterministic fallbacks and a small evaluation harness.

中文解释：

> 构建了一个多模态证据分析 Agent，能够规划研究任务，从文本、CSV 和图片输入中抽取可追溯 findings，执行轻量数据分析，并生成带引用来源的 evidence brief；同时实现了无 API Key 的确定性 fallback 和小样本评估框架。

## 第一阶段实现切片

第一阶段优先做一个可运行的本地产品，而不是追求最复杂的 AI 能力：

1. 在 `/Users/a67_2024/Desktop/Project/multimodal-evidence-agent` scaffold 独立项目。
2. 搭建工作台 UI：研究问题、来源输入、Agent timeline、证据卡片、报告面板。
3. 实现 deterministic planner、text tool、CSV tool、image metadata tool、synthesizer、Markdown report generator。
4. 实现 `/api/analyze` 并补充测试。
5. 添加 eval fixtures 和简单 scorer。
6. 编写 README、运行说明和简历 bullet。

## OpenAI 集成切片

确定性 MVP 完成后，再进入 OpenAI 增强阶段：

1. 添加可选 `OPENAI_API_KEY` 支持。
2. 用 OpenAI 做更自然的 evidence synthesis 和可选图片解释。
3. 将 prompt versioning 放入 `docs/prompts/`。
4. 对模型输出做 schema validation 后再渲染。
5. API 失败时回退到 deterministic synthesis。
