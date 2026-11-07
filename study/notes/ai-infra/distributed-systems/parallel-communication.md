---
id: study-parallel-communication
title: "分布式推理：并行切分与通信"
shortTitle: "TP / PP / EP"
authors: "Litstar"
year: 2026
type: "study"
topics: ["ai-infra"]
concepts: ["parallel", "collectives"]
category: "分布式系统"
stage: "源码与实践"
status: "待学习"
tags: ["TP", "PP", "EP", "NCCL"]
summary: "待学习：分别理解张量、流水线与专家并行，记录通信拓扑与资源约束。"
---

## 学习问题

- 各并行方式切分什么对象？哪些数据需要交换？
- 集合通信与点对点通信分别出现在哪里？
- 模型、批大小、拓扑和设备数量如何影响有效吞吐？
- 计算通信重叠的观察证据是什么？

## 实验记录框架

先固定模型与实现版本。记录设备、互联、并行配置、输入输出长度、吞吐、延迟、通信时间与原始日志。没有多卡资源时保留学习问题，不填写推测的性能数值。

## 原始资料

- [NCCL 官方文档](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/)
- [vLLM 官方文档](https://docs.vllm.ai/en/latest/)
