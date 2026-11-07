---
id: llama-cpp-roadmap
title: "llama.cpp：构建、模型加载与源码阅读路线"
shortTitle: "llama.cpp 入门路线"
authors: "Litstar"
year: 2026
type: "study"
topics: ["llama-cpp"]
concepts: ["llama-runtime", "ggml"]
category: "运行时与源码"
stage: "源码与实践"
status: "待学习"
tags: ["llama.cpp", "GGUF", "CMake", "源码阅读"]
summary: "从官方构建文档出发，按模型加载、上下文创建、执行路径和基准记录组织后续学习。"
---

> 这是待执行的学习提纲，不是已跑通的部署教程。具体命令与源码路径以所选提交的官方文档为准。

## 先固定版本与环境

- 记录仓库地址、提交哈希、操作系统、编译器和硬件。
- 根据实际硬件选择构建后端，不把其他机器的参数直接当作本机配置。
- 模型只使用拥有相应许可的文件，记录来源、量化形式和文件大小。

## 阅读路线

1. **构建与运行**：对照官方构建文档完成一次本机构建，保存完整命令和输出。
2. **模型加载**：追踪 GGUF 文件如何被读取，模型参数与权重在哪里进入运行时。
3. **上下文与批次**：寻找上下文创建、批次构造和解码入口，画出调用关系。
4. **执行路径**：沿选定后端理解计算图与算子，不急于一次读完全部实现。
5. **服务与基准**：区分服务端功能验证和性能测量，记录测试工具的参数与版本。

## 每次源码阅读记录

```text
提交：
问题：
文件与符号：
调用方：
下游执行：
观察／证据：
还没理解的部分：
```

## 实践记录

待补充本机构建日志、最小运行结果和实际踩坑。没有运行前不填写“已完成”。

## 官方入口

- [llama.cpp 仓库](https://github.com/ggml-org/llama.cpp)
- [构建文档](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md)
- [服务端说明](https://github.com/ggml-org/llama.cpp/tree/master/tools/server)

## 后续拆分

可以继续在当前目录添加 `build-on-windows.md`、`gguf-loading.md`、`decode-path.md` 和 `benchmark-log.md`。页面会递归索引这里的 Markdown。
