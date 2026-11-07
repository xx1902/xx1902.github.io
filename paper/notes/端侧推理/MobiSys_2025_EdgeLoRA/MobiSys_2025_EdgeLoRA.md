---
# ======== 区域划分 ========
# 稳定编号：用于链接和图谱关联，创建后保持不变
id: mobisys-2025-edgelora
# 专题编号：对应 Paper/map.json 的 topic，双向同步
topics: [ "edge-inference", "lora-serving" ]
# 方向编号：对应 map.json 的 direction.id，可多选
directions: [ "mobile-lora-serving", "edge-adapter-memory", "adapter-multitenancy" ]
# 方向名称：根据 directions 自动生成
category: "端侧 LoRA 服务；端侧适配器内存管理；多租户适配器管理"

# ======== 文章详情 ========
# 简称用于列表和图谱，完整标题用于详细阅读
shortTitle: "EdgeLoRA"
title: "EdgeLoRA: An Efficient Multi-Tenant LLM Serving System on Edge Devices"
venue: "MobiSys"
year: 2025
# 搜索标签：自由关键词，不参与图谱归属
tags: [ "LoRA", "Edge Inference", "llama.cpp", "Adapter Scheduling" ]
# 作者按原文顺序填写
authors:
  - Zheyu Shen
  - Yexiao He
  - Ziyao Wang
  - Yuning Zhang
  - Guoheng Sun
  - Wanghao Ye
  - Ang Li
# 阅读状态：待阅读 / 已阅读 / 精读；优先级：P1 / P2 / P3
status: "待阅读"
priority: "P1"
# 简短摘要：用于检索和论文概览
summary: "EdgeLoRA 扩展 llama.cpp，在边缘设备上组合 adapter 路由、异构内存管理和 batch LoRA inference；论文基于合成负载报告相对 llama.cpp 的吞吐提升，结果依赖设备、模型和负载参数。"

# ======== 相关目录 ========
# 线上论文与代码链接，没有则留空
paperUrl: "https://doi.org/10.1145/3711875.3729141"
codeUrl: "https://github.com/shenzheyu/EdgeLoRA"
# 本地论文 PDF：相对项目根目录，随网站发布并在新标签页预览
localPdf: "Paper/papers/MobiSys_2025_EdgeLoRA.pdf"
# 本地 Markdown 笔记：文件自身的相对路径，构建时自动校正
localNote: "Paper/notes/端侧推理/MobiSys_2025_EdgeLoRA/MobiSys_2025_EdgeLoRA.md"
---

# 小结

## 一句话判断

EdgeLoRA 研究如何在边缘设备上同时服务多个 LoRA adapter，重点是减少手工 adapter 选择、降低加载/切换成本并提高异构设备计算利用率。

## 研究问题与方法

系统扩展 llama.cpp，包含自适应 adapter 选择、结合 cache 与预分配 memory pool 的异构内存管理，以及把基础模型与 LoRA adapter 计算组合起来的 batch inference。其目标平台涵盖 Jetson GPU 设备和仅 CPU 的 Raspberry Pi 5。

## 主要证据与边界

论文测试 Llama3.1-8B、Llama3.2-3B、OpenELM-1.1B，并用 Gamma 到达间隔和 adapter 热度等参数生成合成请求轨迹。作者报告不同配置相对 llama.cpp 的吞吐提升约 2–4×，并测试最高 2,000 个 adapter 的规模场景；这不表示 2,000 个 adapter 同时驻留内存，也不代表真实线上流量下收益不变。

## 待确认

会议为 ACM MobiSys 2025；本地 PDF 给出 DOI。作者提供了公开实现仓库地址。个人复现结果尚不存在，状态保持“待阅读”。

# 精读

> Source coverage: Full supplied PDF text; visual page review incomplete.
> Extraction confidence: Mixed; text extracted, figures not independently parsed.
> Locator mode: structure-grounded.
> Primary analytical lens: Methods.
> Secondary analytical lens: None.
> Context verification: Targeted external check for venue and publication record.
> Card completeness: Complete relative to supplied source.

`[Paper]` 表示所给 PDF 报告；`[External]` 表示正式出版记录；`[Analysis]` 表示证据推理；`[Hypothesis]` 表示待实验验证。PDF 页码解析脚本未能运行，以下仅用章节、图表定位。

## 01 基本信息

- [Paper] 会议：ACM MobiSys 2025；论文 DOI：10.1145/3711875.3729141。
- [External] [ACM MobiSys 2025 论文集](https://doi.org/10.1145/3711875)；[本文 DOI](https://doi.org/10.1145/3711875.3729141)。
- [Paper] 方向：edge inference、multi-tenant LoRA serving、adapter routing 和内存管理。
- [Paper] 实现基于 llama.cpp；[作者代码仓库](https://github.com/shenzheyu/EdgeLoRA)。

## 02 一句话总结

[Paper] EdgeLoRA 组合自适应 adapter 选择、异构内存池管理与 batch LoRA inference，以提高多租户边缘设备上的请求并行度和吞吐。

## 03 研究问题

- 问题：资源受限的 edge device 如何在共享基础模型上服务多个任务 adapter？
- 约束：adapter 数量可能超过设备内存可同时容纳范围；频繁交换会增加等待；不同后端（GPU/CPU）计算特性不同。
- 研究问题：[Analysis] 能否同时优化 adapter 选择、adapter 驻留与请求批处理，而不要求用户每次手动指定 adapter？

## 04 背景与定位

[Paper-framed] 论文认为现有 serving 框架对多租户 edge 场景中的自动 adapter 选择、受限内存下的管理和并行 LoRA 执行支持不足。EdgeLoRA 在 llama.cpp 上扩展端侧服务能力，不是云集群专用的分布式 serving 系统。[Paper: Sections 1–2]

## 05 核心问题

| 问题 | 表现 | 论文解释 | 出处 |
| --- | --- | --- | --- |
| Adapter 选择负担 | 用户需从多个专用 adapter 中手动挑选 | 选择错误或不熟悉 adapter 能力会影响任务质量 | [Paper: Section 1; Figure 1] |
| 内存与切换受限 | 多个 adapter 无法同时全部放入设备内存 | edge memory 有限，换入换出会带来等待 | [Paper: Sections 1, 3.3] |
| LoRA 执行利用率不足 | 未合并 adapter 的请求难以充分批处理 | 请求与 adapter 多样且负载动态 | [Paper: Sections 1, 3.4] |

## 06 核心思路

1. [Paper] Router 根据请求内容选择候选 adapter，并考虑内存缓存可用性。
2. [Paper] Heterogeneous memory manager 结合 cache 与预分配 pool，降低 adapter 管理开销。
3. [Paper] Batch LoRA inference 将基础权重与不同 adapter 的操作组织成统一处理流程。
4. [Analysis] 三项机制耦合：路由改变 adapter 热度，热度影响缓存命中，缓存状态又反过来影响路由成本。

## 07 方法流程

```text
输入请求
  -> adapter router 给出候选/排序
  -> 查询 adapter cache 与预分配 memory pool
  -> 未命中时调度 adapter 换入
  -> slot 状态机组织请求和 batch
  -> llama.cpp 后端执行基础模型与 LoRA 计算
  -> 更新缓存状态、吞吐和请求完成信息
```

[Paper: Sections 3–4; Figures 3–7]

## 08 模块拆解

| 模块 | 职责 | 输入/输出 | 支持证据 | 移除后的影响 |
| --- | --- | --- | --- | --- |
| Adaptive Adapter Selection | 为请求选择适配器 | 请求与候选 adapter -> 排序/选择 | [Paper: Section 3.2; Figure 4; Table 12] | 回到手动指定，或失去自动路由效果 |
| Heterogeneous Memory Manager | 管理 adapter 缓存与 pool | 内存状态、adapter -> 装载/淘汰动作 | [Paper: Section 3.3; Figure 5] | 可能增加分配和换入成本 |
| Batch LoRA inference | 将请求组织为并行计算 | batch 与 adapter -> 推理输出 | [Paper: Section 3.4; Figure 6] | 计算资源利用率可能降低 |
| Slot state machine | 控制并发请求阶段 | 请求状态 -> 可执行 slot/batch | [Paper: Figure 7; Table 14] | 并发数与批处理行为改变 |

## 09 关键公式

[Paper] adapter 到达采用 Gamma process 建模；到达间隔变异系数用于控制负载 burstiness，adapter popularity/locality 参数用于生成不同热度分布。具体参数与默认值见 Table 3。该工作核心是系统机制，当前笔记不重录 router 公式以避免从排版文本误读。[Paper: Section 5.1; Table 3]

## 10 实验与证据链

- [Paper] 模型：Llama3.1-8B、Llama3.2-3B、OpenELM-1.1B；硬件：Jetson AGX Orin、Jetson Orin Nano、Raspberry Pi 5（CPU）。[Paper: Section 5; Table 2]
- [Paper] 对照：llama.cpp；也比较 EdgeLoRA 自身关闭 Adaptive Adapter Selection 的变体。[Paper: Sections 5.1–5.3]
- [Paper] 工作负载为合成 trace：Gamma request arrivals、adapter popularity/locality、输入/输出长度；默认 trace 持续 5 分钟。[Paper: Section 5.1; Table 3]
- [Paper] 指标包括 throughput、平均请求 latency、first-token latency、SLO attainment 和功耗。[Paper: Section 5; Tables 4–14; Figures 8]
- [Paper] 作者报告最高约 4× throughput 增益，正文概括多配置为 2–4×；在特定测试配置下展示对多达 1,000/2,000 adapter 的扩展结果。[Paper: Abstract; Sections 5.1–5.3; Figures 8]
- [Analysis] “支持大量 adapter”不等于全部常驻显存；性能与合成到达、热度、槽位数、功耗档位及设备类型相关。

## 11 结论边界

[Paper] 证据支持 EdgeLoRA 在测试的三类边缘设备、模型和合成多租户负载下，相对论文设定的 llama.cpp baseline 改善吞吐/时延指标。它不能单独证明真实长期部署中的路由质量、adapter 分布、持续热约束或所有 llama.cpp 后端均有相同收益。

## 12 作者说明的局限

所给 PDF 未发现单独的作者局限章节或明确列出的 limitations。合成负载和指定设备是论文的评测设计/范围；下节将外推风险作为分析，不冒充作者承认。

## 13 分析与待验证问题

| 分析观察 | 可能影响 | 验证方法 | 依据 |
| --- | --- | --- | --- |
| 核心 serving trace 为合成而非线上记录 | adapter 热度、请求 burstiness 与真实用户可能不一致 | 使用匿名真实 trace replay 并对照 Table 3 参数 | [Paper: Section 5.1] |
| Adapter router 选择质量会影响推理回答质量 | 系统吞吐提升可能伴随任务质量变化 | 同时评测任务准确率/路由准确率与延迟，报告错误路由成本 | [Paper: Section 5.2; Table 12] |
| 高 adapter 数量图不等于全部 adapter 同时驻留 | “支持数量”容易被误读为显存容量 | 分开报告磁盘总量、驻留数量、cache hit 和换入时延 | [Paper: Sections 5.1–5.2; Figure 8] |

## 14 可迁移知识

**Agent-derived knowledge candidates**

- 端侧 serving 的系统指标应一起看吞吐、TTFT、能耗、SLO 和 adapter 换入成本。
- 通过状态机显式管理 request slot，有助于把“生成中请求”和“等待 adapter”的资源状态区分开。

## 15 相关方向连接

[Analysis] MobiLoRA 主要减少 LoRA adapter 请求的 KV 冗余，EdgeLoRA 管理 adapter 选择、驻留和 batch 执行。dLoRA 的动态 merged/unmerged 思路与 EdgeLoRA 的边缘 batch 执行相关，但硬件、网络和内存边界不同，不能直接套用性能结论。

## 16 候选研究想法

**Agent-derived research candidate；新颖性未核实**

- 来源问题：[Paper] 论文使用合成请求轨迹，并报告 router 质量与 serving 指标。[Paper: Sections 5.1–5.2]
- 假设：[Hypothesis] 将 router 不确定性纳入 adapter cache 与 batch scheduler，可在路由风险高时降低质量回退，同时保持大部分吞吐收益。
- 相对本文的变化：把 router confidence 和回答质量风险作为调度信号，而非只优化 adapter 可用性/系统成本。
- Validation: 使用真实或固定公开任务 trace，对比 EdgeLoRA、关闭 router 和 confidence-aware router，测任务质量、TTFT、吞吐、能耗和换入次数。
- Failure modes: confidence 与任务正确率不校准；额外评估增加首 token 延迟。
- 创新状态：`unverified`，需要先做 prior-art search。
