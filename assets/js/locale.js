const translations = {
    zh: {
        "header.home": "个人主页", "header.IO": "推理优化", "header.paper": "论文索引", "header.study": "学习笔记",
        "breadcrumb.io": "推理优化", "profile.role": "大模型推理优化 · 后端工程", "profile.caption": "阅读论文，拆解系统，用实验验证理解。",
        "profile.paper": "论文索引 ↗", "profile.study": "学习笔记 ↗", "nav.onPage": "本页导航", "nav.overview": "研究概览",
        "nav.roadmap": "阅读路线", "nav.progress": "近期进展", "nav.skills": "技能与工具", "nav.reports": "汇报与实验",
        "overview.kicker": "研究方向", "overview.title": "大模型推理优化", "overview.lead": "我正在围绕动态大模型推理、键值缓存、请求调度与服务工程建立自己的阅读和实践路线。",
        "overview.roadmap": "查看阅读路线 ↓", "overview.progress": "查看近期进展 ↓", "overview.papers": "浏览相关论文 ↗",
        "roadmap.kicker": "阅读路线", "roadmap.title": "五个阅读阶段", "roadmap.note": "建议阅读路径，不代表完成进度",
        "phase.01.title": "基础机制", "phase.01.body": "变换器架构、注意力、键值缓存与计算瓶颈。",
        "phase.02.title": "模型压缩", "phase.02.body": "量化、剪枝、蒸馏与质量和效率的权衡。",
        "phase.03.title": "推理系统", "phase.03.body": "连续批处理、分页注意力与请求调度。",
        "phase.04.title": "服务工程", "phase.04.body": "延迟、吞吐、并发、成本与可观测性。",
        "phase.05.title": "实践复现", "phase.05.body": "实验设置、基准对照、结论边界与后续问题。",
        "phase.link": "查看文献 ↗", "progress.kicker": "整理与实践", "progress.title": "近期进展",
        "progress.01.title": "完成知识库拆分", "progress.01.body": "将个人主页、推理优化专题、论文库和学习笔记拆成独立入口，笔记由构建脚本自动索引。",
        "progress.02.title": "建立推理优化阅读路线", "progress.02.body": "从注意力、键值缓存到推理系统和服务工程，按五个阶段整理阅读顺序。",
        "progress.03.title": "准备复现与基准记录", "progress.03.body": "下一步补充 vLLM、PagedAttention 和量化相关实验，记录设置、指标与结论边界。",
        "progress.done": "已完成", "progress.active": "进行中", "progress.next": "下一步",
        "skills.kicker": "技术积累", "skills.title": "技能与工具", "skill.java": "Java / Spring Boot", "skill.vue": "Vue",
        "skill.system": "Linux / Docker", "skill.llm": "LLM / vLLM", "skill.web": "Node.js / Markdown",
        "reports.kicker": "阅读与实验记录", "reports.title": "专题汇报与实验", "reports.papers": "查看相关论文 ↗",
        "library.searchLabel": "搜索标题、作者与正文", "library.search": "搜索标题、作者、关键词或正文…", "library.reset": "清空搜索和筛选",
        "filter.topic": "按专题筛选", "filter.stage": "按阶段筛选", "filter.category": "按方向筛选", "filter.status": "按阅读状态筛选",
        "filter.tag": "按标签筛选", "filter.priority": "按优先级筛选", "library.all.topic": "全部专题", "library.all.stage": "全部阶段",
        "library.all.category": "全部方向", "library.all.status": "全部状态", "library.all.tag": "全部标签", "library.all.priority": "全部优先级",
        "language.label": "切换到英文", "language.button": "English",
    },
    en: {
        "header.home": "About", "header.IO": "IO · Inference", "header.paper": "Paper · Library", "header.study": "Study · Notes",
        "breadcrumb.io": "Inference Optimization", "profile.role": "LLM inference optimization · backend engineering",
        "profile.caption": "Read papers, break down systems, and test ideas with experiments.", "profile.paper": "Paper library ↗",
        "profile.study": "Study notes ↗", "nav.onPage": "ON THIS PAGE", "nav.overview": "Overview", "nav.roadmap": "Roadmap",
        "nav.progress": "Progress", "nav.skills": "Skills & tools", "nav.reports": "Reports & experiments",
        "overview.kicker": "RESEARCH", "overview.title": "LLM Inference Optimization",
        "overview.lead": "I am building a reading and practice roadmap around dynamic LLM inference, KV cache management, request scheduling, and serving systems.",
        "overview.roadmap": "View roadmap ↓", "overview.progress": "View progress ↓", "overview.papers": "Browse related papers ↗",
        "roadmap.kicker": "READING ROADMAP", "roadmap.title": "Five reading phases", "roadmap.note": "Suggested path, not completion progress",
        "phase.01.title": "Foundations", "phase.01.body": "Transformer, attention, KV cache, and compute bottlenecks.",
        "phase.02.title": "Model compression", "phase.02.body": "Quantization, pruning, distillation, and quality-efficiency trade-offs.",
        "phase.03.title": "Inference systems", "phase.03.body": "Continuous batching, PagedAttention, and request scheduling.",
        "phase.04.title": "Serving engineering", "phase.04.body": "Latency, throughput, concurrency, cost, and observability.",
        "phase.05.title": "Reproduction", "phase.05.body": "Experiment setup, baselines, conclusion boundaries, and next questions.",
        "phase.link": "View papers ↗", "progress.kicker": "CURRENT PROGRESS", "progress.title": "Current progress",
        "progress.01.title": "Separated the knowledge workspaces", "progress.01.body": "The homepage, IO workspace, paper library, and Study notes now have independent routes with automatic Markdown indexing.",
        "progress.02.title": "Built an inference optimization roadmap", "progress.02.body": "The reading order now moves from attention and KV cache to inference systems and serving engineering.",
        "progress.03.title": "Preparing reproductions and benchmarks", "progress.03.body": "The next step is to add vLLM, PagedAttention, and quantization experiments with explicit metrics and limitations.",
        "progress.done": "Done", "progress.active": "In progress", "progress.next": "Next",
        "skills.kicker": "SKILLS & TOOLS", "skills.title": "Skills & tools", "skill.java": "Java / Spring Boot", "skill.vue": "Vue",
        "skill.system": "Linux / Docker", "skill.llm": "LLM / vLLM", "skill.web": "Node.js / Markdown",
        "reports.kicker": "REPORTS & EXPERIMENTS", "reports.title": "Reports & experiments", "reports.papers": "View related papers ↗",
        "library.searchLabel": "Search titles, authors, and notes", "library.search": "Search titles, authors, tags, or note text…", "library.reset": "Clear search and filters",
        "filter.topic": "Filter by topic", "filter.stage": "Filter by phase", "filter.category": "Filter by direction", "filter.status": "Filter by status",
        "filter.tag": "Filter by tag", "filter.priority": "Filter by priority", "library.all.topic": "All topics", "library.all.stage": "All phases",
        "library.all.category": "All directions", "library.all.status": "All statuses", "library.all.tag": "All tags", "library.all.priority": "All priorities",
        "language.label": "Switch to Chinese", "language.button": "中文",
    },
};

function currentLanguage() {
    const requested = new URLSearchParams(location.search).get("lang");
    if (["zh", "en"].includes(requested)) return requested;
    try {
        const saved = localStorage.getItem("litstar-language-v2");
        return ["zh", "en"].includes(saved) ? saved : "en";
    } catch {
        return "en";
    }
}

function ioText(key) {
    const language = document.documentElement.lang === "en" ? "en" : "zh";
    return translations[language][key] || translations.zh[key] || key;
}

function applyLanguage(language) {
    try { localStorage.setItem("litstar-language-v2", language); } catch { /* Preference storage can be unavailable. */ }
    document.documentElement.lang = language === "en" ? "en" : "zh-CN";
    for (const element of document.querySelectorAll("[data-i18n]")) {
        element.textContent = translations[language][element.dataset.i18n] || translations.zh[element.dataset.i18n] || element.textContent;
    }
    for (const element of document.querySelectorAll("[data-zh][data-en]")) {
        element.textContent = element.dataset[language];
    }
    for (const element of document.querySelectorAll("[data-i18n-placeholder]")) {
        element.placeholder = translations[language][element.dataset.i18nPlaceholder] || element.placeholder;
    }
    for (const element of document.querySelectorAll("[data-i18n-aria]")) {
        element.setAttribute("aria-label", translations[language][element.dataset.i18nAria] || element.getAttribute("aria-label"));
    }
    for (const element of document.querySelectorAll("[data-i18n-title]")) {
        element.title = translations[language][element.dataset.i18nTitle] || element.title;
    }
    for (const option of document.querySelectorAll("[data-filter-all]")) {
        option.textContent = ioText(`library.all.${option.dataset.filterAll}`);
    }
    const toggle = document.querySelector("#language-toggle");
    if (toggle) {
        toggle.textContent = translations[language]["language.button"];
        toggle.setAttribute("aria-label", translations[language]["language.label"]);
    }
    document.title = language === "en" ? "Litstar | Personal homepage" : "小星 · 个人主页";
    const description = document.querySelector('meta[name="description"]');
    if (description?.dataset[language]) description.content = description.dataset[language];
    for (const element of document.querySelectorAll("[data-aria-zh][data-aria-en]")) {
        element.setAttribute("aria-label", element.dataset[language === "en" ? "ariaEn" : "ariaZh"]);
    }
    for (const element of document.querySelectorAll("[data-alt-zh][data-alt-en]")) {
        element.alt = element.dataset[language === "en" ? "altEn" : "altZh"];
    }
    for (const link of document.querySelectorAll("a[data-language-link]")) {
        const url = new URL(link.href);
        url.searchParams.set("lang", language);
        link.href = `${url.pathname}${url.search}${url.hash}`;
    }
    window.dispatchEvent(new CustomEvent("languagechange", { detail: { language } }));
}

document.querySelector("#language-toggle")?.addEventListener("click", () => {
    const language = document.documentElement.lang === "en" ? "zh" : "en";
    const url = new URL(location.href);
    url.searchParams.set("lang", language);
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    applyLanguage(language);
});

window.SiteLocale = { t: ioText, get language() { return document.documentElement.lang === "en" ? "en" : "zh"; } };
window.addEventListener("popstate", () => applyLanguage(currentLanguage()));
applyLanguage(currentLanguage());
