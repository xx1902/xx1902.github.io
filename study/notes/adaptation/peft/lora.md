---
id: study-lora
title: "LoRA：已掌握内容的整理提纲"
shortTitle: "LoRA"
authors: "Litstar"
year: 2026
type: "study"
topics: ["adaptation"]
concepts: ["lora", "qlora", "sft"]
category: "参数高效微调"
stage: "概念与机制"
status: "进行中"
priority: "P1"
tags: ["LoRA", "PEFT", "低秩适配"]
summary: "用户自评掌握 LoRA；本记录是待补齐个人实验依据的整理框架，不代表新增了实验结果。"
---

## 当前自评

知识图谱将 LoRA 标为「掌握」，来自个人自评，不从笔记篇数推断。笔记本身仍在整理，未填充的实验不视为已完成。

## 应能解释的问题

- 冻结基座、训练低秩增量时，优化的参数是什么？秩与缩放因子各起什么作用？
- LoRA 可以用于哪些层？为什么目标模块需要和具体模型实现对应？
- 训练参数量、优化器状态、激活、基座权重分别占什么内存？
- 合并权重、未合并适配器、多适配器推理有哪些不同约束？
- LoRA 是微调方法；它不自动保证推理更快。QLoRA 将量化基座与适配组合，不能和普通量化部署混为一谈。

## 个人实践证据

| 记录 | 待补内容 |
| --- | --- |
| 模型与版本 | 基座、提交、许可证 |
| 数据与任务 | 样本来源、拆分、损失掩码 |
| 配置 | rank、alpha、目标模块、精度、优化器 |
| 观察 | 显存、质量、训练时间、失败案例 |
| 部署 | 合并前后正确性、延迟与适配器切换 |

## 与其他知识点的关系

SFT 是训练目标与数据组织问题；LoRA 是参数更新方式。QLoRA 组合量化与低秩适配。模型部署时要另行验证运行时对适配器的支持。

## 官方资料

- [LoRA 原论文](https://arxiv.org/abs/2106.09685)
- [PEFT 官方 LoRA 文档](https://huggingface.co/docs/peft/developer_guides/lora)
- [QLoRA 原论文](https://arxiv.org/abs/2305.14314)
