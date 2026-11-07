---
id: llm-inference-optimization
title: "LLM 推理优化知识地图"
authors: "Litstar"
year: ""
venue: "学习路线"
type: "map"
stage: "总览 · 学习路线"
category: "知识地图"
line: "LLM 推理优化"
status: "进行中"
priority: ""
example: true
tags: ["推理优化", "KV Cache", "系统视角"]
summary: "从计算、显存、访存和调度四个角度理解大模型推理优化，作为后续阅读 vLLM 与量化论文的总入口。"
paperUrl: ""
codeUrl: ""
translations:
  en:
    title: "LLM Inference Optimization: A Knowledge Map"
    summary: "A systems-oriented reading map covering compute, memory capacity, memory traffic, and scheduling."
    venue: "Reading roadmap"
    stage: "Overview · Reading roadmap"
    category: "Knowledge map"
    status: "In progress"
    tags: ["Inference optimization", "KV cache", "Systems"]
    body: |
      ## Start with a systems perspective

      Inference optimization balances quality, latency, throughput, memory use, and engineering complexity. Identify the bottleneck a paper targets before evaluating its method.

      ## Reading checkpoints

      - Prefill often benefits from compute parallelism, while decode is frequently affected by memory traffic and KV cache access.
      - Batch size, sequence length, and hardware bandwidth change which approach is effective. A single metric does not describe the whole system.
      - Separate the problem, method, experiment setup, and limitations instead of only remembering a method name.

      ## Next steps

      Read PagedAttention, FlashAttention, and quantization work, recording which bottleneck each method changes.
---

## 为什么先从系统视角开始

推理优化不是单独优化某个算子，而是在质量、延迟、吞吐、显存和工程复杂度之间做权衡。阅读后续论文时，需要先判断它主要缓解的是哪一种瓶颈。

## 阅读要点

- Prefill 阶段更接近计算密集型任务，Decode 阶段通常受到访存和 KV Cache 的影响。
- Batch size、序列长度和硬件带宽会共同改变最优方案，单一指标不能代表系统体验。
- 一篇论文的核心贡献应该拆成问题、方法、实验设置和结论边界，避免只记住方法名。

## 下一步

继续阅读 PagedAttention、FlashAttention 和量化相关工作，并记录它们分别改变了哪一个系统瓶颈。
