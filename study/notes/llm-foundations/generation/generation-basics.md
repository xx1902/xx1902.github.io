---
id: generation-basics
title: "大模型基础：从 Token 到生成"
shortTitle: "Token → 生成"
authors: "Litstar"
year: 2026
type: "study"
topics: ["llm-foundations"]
concepts: ["generation", "tokenizer", "attention"]
category: "生成机制"
stage: "概念与机制"
status: "待学习"
tags: ["Tokenizer", "Attention", "Prefill", "Decode"]
summary: "待学习提纲：梳理输入分词、注意力计算和逐步生成的关系，建立后续阅读源码时的问题清单。"
---

> 这是学习起点与问题清单，不代表已经完成学习或实验。观察与结论留待实际实践后补充。

## 要弄清楚的问题

- 一段输入如何变成 Token ID？模型输入与原始文字有什么区别？
- Q、K、V 分别来自哪里？注意力的输入输出形状如何变化？
- 预填充（Prefill）和解码（Decode）各自做什么？如何观察它们的耗时？
- KV Cache 保存了什么？请求长度和并发变化时，显存如何变化？
- 输出采样参数如何影响生成？如何保存参数，便于再次比较？

## 最小练习

1. 选择可合法使用、适合本机资源的模型，记录来源与版本。
2. 保存同一段提示词、Token 数量、采样参数和输出上限。
3. 观察首次输出与后续生成，保留原始输出，不先填写性能结论。
4. 画出自己理解的“文字 → Token → 模型 → 下一个 Token → 文字”流程。

## 记录模板

| 项目 | 实际记录 |
| --- | --- |
| 日期、硬件、系统 | 待填写 |
| 模型与版本 | 待填写 |
| 输入与生成参数 | 待填写 |
| 观察到的现象 | 待填写 |
| 尚未解释的问题 | 待填写 |

## 相关文献

[Attention Is All You Need：论文记录](/paper/#note=attention-is-all-you-need)

## 下一篇可以写

分词实验、注意力张量形状、一次解码的计算路径，分别整理成独立 Markdown。
