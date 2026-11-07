---
id: study-rl-alignment
title: "强化学习与大模型对齐：先区分目标和算法"
shortTitle: "强化学习与对齐"
authors: "Litstar"
year: 2026
type: "study"
topics: ["adaptation"]
concepts: ["rl", "alignment"]
category: "强化学习与对齐"
stage: "概念与机制"
status: "待学习"
tags: ["强化学习", "RLHF", "PPO", "GRPO"]
summary: "待学习：从策略、回报与优势出发，区分 SFT、反馈对齐和具体策略优化算法。"
---

## 前置知识

概率分布、梯度优化、策略与价值、奖励和评价指标。不要把所有偏好优化都等同于在线强化学习。

## 待回答

- 语言生成中的状态、动作与回报如何定义？
- 奖励来自人工偏好、规则还是环境？怎样检查奖励投机？
- PPO、GRPO 的目标、基线和采样方式有何不同？
- 推理服务如何为训练中的 rollout 供给吞吐？权重同步是否影响测量？

## 实践证据

先从小任务与可解释奖励开始；记录基线、随机种子、训练预算、评测与失败样例。本笔记目前没有训练结果。

## 原始资料

- [PPO](https://arxiv.org/abs/1707.06347)
- [InstructGPT / RLHF](https://arxiv.org/abs/2203.02155)
- [DeepSeekMath / GRPO](https://arxiv.org/abs/2402.03300)
