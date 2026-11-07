const state = {
    papers: [],
    selectedId: null,
    loaded: false,
    taxonomy: null,
};
const paperLibrary = document.body.dataset.section === "paper";
function readingStatus(status) {
    if (["精读", "已精读"].includes(status)) return "精读";
    if (["已阅读", "已读"].includes(status)) return "已阅读";
    return "待阅读";
}
function matchesReadingStatus(status, requested) {
    const current = readingStatus(status);
    const target = readingStatus(requested);
    return target === "已阅读" ? current === "已阅读" || current === "精读" : current === target;
}
function displayTitle(note) {
    return paperLibrary ? note.shortTitle || note.title : note.title;
}
const libraryEnglish = () => document.body.dataset.section === "research" && window.SiteLocale?.language === "en";
const libraryText = (zh, en) => libraryEnglish() ? en : zh;
const metadataEnglish = {
    "Phase 01 · 基础机制": "Phase 01 · Foundations",
    "Phase 02 · 模型压缩": "Phase 02 · Model compression",
    "Phase 03 · 推理系统": "Phase 03 · Inference systems",
    "Phase 04 · 服务工程": "Phase 04 · Serving engineering",
    "Phase 05 · 实践复现": "Phase 05 · Reproduction",
    "未分类": "Uncategorized", "待读": "To read", "进行中": "In progress", "已精读": "Read",
};
function visibleNote(note) {
    if (!libraryEnglish()) return note;
    const translated = note.translations?.en || {};
    return {
        ...note, ...translated,
        title: translated.title || (/[一-鿿]/.test(note.title) ? "Untitled English translation" : note.title),
        summary: translated.summary || (!/[一-鿿]/.test(note.summary) ? note.summary : "An English summary is not available yet."),
        stage: translated.stage || metadataEnglish[note.stage] || (/[一-鿿]/.test(note.stage) ? "Other" : note.stage),
        category: translated.category || metadataEnglish[note.category] || (/[一-鿿]/.test(note.category) ? "Other" : note.category),
        status: translated.status || metadataEnglish[note.status] || (/[一-鿿]/.test(note.status) ? "Other" : note.status),
        authors: /[一-鿿]/.test(note.authors) ? "" : note.authors,
        venue: translated.venue || (/[一-鿿]/.test(note.venue) ? "" : note.venue),
        tags: translated.tags || note.tags.filter((tag) => !/[一-鿿]/.test(tag)),
        body: translated.body ?? (!/[一-鿿]/.test(note.body) ? note.body : ""),
        html: translated.html ?? (!/[一-鿿]/.test(note.body) ? note.html : '<p>An English version is not available yet.</p>'),
        excerpt: translated.excerpt ?? (!/[一-鿿]/.test(note.excerpt) ? note.excerpt : ""),
    };
}
function localizeLibrary() {
    if (document.body.dataset.section !== "research") return;
    const english = libraryEnglish();
    const statLabels = english ? ["records", "tags", "years", "read"] : ["篇记录", "个主题", "覆盖年份", "已精读"];
    document.querySelectorAll(".stats-panel .stat > span").forEach((label, index) => { label.textContent = statLabels[index]; });
    document.querySelector("#example-note").textContent = libraryText("带「示例」标记的记录不计入个人精读进度。", "Example records are excluded from personal reading progress.");
    for (const key of ["topic", "stage", "category", "status", "tag", "priority"]) {
        for (const option of elements[key].options) {
            if (!option.value) {
                option.textContent = window.SiteLocale.t(`library.all.${key}`);
                continue;
            }
            const field = { tag: "tags", topic: "topics" }[key] || key;
            const note = state.papers.find((paper) => Array.isArray(paper[field]) ? paper[field].includes(option.value) : paper[field] === option.value);
            const translated = note ? visibleNote(note) : null;
            option.textContent = !english ? option.value : metadataEnglish[option.value]
                || (Array.isArray(note?.[field])
                    ? note.translations?.en?.[field]?.[note[field].indexOf(option.value)]
                    : translated?.[field])
                || (/[一-鿿]/.test(option.value) ? "Other" : option.value);
        }
    }
    document.querySelector(".stats-panel").setAttribute("aria-label", english ? "Record statistics" : "笔记统计");
    if (!state.selectedId) elements.detail.innerHTML = `<p class="detail-empty">${libraryText("选择一篇记录，查看阅读笔记。", "Select a record to read the note.")}</p>`;
}

const roadmapStages = [
    "Phase 01 · 基础机制",
    "Phase 02 · 模型压缩",
    "Phase 03 · 推理系统",
    "Phase 04 · 服务工程",
    "Phase 05 · 实践复现",
];

const elements = {
    list: document.querySelector("#note-list"),
    detail: document.querySelector("#note-detail"),
    search: document.querySelector("#search-input"),
    stage: document.querySelector("#stage-filter"),
    status: document.querySelector("#status-filter"),
    tag: document.querySelector("#tag-filter"),
    category: document.querySelector("#category-filter"),
    priority: document.querySelector("#priority-filter"),
    topic: document.querySelector("#topic-filter"),
    venue: document.querySelector("#venue-filter"),
    year: document.querySelector("#year-filter"),
    count: document.querySelector("#result-count"),
    paperCount: document.querySelector("#paper-count"),
    tagCount: document.querySelector("#tag-count"),
    yearCount: document.querySelector("#year-count"),
    readCount: document.querySelector("#read-count"),
};
const filterKeys = paperLibrary ? ["venue", "year", "topic", "category", "status", "priority"] : ["stage", "status", "tag", "category", "priority", "topic"];

function syncQuery() {
    const query = new URLSearchParams(location.search);
    for (const key of filterKeys) {
        query.delete(key);
        if (elements[key].value) query.set(key, elements[key].value);
    }
    query.delete("q");
    if (elements.search.value.trim()) query.set("q", elements.search.value.trim());
    history.replaceState(null, "", `${location.pathname}${query.size ? `?${query}` : ""}${location.hash}`);
    window.dispatchEvent(new CustomEvent("libraryfilterchange"));
}

function emptyDetail() {
    elements.detail.innerHTML = `<p class="detail-empty">${paperLibrary ? "选择一篇论文，查看小结。" : libraryText("选择一篇记录，查看阅读笔记。", "Select a record to read the note.")}</p>`;
}

function restoreFromUrl() {
    if (!state.loaded) return;
    const query = new URLSearchParams(location.search);
    elements.search.value = query.get("q") || "";
    if (document.body.dataset.section === "study" || paperLibrary) {
        elements.topic.value = query.get("topic") || "";
        updateStudyDirections(false);
        updatePaperDirections(false);
    }
    for (const key of filterKeys) {
        const value = query.get(key) || "";
        // Keep unknown filters explicit, instead of silently showing every record.
        if (value && ![...elements[key].options].some((option) => option.value === value)) {
            const option = new Option(value, value);
            option.dataset.unknownFilter = "true";
            elements[key].add(option);
        }
        elements[key].value = value;
    }
    localizeLibrary();
    state.selectedId = null;
    emptyDetail();
    renderList();
    selectFromHash();
    updateVenueResources();
    window.dispatchEvent(new CustomEvent("libraryrestored"));
}

async function loadPapers() {
    try {
        const response = await fetch(document.body.dataset.index);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        state.papers = await response.json();
        if (paperLibrary) {
            const mapResponse = await fetch("/paper/data/map.json");
            if (!mapResponse.ok) throw new Error(`HTTP ${mapResponse.status}`);
            state.taxonomy = await mapResponse.json();
            const { indexPaperTaxonomy } = await import("/assets/js/paper-taxonomy.mjs");
            state.papers = indexPaperTaxonomy(state.taxonomy, state.papers);
        }
        const exampleNote = document.querySelector("#example-note");
        if (exampleNote) exampleNote.hidden = !state.papers.some((paper) => paper.example);
        fillFilters();
        state.loaded = true;
        updateStats();
        if (paperLibrary) renderReadingWorkbench();
        restoreFromUrl();
        window.dispatchEvent(new CustomEvent("libraryready"));
    } catch (error) {
        elements.list.innerHTML = `<div class="empty-state">${libraryText("暂时无法加载索引，请刷新页面后重试。", "Unable to load the index. Please refresh and try again.")}</div>`;
        console.error("Unable to load paper index:", error);
    }
}

function fillFilters() {
    if (paperLibrary) {
        const values = {
            venue: [...new Set(state.papers.map((paper) => paper.venue).filter(Boolean))].sort(),
            year: [...new Set(state.papers.map((paper) => paper.year).filter(Boolean))].sort((a, b) => Number(b) - Number(a)),
            status: ["精读", "已阅读", "待阅读"],
            priority: [...new Set(["P1", "P2", "P3", ...state.papers.map((paper) => paper.priority).filter(Boolean)])].sort(),
        };
        for (const [key, choices] of Object.entries(values)) choices.forEach((value) => elements[key].add(new Option(value, value)));
        const topics = [...(state.taxonomy?.layers || []), ...(state.taxonomy?.relatedTopics || [])];
        elements.topic.replaceChildren(new Option("全部专题", ""));
        for (const topic of topics) elements.topic.add(new Option(topic.title, topic.topic));
        for (const id of new Set(state.papers.flatMap((paper) => paper.topics || []))) {
            if (!topics.some((topic) => topic.topic === id)) elements.topic.add(new Option(id, id));
        }
        updatePaperDirections();
        return;
    }
    const stages = [...new Set([
        ...(document.body.dataset.section === "study" ? [] : roadmapStages),
        ...state.papers.map((paper) => paper.stage).filter(Boolean),
    ])].sort();
    const statuses = [...new Set(state.papers.map((paper) => paper.status).filter(Boolean))].sort();
    const tags = [...new Set(state.papers.flatMap((paper) => paper.tags || []))].sort();
    const categories = [...new Set(state.papers.map((paper) => paper.category).filter(Boolean))].sort();
    const priorities = [...new Set(state.papers.map((paper) => paper.priority).filter(Boolean))].sort();
    const topics = [...new Set(state.papers.flatMap((paper) => paper.topics || []))].sort();

    stages.forEach((stage) => elements.stage.add(new Option(stage, stage)));
    statuses.forEach((status) => elements.status.add(new Option(status, status)));
    tags.forEach((tag) => elements.tag.add(new Option(tag, tag)));
    categories.forEach((category) => elements.category.add(new Option(category, category)));
    priorities.forEach((priority) => elements.priority.add(new Option(priority, priority)));
    topics.forEach((topic) => {
        if (![...elements.topic.options].some((option) => option.value === topic)) elements.topic.add(new Option(topic, topic));
    });
    updateStudyDirections(false);
}

function studyDirections(papers, topic, configured = []) {
    return [...new Set([...configured, ...papers.filter((paper) => !topic || (paper.topics || []).includes(topic))
        .map((paper) => paper.category).filter(Boolean)])].sort();
}

function paperDirectionChoices(config, papers, topic = "") {
    if (Array.isArray(config?.directions)) {
        return config.directions.filter((direction) => !topic || direction.topic === topic)
            .map((direction) => [direction.id, direction.title]);
    }
    return studyDirections(papers, topic).map((category) => [category, category]);
}

function updatePaperDirections(clearInvalid = true) {
    if (!paperLibrary) return;
    const previous = elements.category.value;
    const choices = paperDirectionChoices(state.taxonomy, state.papers, elements.topic.value);
    elements.category.replaceChildren(new Option("全部具体方向", ""));
    for (const [id, title] of choices) elements.category.add(new Option(title, id));
    if (previous && choices.some(([id]) => id === previous)) elements.category.value = previous;
    else if (!clearInvalid && previous) {
        const option = new Option(previous, previous);
        option.dataset.unknownFilter = "true";
        elements.category.add(option);
        elements.category.value = previous;
    }
}

function updateStudyDirections(clearInvalid = true) {
    if (document.body.dataset.section !== "study") return;
    const previous = elements.category.value;
    const topic = elements.topic.value;
    const configured = [...elements.topic.options].filter((option) => option.value && (!topic || option.value === topic))
        .flatMap((option) => {
            try { return JSON.parse(option.dataset.directions || "[]"); } catch { return []; }
        });
    const directions = studyDirections(state.papers, topic, configured);
    elements.category.replaceChildren(new Option("全部具体方向", ""));
    for (const direction of directions) elements.category.add(new Option(direction, direction));
    if (previous && directions.includes(previous)) elements.category.value = previous;
    else if (!clearInvalid && previous) {
        const option = new Option(previous, previous);
        option.dataset.unknownFilter = "true";
        elements.category.add(option);
        elements.category.value = previous;
    }
}

function updateStats() {
    const tags = new Set(state.papers.flatMap((paper) => paper.tags || []));
    const years = new Set(state.papers.map((paper) => paper.year).filter(Boolean));
    const read = state.papers.filter((paper) => (document.body.dataset.section === "study" ? paper.status === "已完成" : paper.status === "已精读") && !paper.example).length;
    elements.paperCount.textContent = state.papers.length;
    elements.tagCount.textContent = paperLibrary ? new Set(state.papers.flatMap((paper) => paper.topics || [])).size : tags.size;
    elements.yearCount.textContent = paperLibrary ? state.papers.filter((paper) => matchesReadingStatus(paper.status, "已阅读") && !paper.example).length : years.size;
    elements.readCount.textContent = paperLibrary ? state.papers.filter((paper) => readingStatus(paper.status) === "精读" && !paper.example).length : read;
}

let venueResources = [];
async function loadVenueResources() {
    try {
        const response = await fetch("/paper/data/venues.json");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        venueResources = await response.json();
        updateVenueResources();
    } catch (error) {
        console.error("Unable to load conference resources:", error);
    }
}
function updateVenueResources() {
    if (!paperLibrary) return;
    const context = document.querySelector("#venue-context");
    const selected = elements.venue.value;
    for (const link of document.querySelectorAll("[data-venue-resource]")) {
        const resource = venueResources.find((item) => item.name === link.dataset.venueResource);
        if (resource) link.href = safeExternalUrl(resource.years?.[elements.year.value] || resource.url);
        link.classList.toggle("venue-selected", link.dataset.venueResource === selected);
    }
    if (context) {
        context.hidden = !selected;
        context.textContent = selected ? `当前筛选：${selected}${elements.year.value ? ` · ${elements.year.value}` : ""}。上方提供原始论文发布入口。` : "";
    }
}
function renderReadingWorkbench() {
    const real = state.papers.filter((paper) => !paper.example && !paper.private);
    const deep = real.filter((paper) => readingStatus(paper.status) === "精读").slice(0, 4);
    const row = (paper) => `<a class="reading-queue-row" href="/paper/#note=${encodeURIComponent(paper.id)}" data-note-link><span>${escapeHtml(paper.shortTitle || paper.title)}</span><small>${escapeHtml([paper.venue, paper.year, paper.priority].filter(Boolean).join(" · "))}</small><span aria-hidden="true">↗</span></a>`;
    document.querySelector("#deep-reading-queue").innerHTML = deep.map(row).join("") || '<p class="section-note">尚无精读记录。完成方法拆解和证据整理后，再将论文标为精读。</p>';
}

function filteredPapers() {
    const keyword = elements.search.value.trim().toLowerCase();
    const terms = keyword.split(/\s+/).filter(Boolean);
    return state.papers.map((paper) => {
        const fields = {
            title: `${paper.shortTitle || ""} ${paper.title} ${paper.translations?.en?.title || ""}`,
            authors: paper.authors,
            venue: paper.venue || "",
            year: paper.year || "",
            summary: paper.summary,
            stage: paper.stage,
            status: paper.status,
            category: paper.category,
            line: paper.line,
            priority: paper.priority,
            tags: (paper.tags || []).join(" "),
            body: `${paper.body} ${paper.translations?.en?.body || ""} ${paper.translations?.en?.summary || ""}`,
            topics: (paper.topics || []).join(" "),
            directions: (paper.directionTitles || []).join(" "),
            concepts: (paper.concepts || []).join(" "),
            translation: JSON.stringify(paper.translations || {}),
        };
        const searchable = Object.values(fields).join(" ").toLowerCase();
        const matchesQuery = !terms.length || terms.every((term) => searchable.includes(term));
        const score = terms.reduce((total, term) => total
            + (fields.title.toLowerCase().includes(term) ? 10 : 0)
            + (fields.tags.toLowerCase().includes(term) ? 8 : 0)
            + (fields.authors.toLowerCase().includes(term) ? 6 : 0)
            + (fields.summary.toLowerCase().includes(term) ? 4 : 0)
            + (fields.body.toLowerCase().includes(term) ? 1 : 0), 0);
        return { paper, matchesQuery, score };
    }).filter(({ paper, matchesQuery }) => {
        if (paperLibrary) {
            const legacy = new URLSearchParams(location.search);
            return matchesQuery
                && (!elements.venue.value || paper.venue === elements.venue.value)
                && (!elements.year.value || paper.year === elements.year.value)
                && (!elements.topic.value || (paper.topics || []).includes(elements.topic.value))
                && (!elements.category.value || (paper.directions || []).includes(elements.category.value) || paper.category === elements.category.value)
                && (!elements.status.value || (["精读", "已精读", "已阅读", "已读", "待阅读", "待读", "进行中"].includes(elements.status.value)
                    ? matchesReadingStatus(paper.status, elements.status.value) : paper.status === elements.status.value))
                && (!elements.priority.value || paper.priority === elements.priority.value)
                && (!legacy.get("stage") || paper.stage === legacy.get("stage"))
                && (!legacy.get("tag") || (paper.tags || []).includes(legacy.get("tag")));
        }
        return matchesQuery
            && (!elements.stage.value || paper.stage === elements.stage.value)
            && (!elements.status.value || paper.status === elements.status.value)
            && (!elements.tag.value || paper.tags.includes(elements.tag.value))
            && (!elements.category.value || paper.category === elements.category.value)
            && (!elements.topic.value || (paper.topics || []).includes(elements.topic.value))
            && (!elements.priority.value || paper.priority === elements.priority.value);
    }).sort((a, b) => b.score - a.score
        || Number(b.paper.year || 0) - Number(a.paper.year || 0))
        .map(({ paper }) => paper);
}

function renderList() {
    const papers = filteredPapers();
    elements.count.textContent = `${papers.length} / ${state.papers.length} ${paperLibrary ? "篇文献" : libraryText("篇笔记", "records")}`;
    if (state.selectedId && !papers.some((paper) => paper.id === state.selectedId)) {
        state.selectedId = null;
        if (location.hash.startsWith("#note=")) {
            history.replaceState(null, "", document.body.dataset.section === "research" ? "#research-reports" : "#notes");
        }
        emptyDetail();
    }
    if (!papers.length) {
        elements.list.innerHTML = `<div class="empty-state">${state.papers.length ? libraryText("没有找到匹配的笔记。试试其他关键词，或清空筛选条件。", "No matching records. Try another query or clear the filters.") : libraryText("这里还没有笔记。", "No records yet.")}</div>`;
        return;
    }

    elements.list.innerHTML = papers.map(visibleNote).map((paper) => `
        <article class="note-card ${paper.id === state.selectedId ? "selected" : ""}" data-id="${escapeHtml(paper.id)}" tabindex="0" role="button" aria-pressed="${paper.id === state.selectedId}">
            <div class="note-card-meta">${paperLibrary && paper.venue ? `<span>${escapeHtml(paper.venue)}</span>` : ""}<span>${escapeHtml(paper.category || libraryText("未分类", "Uncategorized"))}</span><span>${escapeHtml(paper.year || libraryText("未标年份", "Undated"))}</span><span class="${paperLibrary && readingStatus(paper.status) === "精读" ? "deep-status" : ""}">${escapeHtml(paperLibrary ? readingStatus(paper.status) : paper.status || libraryText("待读", "To read"))}</span>${paper.priority ? `<span>${escapeHtml(paper.priority)}</span>` : ""}${paper.example ? `<span class="example-label">${libraryText("示例", "Example")}</span>` : ""}</div>
            <h3>${escapeHtml(displayTitle(paper))}</h3>
            <p>${escapeHtml(getMatchingExcerpt(paper) || paper.summary || paper.excerpt || libraryText("暂无摘要", "No summary available."))}</p>
            <div class="tag-row">${(paper.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
        </article>
    `).join("");

    elements.list.querySelectorAll(".note-card").forEach((card) => {
        card.addEventListener("click", () => selectPaper(card.dataset.id));
        card.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                selectPaper(card.dataset.id);
            }
        });
    });
}

function getMatchingExcerpt(paper) {
    const terms = elements.search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return "";
    const paragraph = (paper.body || "").split(/\n{2,}/).find((block) => {
        const text = block.replace(/^#{1,6}\s+|^[-*]\s+/gm, "").toLowerCase();
        return terms.some((term) => text.includes(term));
    });
    return paragraph
        ?.replace(/^#{1,6}\s+|^[-*]\s+/gm, "")
        .replace(/\s+/g, " ")
        .slice(0, 180) || "";
}

function selectFromHash() {
    if (!state.loaded) return;
    const id = new URLSearchParams(window.location.hash.replace("#", "")).get("note");
    if (!id) return;
    const paper = state.papers.find((item) => item.id === id);
    if (paper) {
        if (!filteredPapers().some((item) => item.id === id)) {
            elements.search.value = "";
            for (const key of filterKeys) elements[key].value = "";
            syncQuery();
        }
        selectPaper(paper.id, false);
        if (document.body.dataset.section === "research") {
            requestAnimationFrame(() => elements.detail.scrollIntoView({ behavior: "auto", block: "start" }));
        }
    } else {
        state.selectedId = null;
        renderList();
        elements.detail.innerHTML = `<p class="detail-empty">${libraryText("这篇记录不存在，可能已被移动或删除。请选择其他记录。", "This record is unavailable. It may have been moved or deleted. Select another record.")}</p>`;
    }
}

function selectPaper(id, scroll = true) {
    const original = state.papers.find((item) => item.id === id);
    if (!original) return;
    const paper = visibleNote(original);
    state.selectedId = id;
    const hash = `#note=${encodeURIComponent(id)}`;
    if (new URLSearchParams(location.hash.slice(1)).get("note") !== id) {
        const url = new URL(location.href);
        url.hash = hash;
        window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
    renderList();
    elements.detail.innerHTML = `
        <p class="detail-kicker">${escapeHtml(paperLibrary ? "PAPER / 小结" : document.body.dataset.section === "study" ? "STUDY / 小结" : paper.stage || libraryText("阅读记录", "RESEARCH NOTE"))}</p>
        <h3>${escapeHtml(displayTitle(paper))}</h3>
        ${paperLibrary && paper.authors ? `<p class="detail-authors"><span>作者</span>${escapeHtml(paper.authors)}</p>` : ""}
        <p class="detail-meta">${escapeHtml([paperLibrary ? "" : paper.authors, paper.year, paper.venue, paper.category, paperLibrary ? readingStatus(paper.status) : paper.status, paper.priority, paper.example ? libraryText("示例笔记", "Example") : ""].filter(Boolean).join(" · "))}</p>
        <div class="tag-row">${(paper.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
        <div class="detail-content">${(paperLibrary || document.body.dataset.section === "study" ? paper.summaryHtml ?? paper.html : paper.html) || ""}</div>
        <div class="detail-actions">
            ${safeExternalUrl(paper.paperUrl) ? `<a href="${escapeAttribute(safeExternalUrl(paper.paperUrl))}" target="_blank" rel="noreferrer">${libraryText("论文原文 ↗", "Original paper ↗")}</a>` : ""}
            ${safeExternalUrl(paper.codeUrl) ? `<a href="${escapeAttribute(safeExternalUrl(paper.codeUrl))}" target="_blank" rel="noreferrer">${libraryText("代码仓库 ↗", "Code repository ↗")}</a>` : ""}
            ${paperLibrary || paper.private ? "" : `<a href="${escapeAttribute(paper.sourceUrl)}" target="_blank" rel="noreferrer">${libraryText("打开原始笔记 ↗", "Open source Markdown ↗")}</a>`}
        </div>
    `;
    elements.detail.scrollTop = 0;
    window.dispatchEvent(new CustomEvent("noteselected", { detail: {
        id: original.id,
        summaryHtml: paper.summaryHtml ?? paper.html ?? "",
        html: paper.html || "",
        deepHtml: paper.deepHtml || "",
        title: paper.title,
        shortTitle: displayTitle(paper),
        localNote: paper.localNote || "",
        localPdfUrl: paper.localPdfUrl || "",
        localNoteUrl: paper.localNoteUrl || "",
        deepReading: paper.hasDeepReading === true && (paperLibrary ? readingStatus(paper.status) === "精读" : document.body.dataset.section === "study" ? true : readingStatus(paper.status) === "精读"),
    } }));
    if (scroll && (window.innerWidth < 850 || document.body.dataset.section === "research")) {
        elements.detail.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[character]));
}

function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
}

function safeExternalUrl(value) {
    if (!value) return "";
    try {
        const url = new URL(value, window.location.href);
        return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
        return "";
    }
}

elements.search.addEventListener("input", () => {
    syncQuery();
    renderList();
});
filterKeys.map((key) => elements[key]).forEach((element) => {
    element.addEventListener("change", () => {
        if (element === elements.topic) { updateStudyDirections(); updatePaperDirections(); }
        syncQuery();
        renderList();
        updateVenueResources();
    });
});
document.querySelector("#reset-filters").addEventListener("click", () => {
    elements.search.value = "";
    for (const key of filterKeys) elements[key].value = "";
    updateStudyDirections();
    updatePaperDirections();
    if (paperLibrary) {
        const url = new URL(location.href);
        url.searchParams.delete("stage");
        url.searchParams.delete("tag");
        history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
    syncQuery();
    renderList();
    updateVenueResources();
    elements.search.focus();
});
window.addEventListener("hashchange", restoreFromUrl);
window.addEventListener("popstate", restoreFromUrl);
window.addEventListener("languagechange", () => {
    if (state.loaded) restoreFromUrl();
    else localizeLibrary();
});

loadPapers();
if (paperLibrary) loadVenueResources();
