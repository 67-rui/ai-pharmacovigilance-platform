# 多模态证据分析 Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `/Users/a67_2024/Desktop/Project/multimodal-evidence-agent` 建立一个可运行、可测试、可演示的多模态证据分析 Agent MVP。

**Architecture:** 使用 Next.js + TypeScript 建立单仓库全栈原型。核心 Agent pipeline 保持确定性 fallback：planner 生成计划，tool 层处理 text/csv/image/pdf source，synthesizer 生成 evidence findings，report 层生成 Markdown brief，eval 层用小样本 fixtures 评分。

**Tech Stack:** Next.js, React, TypeScript, zod, Vitest, ESLint, CSS modules/global CSS.

---

## 文件职责

- `/Users/a67_2024/Desktop/Project/multimodal-evidence-agent/package.json`：根 workspace 脚本。
- `/Users/a67_2024/Desktop/Project/multimodal-evidence-agent/apps/web/package.json`：Web app 依赖与脚本。
- `/Users/a67_2024/Desktop/Project/multimodal-evidence-agent/apps/web/src/lib/types.ts`：核心类型。
- `/Users/a67_2024/Desktop/Project/multimodal-evidence-agent/apps/web/src/lib/agent/planner.ts`：根据问题和 sources 生成计划。
- `/Users/a67_2024/Desktop/Project/multimodal-evidence-agent/apps/web/src/lib/tools/textTool.ts`：文本证据抽取。
- `/Users/a67_2024/Desktop/Project/multimodal-evidence-agent/apps/web/src/lib/tools/csvTool.ts`：CSV 解析与摘要。
- `/Users/a67_2024/Desktop/Project/multimodal-evidence-agent/apps/web/src/lib/tools/imageTool.ts`：图片来源元数据与 fallback 说明。
- `/Users/a67_2024/Desktop/Project/multimodal-evidence-agent/apps/web/src/lib/tools/pdfTool.ts`：PDF 基础 fallback adapter。
- `/Users/a67_2024/Desktop/Project/multimodal-evidence-agent/apps/web/src/lib/agent/synthesizer.ts`：将 observations 合成为 findings。
- `/Users/a67_2024/Desktop/Project/multimodal-evidence-agent/apps/web/src/lib/report/markdown.ts`：生成 Markdown evidence brief。
- `/Users/a67_2024/Desktop/Project/multimodal-evidence-agent/apps/web/src/lib/agent/pipeline.ts`：串联 planner/tools/synthesizer/report。
- `/Users/a67_2024/Desktop/Project/multimodal-evidence-agent/apps/web/src/lib/eval/fixtures.ts`：小样本评估任务。
- `/Users/a67_2024/Desktop/Project/multimodal-evidence-agent/apps/web/src/lib/eval/scorer.ts`：评估 scorer。
- `/Users/a67_2024/Desktop/Project/multimodal-evidence-agent/apps/web/src/app/api/analyze/route.ts`：分析 API。
- `/Users/a67_2024/Desktop/Project/multimodal-evidence-agent/apps/web/src/app/api/eval/route.ts`：评估 API。
- `/Users/a67_2024/Desktop/Project/multimodal-evidence-agent/apps/web/src/components/*.tsx`：工作台 UI。
- `/Users/a67_2024/Desktop/Project/multimodal-evidence-agent/README.md`：项目说明、运行方式、架构、简历 bullet。

## Task 1: Scaffold 项目骨架

- [ ] 创建 `/Users/a67_2024/Desktop/Project/multimodal-evidence-agent`。
- [ ] 初始化 Git 仓库。
- [ ] 添加 root/app package、TypeScript、Next、Vitest、ESLint 配置。
- [ ] 安装依赖。

## Task 2: TDD 实现核心 pipeline

- [ ] 先写 planner/csv/synthesizer/pipeline/eval 测试。
- [ ] 运行测试确认因为模块缺失或行为缺失失败。
- [ ] 实现 `types.ts`、planner、tools、synthesizer、markdown、pipeline、eval。
- [ ] 运行测试确认通过。

## Task 3: 实现 API

- [ ] 先写 `/api/analyze` 和 `/api/eval` 的测试。
- [ ] 运行测试确认失败。
- [ ] 实现 API routes。
- [ ] 运行测试确认通过。

## Task 4: 实现前端工作台

- [ ] 创建 workspace UI：研究问题、文本 source、CSV source、图片 source、运行按钮。
- [ ] 渲染 agent timeline、evidence cards、report panel、eval summary。
- [ ] 添加响应式、偏专业工具风格的 CSS。
- [ ] 保证无 API key 时可直接演示。

## Task 5: 文档、验证与提交

- [ ] 编写中文友好的 README，保留英文简历 bullet。
- [ ] 运行 `npm run test`。
- [ ] 运行 `npm run lint`。
- [ ] 运行 `npm run build`。
- [ ] 提交新项目初始版本。
- [ ] 启动本地 dev server，提供访问 URL。

## Self-review

- Spec 覆盖：项目路径、独立文件夹、Agent pipeline、text/csv/image/pdf source、evidence cards、fallback、eval、README 均有对应任务。
- Placeholder scan：本计划没有未完成占位词。
- Type consistency：计划中的核心类型与设计文档一致，后续实现统一使用 `SourceDocument`、`AgentPlan`、`Observation`、`EvidenceFinding`、`EvidenceBrief`、`EvalCase`。
