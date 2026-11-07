---
id: study-vla
title: "VLM 到 VLA：从理解图像到动作闭环"
shortTitle: "VLM 与 VLA"
authors: "Litstar"
year: 2026
type: "study"
topics: ["multimodal"]
concepts: ["vlm", "vla", "imitation"]
category: "具身与动作"
stage: "概念与机制"
status: "待学习"
tags: ["VLM", "VLA", "具身智能", "动作"]
summary: "待学习：区分视觉语言理解、动作表示与环境闭环，不把 VLT 未确认缩写当作同义词。"
---

## 学习关系

VLM 处理视觉与语言，VLA 增加动作建模与执行任务。控制、数据与评测对象的变化需要独立理解，不能只按多了一个输出层来推断系统难度。

## 待回答

- 视觉编码器、连接模块、语言模型怎样传递信息？
- 动作是离散 token、连续向量还是一段轨迹？
- 模仿学习和强化学习各在什么条件下使用？
- 如何在仿真中比较任务成功率、失败类型与安全约束？

## 当前状态

尚无机器人或仿真实验。后续记录数据、环境、模型、控制频率、任务与评测口径。

用户提到的 VLT 另列为待确认术语，不自动改成 VLM 或 VLA。

## 原始资料

- [RT-2](https://arxiv.org/abs/2307.15818)
- [OpenVLA](https://github.com/openvla/openvla)
