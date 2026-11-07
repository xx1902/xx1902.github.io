---
id: study-speculative-decoding
title: "投机解码：草稿、验证与接受率"
shortTitle: "投机解码"
authors: "Litstar"
year: 2026
type: "study"
topics: ["inference"]
concepts: ["speculative", "generation"]
category: "推理加速"
stage: "概念与机制"
status: "待学习"
priority: "P1"
tags: ["投机解码", "Decode", "接受率"]
summary: "待学习：区分草稿生成与目标模型验证，记录接受率、额外计算和适用负载。"
---

## 关键关系

先理解自回归生成，再区分草稿模型与目标模型的执行职责。蒸馏可以用于训练草稿模型，但不是所有投机解码方案都依赖蒸馏。

## 学习问题

- 所选算法如何保持目标输出分布？随机采样与贪心验证是否相同？
- 接受率、草稿开销、批大小、输入输出长度怎样影响收益？
- 更低延迟是否伴随额外资源？高并发下结论是否改变？

## 最小对照

固定目标模型、运行时版本、精度、输出限制与数据集，分别运行普通解码和选定方案；保存正确性、TTFT、TPOT、吞吐、接受率、资源指标及原始日志。

当前没有实测结果，不填加速倍数。

## 原始资料

- [Fast Inference from Transformers via Speculative Decoding](https://arxiv.org/abs/2211.17192)
- [vLLM 官方文档](https://docs.vllm.ai/en/latest/)
