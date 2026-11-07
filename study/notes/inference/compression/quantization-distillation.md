---
id: study-compression
title: "量化与蒸馏：两种不同的压缩路线"
shortTitle: "量化与蒸馏"
authors: "Litstar"
year: 2026
type: "study"
topics: ["inference"]
concepts: ["quantization", "distillation"]
category: "模型压缩"
stage: "概念与机制"
status: "待学习"
tags: ["量化", "蒸馏", "精度", "模型压缩"]
summary: "待学习：量化改变数值表示，蒸馏通过教师信号训练学生；分别验证质量与部署收益。"
---

## 对比框架

| 维度 | 量化 | 蒸馏 |
| --- | --- | --- |
| 主要改变 | 权重 / 激活 / 缓存的数值表示 | 学生模型的训练信号与可能的结构 |
| 关键问题 | 精度、校准、量化粒度、内核支持 | 教师信号、学生容量、数据与损失 |
| 部署评测 | 内存、实际内核、质量、吞吐与延迟 | 学生质量、资源成本与任务迁移 |

## 待做记录

选一个可复现基线，分别记录模型、框架、硬件、工作负载与质量指标。不能仅根据位宽推断运行速度，也不能将训练成本忽略不计。

## 原始资料

- [GPTQ](https://arxiv.org/abs/2210.17323)
- [Distilling the Knowledge in a Neural Network](https://arxiv.org/abs/1503.02531)
