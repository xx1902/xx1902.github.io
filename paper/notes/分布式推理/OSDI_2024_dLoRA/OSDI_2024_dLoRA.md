---
# ======== 区域划分 ========
# 稳定编号：用于链接和图谱关联，创建后保持不变
id: osdi-2024-dlora
# 专题编号：对应 Paper/map.json 的 topic，双向同步
topics: [ "distributed-inference", "lora-serving" ]
# 方向编号：对应 map.json 的 direction.id，可多选
directions: [ "distributed-lora-serving", "request-adapter-scheduling", "adapter-multitenancy" ]
# 方向名称：根据 directions 自动生成
category: "分布式 LoRA Serving；请求与适配器联合调度；多租户适配器管理"

# ======== 文章详情 ========
# 简称用于列表和图谱，完整标题用于详细阅读
shortTitle: "dLoRA"
title: "dLoRA: Dynamically Orchestrating Requests and Adapters for LoRA LLM Serving"
venue: "OSDI"
year: 2024
# 搜索标签：自由关键词，不参与图谱归属
tags: [ "LoRA", "LLM Serving", "Dynamic Batching", "Load Balancing" ]
# 作者按原文顺序填写
authors:
  - Bingyang Wu
  - Ruidong Zhu
  - Zili Zhang
  - Peng Sun
  - Xuanzhe Liu
  - Xin Jin
# 阅读状态：待阅读 / 已阅读 / 精读；优先级：P1 / P2 / P3
status: "待阅读"
priority: "P1"
# 简短摘要：用于检索和论文概览
summary: "dLoRA 面向 GPU 集群多 LoRA 服务，结合 worker 内 merged/unmerged 动态批处理与集群间 request-adapter 联合迁移；论文报告相对 vLLM、PEFT 的最高吞吐提升，但数值依赖工作负载和 SLO 条件。"

# ======== 相关目录 ========
# 线上论文与代码链接，没有则留空
paperUrl: "https://www.usenix.org/conference/osdi24/presentation/wu-bingyang"
codeUrl: ""
# 本地论文 PDF：相对项目根目录，随网站发布并在新标签页预览
localPdf: "Paper/papers/OSDI_2024_dLoRA.pdf"
# 本地 Markdown 笔记：文件自身的相对路径，构建时自动校正
localNote: "Paper/notes/分布式推理/OSDI_2024_dLoRA/OSDI_2024_dLoRA.md"
---

# 小结

## 一句话判断

dLoRA 解决的是 GPU 集群中同时服务多个 LoRA adapter 时，单 worker 批处理效率和跨 worker 负载均衡相互影响的问题。

## 研究问题与方法

merged inference 可降低单 adapter 计算开销，但不同 adapter 请求难以合批；unmerged inference 支持跨 adapter 合批，却不总是高效。dLoRA 根据请求到达和运行状态动态切换两种模式，并在集群层联合迁移请求与 adapter 来应对负载倾斜。

## 主要证据与边界

系统基于 vLLM 实现，在四节点、每节点八张 A800 的集群上测试 Llama 2 7B/13B/70B，并用 ShareGPT 对话内容与 Azure Functions 到达轨迹构造负载。作者报告满足 SLO 时相对 vLLM、Hugging Face PEFT 的最高吞吐提升分别为 57.9× 和 26.0×，并报告相对 S-LoRA 的最高平均延迟改善。以上是论文测试配置内的最高值。

## 待确认

会议应写作 OSDI 2024；USENIX 是组织/出版方，不是会议名称。所给材料未记录作者本人复现。

# 精读

> Source coverage: Full supplied PDF text; visual page review incomplete.
> Extraction confidence: Mixed; text extracted, figures not independently parsed.
> Locator mode: structure-grounded.
> Primary analytical lens: Methods.
> Secondary analytical lens: None.
> Context verification: Targeted external check for venue and publication record.
> Card completeness: Complete relative to supplied source.

`[Paper]` 表示所给 PDF 报告；`[External]` 表示会议方记录；`[Analysis]` 表示证据推理；`[Hypothesis]` 表示待实验验证。PDF 页码解析脚本未能运行，以下仅用章节、图表定位。

## 01 基本信息

- [Paper] 会议：18th USENIX Symposium on Operating Systems Design and Implementation（OSDI 2024）。
- [External] [USENIX OSDI 2024 会议页](https://www.usenix.org/conference/osdi24)；[dLoRA 正式论文页](https://www.usenix.org/conference/osdi24/presentation/wu-bingyang)。
- [Paper] 方向：多 LoRA LLM serving、动态批处理、请求与 adapter 的集群级迁移。
- [Paper] 实现基于 vLLM；所给 PDF 未确认公开代码仓库。

## 02 一句话总结

[Paper] dLoRA 在 worker 内动态选择 merged/unmerged 跨 adapter 批处理方式，在 worker 间动态迁移请求和 adapter，以降低排队与负载不均衡。

## 03 研究问题

- 问题：怎样同时避免单 worker 的跨 adapter 低利用率与集群副本间负载失衡？
- 约束：adapter 对请求有亲和性；KV/请求状态及 adapter 权重争用有限 GPU/主机内存；请求长短可变。
- 研究问题：[Analysis] 如何在执行模式切换成本、排队时延和集群迁移成本之间动态权衡？

## 04 背景与定位

[Paper-framed] 论文将工作定位在单模型 serving 系统、PEFT 多 adapter 运行和多副本负载均衡的交叉处。其关注点不是新的 LoRA 参数化，而是 LoRA serving 中的执行模式和 request-adapter 放置策略。[Paper: Sections 1–3]

## 05 核心问题

| 问题 | 表现 | 论文解释 | 出处 |
| --- | --- | --- | --- |
| merged-only 批处理受 adapter 类型约束 | 不同 adapter 请求不能充分合批 | adapter 权重需要合并/切换 | [Paper: Sections 2.2–2.3; Figure 2] |
| unmerged-only 并非总合算 | adapter 分布偏斜时可用批处理和计算机会改变 | 不同负载下 merged/unmerged 利弊不同 | [Paper: Section 4] |
| worker 间负载倾斜 | 请求长度和 adapter 热度不均导致排队时延差异 | 单纯均匀分发无法反映资源消耗和 adapter 放置 | [Paper: Sections 2.3, 5; Figure 2] |

## 06 核心思路

1. [Paper] worker 内：credit-based batch generator 评估两种执行方式，并动态调节切换阈值。
2. [Paper] 集群层：request-adapter co-migration 同时考虑请求状态和 adapter 放置；先建模为 ILP，再以更低频率求解/选择迁移控制开销。
3. [Analysis] 这是一种跨时间尺度控制：局部批处理应对短期请求组合，集群迁移应对副本级长期或突发不均衡。

## 07 方法流程

```text
请求到达
  -> load balancer 选择 replica
  -> worker 根据队列、切换开销、执行成本决定 merged 或 unmerged batch
  -> global monitor 观测各 replica 资源与负载
  -> 触发 re-balance 后生成 request-adapter migration plan
  -> migration controller 执行请求状态/adapter 迁移
```

[Paper: Sections 3–5; Figure 3]

## 08 模块拆解

| 模块 | 职责 | 输入/输出 | 支持证据 | 移除后的影响 |
| --- | --- | --- | --- | --- |
| Dynamic cross-adapter batching | 选择 merged/unmerged 执行和批次 | 请求队列、阈值、成本 -> batch plan | [Paper: Section 4; Figures 4–6] | 固定执行模式，无法适应 adapter 分布变化 |
| Threshold tuning / credit scheduler | 控制切换时机并兼顾公平性 | 到达模式、队列状态 -> 动态阈值/credits | [Paper: Section 4.2; ablations] | 可能过度切换或让部分请求长期等待 |
| Request-adapter co-migration | 联合迁移请求与 adapter 平衡副本 | cluster 状态 -> placement/migration plan | [Paper: Section 5; Figures 7–8] | 请求被 adapter 放置限制，负载倾斜难纠正 |
| Global monitor/controller | 监测并执行跨副本计划 | worker 状态 -> migration actions | [Paper: Section 3; Figure 3] | 无法闭环更新集群布局 |

## 09 关键公式

[Paper] 集群迁移问题以整数线性规划表达，目标是降低副本间负载不均衡，同时受 adapter 与请求状态放置约束；由于式中变量和约束较多，此处不从文本提取版复写。可从论文 Section 5 的 ILP 定义及 notation 表逐项核对。[Paper: Section 5; Table 1]

## 10 实验与证据链

- [Paper] 集群：4 节点，每节点 8 张 NVIDIA A800 80GB（共 32 GPU）；模型为 Llama 2 7B/13B/70B，LoRA rank 8。[Paper: Sections 6–7.1; Table 2]
- [Paper] 请求内容来自 ShareGPT；请求到达模式使用 Microsoft Azure Functions 2019/2021 traces 映射构造。[Paper: Section 7.1]
- [Paper] 对照包括 vLLM、Hugging Face PEFT 和 S-LoRA；报告 SLO 约束下吞吐、平均时延、排队、GPU 利用率及组件消融。[Paper: Sections 7.2–7.6]
- [Paper] 作者报告最高 57.9× throughput vs vLLM、26.0× vs Hugging Face PEFT；与 S-LoRA 相比最高 1.8× lower average latency。[Paper: Abstract; Sections 7.2, 8]
- [Analysis] 最高值是特定配置/负载上的峰值对比；不应写成任意系统均有 57.9× 加速，且不应忽略 SLO、模型尺寸、adapter 分布和基线版本。

## 11 结论边界

[Paper] 结果支持动态执行模式和跨副本联合迁移在所测多 LoRA GPU 集群与负载下改善服务效率。它不直接证明同一机制适用于移动设备、NPU、不同推理框架或远高于所测规模的模型/adapter 数量。

## 12 作者说明的局限

所给 PDF 未发现独立的作者局限章节或明确的 limitations 声明。四节点 A800 集群、Llama 2 与所用生产轨迹是评测范围，不自动等于作者承认的局限。

## 13 分析与待验证问题

| 分析观察 | 可能影响 | 验证方法 | 依据 |
| --- | --- | --- | --- |
| 迁移请求状态和 adapter 都有成本 | 理论负载改善可能被传输/同步开销抵消 | 分别测迁移字节数、停顿时间、迁移后回收收益 | [Paper: Sections 5, 7] |
| Azure Functions 到达轨迹被映射为 LoRA 请求分布 | adapter 类型与真实 LoRA 产品流量未必一致 | 使用真实 adapter 热度、序列长度和突发模式做 replay | [Paper: Section 7.1] |

## 14 可迁移知识

**Agent-derived knowledge candidates**

- 多 adapter serving 的放置变量应把 request 与 adapter 关联起来，而不只是均匀分请求。
- 同一系统可同时保留 merged 和 unmerged 执行路径，由负载决定，而非把二者视为互斥架构。

## 15 相关方向连接

[Analysis] EdgeLoRA 将部分调度问题带到边缘设备，并增加 adapter 路由与异构内存约束；MobiLoRA 把重点放在设备内 KV 缓存复用。dLoRA 的 request-adapter 联合建模可作为这两类系统设计 cluster/edge 层放置策略时的对照。

## 16 候选研究想法

**Agent-derived research candidate；新颖性未核实**

- 来源问题：[Paper] request-adapter co-migration 的目标是集群负载均衡，但迁移成本与边缘网络差异需要单独计量。[Paper: Section 5]
- 假设：[Hypothesis] 在异构 edge cluster 中把迁移带宽、adapter 热度和 deadline 纳入目标，可减少负载均衡引发的尾延迟回退。
- 相对本文的变化：从同构 A800 cluster 转为异构设备/网络，显式计入迁移成本与设备功耗。
- Validation: 固定 trace 与模型，比较 dLoRA 风格策略、无迁移策略与成本感知策略，测 p95/p99 TTFT、吞吐、迁移流量和能耗。
- Failure modes: 边缘网络波动使状态预测不稳；迁移比排队等待更昂贵。
- 创新状态：`unverified`，需要先做 prior-art search。
