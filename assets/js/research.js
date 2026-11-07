const text = (zh, en) => window.SiteLocale.language === "en" ? en : zh;
const localized = (value) => value[window.SiteLocale.language];
const statusLabels = {
    planned: ["待开始", "Not started"], active: ["进行中", "In progress"], done: ["已完成", "Completed"],
};
let progressDocument = { tasks: [] };
let progressRevision = "";
let savedDocument;
let editing = false;
let saving = false;
let filter = "all";
let readPapers = [];
let papersFailed = false;
let progressFailed = false;
let message = null;
const list = document.querySelector("#progress-list");
const feedback = document.querySelector("#progress-feedback");
const isLoopback = location.hostname === "127.0.0.1";

function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content != null) node.textContent = content;
    return node;
}

function notify(zh, en) {
    message = [zh, en];
    feedback.textContent = text(zh, en);
}

function labelledInput(parent, label, value, update, { multiline = false, maxLength = 180 } = {}) {
    const wrapper = element("label", "task-field");
    wrapper.append(element("span", "", label));
    const input = element(multiline ? "textarea" : "input");
    input.value = value;
    input.maxLength = maxLength;
    if (!multiline) input.required = true;
    input.addEventListener("input", () => update(input.value));
    wrapper.append(input);
    parent.append(wrapper);
}

function renderProgress() {
    list.replaceChildren();
    list.classList.toggle("is-editing", editing);
    const tasks = progressDocument.tasks.filter((task) => filter === "all" || task.status === filter);
    for (const task of tasks) {
        const row = element("article", `research-task task-${task.status}`);
        row.dataset.taskId = task.id;
        const heading = element("div", "task-heading");
        heading.append(element("h3", "", localized(task.title)), element("span", "task-status", text(...statusLabels[task.status])));
        row.append(heading);
        if (editing) {
            const fields = element("div", "task-fields");
            for (const lang of ["en", "zh"]) {
                labelledInput(fields, text(lang === "en" ? "英文标题" : "中文标题", lang === "en" ? "English title" : "Chinese title"), task.title[lang], (value) => { task.title[lang] = value; });
                labelledInput(fields, text(lang === "en" ? "英文记录" : "中文记录", lang === "en" ? "English note" : "Chinese note"), task.note[lang], (value) => { task.note[lang] = value; }, { multiline: true, maxLength: 2000 });
            }
            row.append(fields);
            const controls = element("div", "task-controls");
            const statusLabel = element("label", "task-field");
            statusLabel.append(element("span", "", text("状态", "Status")));
            const select = element("select");
            for (const [key, names] of Object.entries(statusLabels)) select.add(new Option(text(...names), key));
            select.value = task.status;
            select.addEventListener("change", () => {
                task.status = select.value;
                task.percent = select.value === "done" ? 100 : select.value === "planned" ? 0 : Math.min(99, Math.max(1, task.percent));
                renderProgress();
            });
            statusLabel.append(select);
            const sliderLabel = element("label", "task-slider");
            sliderLabel.append(element("span", "", text("完成进度", "Completion")));
            const slider = element("input");
            slider.type = "range"; slider.min = "0"; slider.max = "100"; slider.value = task.percent;
            slider.setAttribute("aria-label", text("完成进度", "Completion"));
            const numberLabel = element("label", "task-field");
            numberLabel.append(element("span", "", "%"));
            const number = element("input");
            number.type = "number"; number.min = "0"; number.max = "100"; number.step = "1"; number.value = task.percent;
            const updatePercent = (input) => {
                const value = Number(input.value);
                if (!Number.isFinite(value)) return;
                task.percent = Math.min(100, Math.max(0, Math.round(value)));
                task.status = task.percent === 100 ? "done" : task.percent === 0 ? "planned" : "active";
                slider.value = task.percent; number.value = task.percent; select.value = task.status;
                heading.lastChild.textContent = text(...statusLabels[task.status]);
                row.className = `research-task task-${task.status}`;
            };
            slider.addEventListener("input", () => updatePercent(slider));
            number.addEventListener("input", () => updatePercent(number));
            sliderLabel.append(slider); numberLabel.append(number);
            const remove = element("button", "task-delete", text("删除记录", "Delete task"));
            remove.type = "button";
            remove.addEventListener("click", () => {
                if (!window.confirm(text("删除这条进展？保存后生效。", "Delete this task? Changes take effect when saved."))) return;
                progressDocument.tasks = progressDocument.tasks.filter((item) => item.id !== task.id);
                renderProgress();
            });
            controls.append(statusLabel, sliderLabel, numberLabel, remove);
            row.append(controls);
        } else {
            row.append(element("p", "task-note", localized(task.note)));
            const meter = element("div", "task-meter");
            const bar = element("progress");
            bar.max = 100; bar.value = task.percent;
            bar.setAttribute("aria-label", localized(task.title));
            meter.append(bar, element("span", "task-percent", `${task.percent}%`));
            row.append(meter);
        }
        list.append(row);
    }
    if (!tasks.length) list.append(element("p", "empty-state", progressFailed
        ? text("进展暂时无法加载，请刷新重试。", "Progress could not be loaded. Please refresh to retry.")
        : text("暂无该状态的记录。", "No tasks in this status.")));
    if (message) feedback.textContent = text(...message);
    document.querySelector("#progress-edit-actions").hidden = !editing;
    document.querySelector("#edit-progress").disabled = editing;
    for (const button of document.querySelectorAll("[data-progress-filter]")) {
        button.setAttribute("aria-pressed", String(button.dataset.progressFilter === filter));
    }
}

function renderPapers() {
    const container = document.querySelector("#research-paper-list");
    container.replaceChildren();
    for (const paper of readPapers) {
        const link = element("a", "reading-log-row");
        link.href = `/paper/#note=${encodeURIComponent(paper.id)}`;
        const title = window.SiteLocale.language === "en"
            ? paper.translations?.en?.title || paper.title : paper.title;
        link.append(element("strong", "", title), element("span", "", [paper.authors, paper.year].filter(Boolean).join(" · ")), element("span", "text-link", "↗"));
        container.append(link);
    }
    if (!readPapers.length) container.append(element("p", "empty-state", papersFailed
        ? text("论文索引暂时无法加载。", "The paper index could not be loaded.")
        : text("暂无已读论文记录。", "No completed paper notes yet.")));
}

async function api(path, { method = "GET", body } = {}) {
    const response = await fetch(path, {
        method, cache: "no-store",
        headers: body ? { "Content-Type": "application/json" } : {},
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error(data.error), { status: response.status });
    return data;
}

async function loadProgress() {
    try {
        const response = await fetch("/research/data/progress.json", { cache: "no-store" });
        if (!response.ok) throw new Error("Progress unavailable");
        progressDocument = await response.json();
    } catch { progressFailed = true; }
    renderProgress();
    if (isLoopback) {
        try {
            const config = await api("/api/editor");
            if (config.enabled) {
                const current = await api("/api/progress");
                if (!editing) {
                    progressDocument = current.document;
                    progressFailed = false;
                    renderProgress();
                }
                document.querySelector("#edit-progress").hidden = false;
            }
        } catch { /* Static previews are read-only. */ }
    }
}

async function startEditing() {
    const data = await api("/api/progress");
    progressDocument = data.document; progressRevision = data.revision;
    savedDocument = structuredClone(progressDocument);
    editing = true; message = null; filter = "all";
    renderProgress();
}

document.querySelector("#edit-progress").addEventListener("click", async () => {
    const button = document.querySelector("#edit-progress");
    button.disabled = true;
    try {
        await startEditing();
    } catch { notify("无法加载本地进展。", "Could not load local progress."); }
    finally { button.disabled = editing; }
});
document.querySelector("#add-progress").addEventListener("click", () => {
    progressDocument.tasks.push({ id: `task-${crypto.randomUUID()}`, title: { zh: "新进展", en: "New task" }, note: { zh: "", en: "" }, status: "planned", percent: 0 });
    filter = "all"; renderProgress();
    list.lastElementChild.querySelector("input").focus();
});
document.querySelector("#cancel-progress").addEventListener("click", () => {
    if (saving) return;
    progressDocument = structuredClone(savedDocument); editing = false; message = null; renderProgress();
});
document.querySelector("#save-progress").addEventListener("click", async () => {
    if (saving) return;
    const invalid = [...list.querySelectorAll("input, textarea")].find((input) => !input.checkValidity());
    if (invalid) { invalid.reportValidity(); return; }
    saving = true;
    document.querySelector("#save-progress").disabled = true;
    list.inert = true;
    document.querySelector("#progress-edit-actions").inert = true;
    try {
        const result = await api("/api/progress", { method: "PUT", body: { document: progressDocument, revision: progressRevision } });
        progressDocument = result.document; progressRevision = result.revision;
        savedDocument = structuredClone(progressDocument); editing = false;
        notify("已保存到本地 Research/progress.json。", "Saved to local Research/progress.json.");
    } catch (error) {
        notify(...(error.status === 409
            ? ["文件已在别处更新。请保留当前内容，取消后重新编辑以加载最新文件。", "The file changed elsewhere. Keep your edits, then discard and reopen the editor to load the latest version."]
            : ["保存失败，请检查标题、进度与本地服务。修改尚未保存。", "Save failed. Check task fields and the local server; changes are not saved."]));
    } finally {
        saving = false;
        list.inert = false;
        document.querySelector("#progress-edit-actions").inert = false;
        document.querySelector("#save-progress").disabled = false;
        renderProgress();
    }
});
for (const button of document.querySelectorAll("[data-progress-filter]")) {
    button.addEventListener("click", () => { filter = button.dataset.progressFilter; renderProgress(); });
}
window.addEventListener("beforeunload", (event) => {
    if (editing && JSON.stringify(progressDocument) !== JSON.stringify(savedDocument)) { event.preventDefault(); event.returnValue = ""; }
});
window.addEventListener("languagechange", () => { renderProgress(); renderPapers(); });
loadProgress();
fetch("/paper/data/papers.json").then((response) => {
    if (!response.ok) throw new Error("Papers unavailable");
    return response.json();
}).then((papers) => {
    readPapers = papers.filter((paper) => !paper.example && !paper.private && ["已读", "已阅读", "已精读", "精读", "Read", "read", "Completed"].includes(paper.status));
    renderPapers();
}).catch(() => { papersFailed = true; renderPapers(); });
