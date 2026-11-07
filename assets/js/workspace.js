const workspaceLinks = [...document.querySelectorAll(".workspace-header .site-nav a")];
let libraryReady = false;
let returnFocus = null;
const workspaceTitle = document.title;
const workspaceViews = ["map", "notes", "workflow"];
const paperWorkspace = document.body.dataset.section === "paper";
const studyWorkspace = document.body.dataset.section === "study";
const readingWorkspace = paperWorkspace || studyWorkspace;
let selectedReading = null;

function viewFromLocation() {
    const hash = location.hash.slice(1);
    if (workspaceViews.includes(hash)) return hash;
    const query = new URLSearchParams(location.search);
    if (hash.startsWith("note=") || hash === "notes"
        || ["q", "topic", "stage", "category", "status", "tag", "priority", "venue", "year"].some((key) => query.has(key))) return "notes";
    if (hash === "workflow") return "workflow";
    return "map";
}

function setWorkspaceView(view) {
    if (!workspaceViews.includes(view)) return;
    for (const panel of document.querySelectorAll("[data-workspace-panel]")) {
        panel.hidden = panel.dataset.workspacePanel !== view;
    }
    const intro = document.querySelector("[data-workspace-intro]");
    if (intro) intro.hidden = view !== "map";
    for (const link of workspaceLinks) {
        const active = link.dataset.workspaceView === view;
        link.classList.toggle("active", active);
        if (active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
    }
    window.dispatchEvent(new CustomEvent("workspaceviewchange", { detail: { view } }));
}

function syncWorkspaceView() {
    setWorkspaceView(viewFromLocation());
    updateReaderMode();
}

function localizeTopicOptions() {
    if (paperWorkspace) return;
    const titles = new Map([...document.querySelectorAll("[data-map-topic]")].map((row) =>
        [row.dataset.mapTopic, row.querySelector("h3")?.textContent.trim() || row.dataset.mapTopic]));
    titles.set("llm-inference", "大模型推理");
    if (paperWorkspace) titles.set("agents", "Agent 关联阅读");
    titles.set("serving", "服务编排与调度");
    for (const option of document.querySelector("#topic-filter").options) {
        option.textContent = titles.get(option.value) || option.textContent;
    }
}

function updateReaderMode() {
    const requested = new URLSearchParams(location.search).get("view") === "reader";
    const available = Boolean(document.querySelector(".detail-content")) && viewFromLocation() === "notes";
    const active = requested && available;
    document.body.classList.toggle("reader-mode", active);
    const detail = document.querySelector("#note-detail");
    const title = detail.querySelector(":scope > h3");
    detail.setAttribute("role", active ? "article" : "complementary");
    if (title) {
        if (active) title.setAttribute("aria-level", "1");
        else title.removeAttribute("aria-level");
    }
    const button = document.querySelector("[data-reader-toggle]");
    if (button) {
        button.textContent = active ? "返回索引" : readingWorkspace ? "详细阅读" : "专注阅读";
        button.setAttribute("aria-pressed", String(active));
    }
    if (readingWorkspace && selectedReading && available) {
        const content = detail.querySelector(".detail-content");
        const mode = active && selectedReading.deepReading ? "deep" : "summary";
        if (title) title.textContent = active ? selectedReading.title : selectedReading.shortTitle;
        const kicker = detail.querySelector(".detail-kicker");
        if (kicker) kicker.textContent = `${paperWorkspace ? "PAPER" : "STUDY"} / ${active ? "阅读" : "小结"}`;
        if (content.dataset.readingMode !== mode) {
            content.innerHTML = mode === "deep" ? selectedReading.deepHtml : selectedReading.summaryHtml;
            content.dataset.readingMode = mode;
            detail.querySelector(".reader-outline")?.remove();
            if (mode === "deep") prepareOutline(selectedReading.id);
        }
    }
    document.title = active && title ? `${title.textContent} | ${paperWorkspace ? "Paper" : "Study"}` : workspaceTitle;
    for (const link of document.querySelectorAll(".reader-outline a")) {
        const url = new URL(link.href);
        link.href = `${location.pathname}${location.search}${url.hash}`;
    }
}

function toggleReader(force) {
    const active = typeof force === "boolean" ? force : !document.body.classList.contains("reader-mode");
    const url = new URL(location.href);
    if (active) {
        returnFocus = document.activeElement;
        url.searchParams.set("view", "reader");
    } else url.searchParams.delete("view");
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    updateReaderMode();
    const detail = document.querySelector("#note-detail");
    (active ? detail : document.querySelector("#notes")).scrollIntoView({ behavior: "instant", block: "start" });
    if (!active && returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    else {
        detail.tabIndex = -1;
        detail.focus({ preventScroll: true });
    }
}

function scrollToNoteHeading() {
    const heading = new URLSearchParams(location.hash.slice(1)).get("heading");
    if (!heading) return;
    document.querySelector("#note-detail").querySelectorAll("[data-note-heading]").forEach((element) => {
        if (element.id === heading) element.scrollIntoView({ behavior: "instant", block: "start" });
    });
}

function prepareReader(id) {
    const detail = document.querySelector("#note-detail");
    const toolbar = document.createElement("div");
    toolbar.className = "reader-toolbar";
    toolbar.innerHTML = `<div class="reader-commands"><button type="button" data-reader-toggle aria-pressed="false" class="${readingWorkspace ? selectedReading?.deepReading ? "deep-reader-button" : "muted-reader-button" : ""}" title="${readingWorkspace ? selectedReading?.deepReading ? "查看详细正文与左侧章节目录" : "暂无详细正文，详细阅读展示当前小结" : "单栏阅读正文"}">${readingWorkspace ? "详细阅读" : "专注阅读"}</button><button type="button" data-copy-note>复制链接</button></div><span class="reader-feedback" role="status"></span>`;
    if (paperWorkspace) {
        const local = ["127.0.0.1", "localhost", "[::1]"].includes(location.hostname);
        if (selectedReading?.localPdfUrl) {
            const paper = document.createElement("a");
            if (local) paper.href = selectedReading.localPdfUrl;
            else {
                paper.setAttribute("aria-disabled", "true");
                paper.title = "请在本机运行预览服务后打开本地 PDF";
            }
            paper.target = "_blank";
            paper.rel = "noopener noreferrer";
            paper.textContent = "本地论文";
            if (local) paper.title = "打开 localPdf 指定的 PDF 原文";
            paper.dataset.localPdf = "true";
            toolbar.querySelector(".reader-commands").append(paper);
        }
        if (selectedReading?.localNote) {
            const note = document.createElement("button");
            note.type = "button";
            note.textContent = "本地笔记";
            note.dataset.localNote = "true";
            note.title = local ? "使用本机默认 Markdown 程序打开笔记" : "请在本机运行预览服务后打开 Markdown 笔记";
            note.disabled = !local;
            note.addEventListener("click", async () => {
                const status = toolbar.querySelector(".reader-feedback");
                note.disabled = true;
                try {
                    const response = await fetch("/api/content/open-local-note", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ path: selectedReading.localNote }),
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error || "打开本地笔记失败。");
                    status.textContent = "已交由本机默认程序打开 Markdown 笔记";
                } catch (error) {
                    status.textContent = error.message;
                } finally {
                    note.disabled = false;
                }
            });
            toolbar.querySelector(".reader-commands").append(note);
        }
    }
    detail.prepend(toolbar);
    toolbar.querySelector("[data-reader-toggle]").addEventListener("click", () => toggleReader());
    toolbar.querySelector("[data-copy-note]").addEventListener("click", async () => {
        const status = toolbar.querySelector(".reader-feedback");
        try {
            await navigator.clipboard.writeText(location.href);
            status.textContent = "链接已复制";
        } catch {
            status.textContent = "未能复制，请使用地址栏链接";
        }
    });
    if (!readingWorkspace) prepareOutline(id);
    updateReaderMode();
    requestAnimationFrame(scrollToNoteHeading);
}

function prepareOutline(id) {
    const detail = document.querySelector("#note-detail");
    const content = detail.querySelector(".detail-content");
    const headings = [...content.querySelectorAll("h1, h2, h3, h4")];
    if (headings.length) {
        const outline = document.createElement("details");
        outline.className = "reader-outline";
        outline.open = !readingWorkspace || window.innerWidth > 1000;
        const summary = document.createElement("summary");
        summary.textContent = "章节目录";
        const nav = document.createElement("nav");
        nav.setAttribute("aria-label", "笔记章节");
        headings.forEach((heading, index) => {
            heading.id = `note-section-${index + 1}`;
            heading.dataset.noteHeading = "true";
            const link = document.createElement("a");
            const url = new URL(location.href);
            url.hash = new URLSearchParams({ note: id, heading: heading.id }).toString();
            link.href = `${url.pathname}${url.search}${url.hash}`;
            link.textContent = heading.textContent;
            link.className = `outline-${heading.tagName.toLowerCase()}`;
            link.addEventListener("click", (event) => {
                if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                const target = new URL(link.href);
                // Preserve the current reading mode if it changed after rendering the outline.
                history.replaceState(null, "", `${location.pathname}${location.search}${target.hash}`);
                heading.scrollIntoView({ behavior: "instant", block: "start" });
                heading.tabIndex = -1;
                heading.focus({ preventScroll: true });
            });
            nav.append(link);
        });
        outline.append(summary, nav);
        content.before(outline);
    }
}

function updateMapSelection() {
    const topic = new URLSearchParams(location.search).get("topic");
    document.querySelectorAll("[data-map-topic]").forEach((row) => {
        row.classList.toggle("map-layer-active", row.dataset.mapTopic === topic);
    });
}

document.addEventListener("click", (event) => {
    const viewLink = event.target.closest("a[data-workspace-view]");
    if (viewLink && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        const url = new URL(viewLink.getAttribute("href"), location.href);
        if (url.href !== location.href) history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
        setWorkspaceView(viewLink.dataset.workspaceView);
        updateReaderMode();
        window.scrollTo({ top: 0, behavior: "instant" });
    }
    const link = event.target.closest("a[data-workspace-filter], a[data-note-link]");
    if (!link || !libraryReady || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const url = new URL(link.getAttribute("href"), location.href);
    if (url.href !== location.href) history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
    setWorkspaceView("notes");
    window.scrollTo({ top: 0, behavior: "instant" });
    // The library owns query parsing and note rendering, including browser history.
    window.dispatchEvent(new PopStateEvent("popstate"));
    const target = document.querySelector(link.hasAttribute("data-note-link") ? "#note-detail" : "#notes");
    if (link.hasAttribute("data-note-link")) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
    }
    updateMapSelection();
});

window.addEventListener("libraryready", () => {
    libraryReady = true;
    localizeTopicOptions();
    updateMapSelection();
    syncWorkspaceView();
    if (location.hash.startsWith("#note=") && !new URLSearchParams(location.hash.slice(1)).has("heading")) {
        document.querySelector("#note-detail").focus({ preventScroll: true });
    }
});
window.addEventListener("noteselected", (event) => {
    selectedReading = event.detail;
    prepareReader(event.detail.id);
});
window.addEventListener("libraryrestored", () => {
    localizeTopicOptions();
    updateReaderMode();
});
window.addEventListener("popstate", () => {
    updateMapSelection();
    syncWorkspaceView();
});
window.addEventListener("hashchange", syncWorkspaceView);
window.addEventListener("libraryfilterchange", updateMapSelection);
for (const link of workspaceLinks) {
    link.addEventListener("click", (event) => {
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        setWorkspaceView(link.dataset.workspaceView);
    });
}
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("reader-mode")) toggleReader(false);
});
syncWorkspaceView();
