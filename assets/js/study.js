import { masteryLevel, masterySummary, overallMasterySummary, directionSummary, graphPositions } from "./study-model.mjs";

const $ = (selector) => document.querySelector(selector);
const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let config;
let selectedId = "lora";
let selectedGroup = "";
let graph;
let studyNotes = [];
const relationLabels = { prerequisite: "前置基础", component: "组成部分", combination: "方法组合", support: "工程支撑" };

function scoreOf(node) {
    return node.score ?? config.levels.find((level) => level.id === node.level)?.score ?? 0;
}

function levelOf(node) {
    return masteryLevel(config, scoreOf(node));
}

function showStorage() {
    $("#mastery-storage").textContent = "当前显示知识库默认掌握度；仅本地编辑模式可修改";
}

function renderMasteryBar(summary, label) {
    const levels = [...summary.levels].reverse();
    const details = levels.filter((level) => level.count)
        .map((level) => `${level.label} ${level.count}`).join("、");
    return `<div class="mastery-stack" role="img" aria-label="${escape(`${label}：${details}；共 ${summary.count} 个知识点`)}">${levels
        .filter((level) => level.count)
        .map((level) => `<span aria-hidden="true" title="${escape(`${level.label} ${level.count}/${summary.count}`)}" style="--segment-color:${escape(level.color)};flex-grow:${level.count}"></span>`).join("")}</div>`;
}

function renderOverview() {
    const groups = masterySummary(config);
    const overall = overallMasterySummary(config);
    const renderCard = (summary, label, groupId = "", isOverall = false) => `<button type="button" class="mastery-group${isOverall ? " mastery-group--all" : ""}" data-group="${escape(groupId)}" aria-pressed="${selectedGroup === groupId}">
        <span><span class="mastery-group-label">${escape(label)}</span><strong><small>掌握</small>${summary.mastered}/${summary.count}</strong></span>${renderMasteryBar(summary, label)}<small>${summary.count} 个知识点${isOverall ? ` · ${summary.groupCount} 个专题` : ""}</small></button>`;
    $("#mastery-overview").innerHTML = `${renderCard(overall, "全部知识点", "", true)}${groups.map((group) => renderCard(group, group.label, group.id)).join("")}`;
    const directions = directionSummary(config, selectedGroup);
    $("#direction-overview").hidden = !directions.length;
    $("#direction-overview").innerHTML = directions.map((item) => `<div><span>${escape(item.direction)}</span><strong>${item.score === null ? "待确认" : `${item.score}/100`}</strong><progress max="100" value="${item.score || 0}" aria-label="${escape(item.direction)}自评"></progress></div>`).join("");
}

function renderList() {
    $("#knowledge-list").innerHTML = config.groups.map((group) => `<section><h3>${escape(group.label)}</h3><div>${config.nodes.filter((node) => node.group === group.id).map((node) => {
        const level = levelOf(node);
        return `<button type="button" data-node="${escape(node.id)}"><span class="mastery-dot" style="--mastery-color:${level.color}"></span>${escape(node.label)}<small>${scoreOf(node)} · ${level.label}</small></button>`;
    }).join("")}</div></section>`).join("");
}

function selectNode(id) {
    const node = config.nodes.find((item) => item.id === id);
    if (!node) return;
    if (id !== selectedId) {
        const beforeSelect = new CustomEvent("studybeforeselectnode", {
            detail: { from: selectedId, to: id },
            cancelable: true,
        });
        if (!window.dispatchEvent(beforeSelect)) return;
    }
    selectedId = id;
    $("#knowledge-detail").dataset.nodeId = id;
    const group = config.groups.find((item) => item.id === node.group);
    const level = levelOf(node);
    const score = scoreOf(node);
    const related = config.edges.filter((edge) => edge.source === id || edge.target === id);
    const relatedNotes = studyNotes.filter((note) => (note.concepts || []).includes(id));
    const relatedReferences = config.references.filter((reference) => (reference.concepts || []).includes(id));
    const relatedResources = node.resources || [];
    const resourceSections = [
        relatedReferences.length ? `<section class="node-resource-subgroup"><ul class="node-resource-list">${relatedReferences.map((reference) => `<li><a href="${escape(reference.url)}" target="_blank" rel="noopener noreferrer">${escape(reference.label)} ↗</a></li>`).join("")}</ul></section>` : "",
        relatedResources.length ? `<section class="node-resource-subgroup"><ul class="node-resource-list">${relatedResources.map((resource) => `<li><a href="${escape(resource.url)}" target="_blank" rel="noopener noreferrer">${escape(resource.label)} ↗</a></li>`).join("")}</ul></section>` : "",
    ].filter(Boolean);
    $("#knowledge-detail").innerHTML = `<div class="knowledge-detail-heading"><div class="knowledge-title-wrap"><p class="eyebrow">${escape(group.label)} / ${escape(node.direction)}</p>
        <div class="knowledge-title-line"><h2>${escape(node.label)}</h2><section class="node-mastery" aria-labelledby="node-mastery-title" title="${escape(level.description)}">
            <div class="node-mastery-heading"><h3 id="node-mastery-title">掌握程度</h3><div class="mastery-result"><span class="mastery-dot" style="--mastery-color:${level.color}"></span><strong>${escape(level.label)}</strong><span>${score} / 100</span></div></div>
            <div class="mastery-display" style="--mastery-color:${level.color}">
                <progress max="100" value="${score}" aria-label="${escape(node.label)}默认掌握度 ${score} 分"></progress>
            </div>
        </section></div></div><div id="node-editor-actions" class="study-section-actions"></div></div>
        <div class="node-detail-column node-primary-column">
            <section class="node-overview" aria-label="知识点介绍">
                <p class="knowledge-description">${escape(node.description)}</p>
            </section>
            <div class="node-study-stack">
            <section class="node-resource-group node-notes" aria-labelledby="node-notes-title">
                <div class="node-section-heading"><h3 id="node-notes-title">相关学习笔记 <span>${relatedNotes.length}</span></h3><div class="node-section-actions" data-detail-editor="notes"></div></div>
                ${relatedNotes.length ? `<ul class="node-resource-list">${relatedNotes.map((note) => `<li><a href="/study/#note=${encodeURIComponent(note.id)}">${escape(note.shortTitle || note.title || note.id)} →</a><small>${escape([note.category, note.status].filter(Boolean).join(" · "))}</small></li>`).join("")}</ul>` : '<p class="study-related-empty" aria-disabled="true">暂无关联笔记</p>'}
            </section>
            <section class="node-resource-group node-learning-resources" aria-labelledby="node-learning-resources-title">
                <div class="node-section-heading"><h3 id="node-learning-resources-title">相关学习资料 <span>${relatedReferences.length + relatedResources.length}</span></h3><div class="node-section-actions" data-detail-editor="resources"></div></div>
                ${resourceSections.length
                    ? `<div class="node-resource-subgroups${resourceSections.length > 1 ? " node-resource-subgroups--split" : ""}">${resourceSections.join("")}</div>`
                    : '<p class="study-related-empty" aria-disabled="true">暂无关联学习资料</p>'}
            </section>
            </div>
        </div>
        <div class="node-detail-column node-secondary-column">
            <section class="node-relation-group" aria-labelledby="node-relations-title">
                <div class="node-section-heading"><h3 id="node-relations-title">相关知识点 <span>${related.length}</span></h3><div class="node-section-actions" data-detail-editor="relations"></div></div>
                <ul class="node-relations">${related.map((edge) => {
                    const other = config.nodes.find((item) => item.id === (edge.source === id ? edge.target : edge.source));
                    return `<li><button type="button" data-node="${escape(other.id)}">${escape(other.label)}</button><span>${edge.source === id ? "→" : "←"} ${escape(relationLabels[edge.type])} · ${escape(edge.label)}</span></li>`;
                }).join("") || '<li class="node-relations-empty">暂未建立关联</li>'}</ul>
            </section>
        </div>`;
    if (graph) {
        graph.elements().removeClass("related selected-node faded");
        const target = graph.getElementById(id);
        target.addClass("selected-node");
        target.closedNeighborhood().addClass("related");
        graph.edges().not(target.connectedEdges()).addClass("faded");
    }
    window.dispatchEvent(new CustomEvent("studynodeselected", { detail: { id } }));
}

function applyGraphFilter() {
    const topic = selectedGroup;
    graph?.elements().removeClass("filtered-out");
    for (const node of config.nodes) {
        const match = !topic || topic === node.group;
        graph?.getElementById(node.id).toggleClass("filtered-out", !match);
    }
    for (const group of config.groups) {
        const visible = config.nodes.some((node) => node.group === group.id && (!topic || topic === group.id));
        graph?.getElementById(`group-${group.id}`).toggleClass("filtered-out", !visible);
    }
    graph?.edges().forEach((edge) => edge.toggleClass("filtered-out",
        edge.source().hasClass("filtered-out") || edge.target().hasClass("filtered-out")));
    const visible = graph?.nodes(":childless").not(".filtered-out");
    if (visible?.length) {
        graph.resize();
        graph.fit(graph.nodes().not(".filtered-out"), 44);
        $("#graph-message").textContent = "";
    } else if (graph) $("#graph-message").textContent = "没有匹配的知识点";
    renderOverview();
}

function createGraph() {
    if (!window.cytoscape) {
        $("#graph-message").textContent = "图谱引擎未加载，仍可在下方列表查看知识点。";
        return;
    }
    const positions = graphPositions(config);
    graph = window.cytoscape({
        container: $("#study-graph"),
        elements: [
            ...config.groups.map((group) => ({ data: { id: `group-${group.id}`, label: group.label } })),
            ...config.nodes.map((node) => ({ data: { id: node.id, parent: `group-${node.group}`, label: node.label, color: levelOf(node).color, levelLabel: levelOf(node).label }, position: positions.get(node.id) })),
            ...config.edges.map((edge, index) => ({ data: { id: `edge-${index}`, ...edge } })),
        ],
        layout: { name: "preset", padding: 32 },
        minZoom: 0.15, maxZoom: 2.5, userZoomingEnabled: false, userPanningEnabled: true, boxSelectionEnabled: false,
        style: [
            { selector: "node:childless", style: { label: "data(label)", "background-color": "data(color)", color: "#26343a", shape: "round-rectangle", width: 136, height: 44, "font-size": 13, "text-wrap": "wrap", "text-max-width": 122, "text-valign": "center", "text-halign": "center", "border-width": 1, "border-color": "#a5b2ba" } },
            { selector: ":parent", style: { label: "data(label)", "font-size": 16, "font-weight": 600, color: "#53656a", "background-color": "#f5f7f8", "background-opacity": 0.5, "border-width": 1, "border-color": "#d8e1e4", "text-valign": "top", "text-margin-y": -8, padding: 22, shape: "round-rectangle" } },
            { selector: "edge", style: { width: 1.2, "line-color": "#b6c3c9", "target-arrow-color": "#b6c3c9", "target-arrow-shape": "triangle", "curve-style": "bezier", "arrow-scale": 0.8 } },
            { selector: 'edge[type = "combination"], edge[type = "support"]', style: { "line-style": "dashed" } },
            { selector: ".faded", style: { opacity: 0.32 } },
            { selector: "edge.related", style: { width: 2.5, "line-color": "#388d88", "target-arrow-color": "#388d88", opacity: 1 } },
            { selector: ".selected-node", style: { "border-width": 4, "border-color": "#266c63" } },
            { selector: ".filtered-out", style: { display: "none" } },
        ],
    });
    graph.on("tap", "node:childless", (event) => selectNode(event.target.id()));
    graph.on("tap", "edge", (event) => {
        const edge = event.target.data();
        $("#graph-message").textContent = `${config.nodes.find((n) => n.id === edge.source).label} → ${config.nodes.find((n) => n.id === edge.target).label}：${edge.label}`;
    });
    new ResizeObserver(() => {
        if (!$("#map").hidden) { graph.resize(); graph.fit(graph.nodes().not(".filtered-out"), 44); }
    }).observe($("#study-graph"));
    window.addEventListener("workspaceviewchange", (event) => {
        if (event.detail.view === "map") requestAnimationFrame(() => { graph.resize(); applyGraphFilter(); });
    });
}

async function start() {
    const response = await fetch("/study/data/knowledge.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    config = await response.json();
    $("#mastery-legend").innerHTML = [...config.levels].reverse().map((level) => `<span title="${escape(level.description)}"><i class="mastery-dot" style="--mastery-color:${level.color}"></i>${escape(level.label)}<small>${level.min}–${level.max}</small></span>`).join("");
    $("#knowledge-sources").innerHTML = config.references.map((reference) => `<a href="${escape(reference.url)}" target="_blank" rel="noopener noreferrer">${escape(reference.label)} ↗</a>`).join("");
    try {
        const notesResponse = await fetch("/study/data/notes.json");
        if (notesResponse.ok) studyNotes = await notesResponse.json();
    } catch { studyNotes = []; }
    createGraph();
    renderOverview();
    renderList();
    selectNode(config.nodes.some((node) => node.id === selectedId) ? selectedId : config.nodes[0].id);
    applyGraphFilter();
    showStorage();
    document.addEventListener("click", (event) => {
        const node = event.target.closest("[data-node]");
        if (node) selectNode(node.dataset.node);
        const group = event.target.closest("[data-group]");
        if (group) {
            selectedGroup = selectedGroup === group.dataset.group ? "" : group.dataset.group;
            applyGraphFilter();
        }
        const command = event.target.closest("[data-graph-command]")?.dataset.graphCommand;
        if (command && graph) {
            const factor = command === "zoom-in" ? 1.2 : command === "zoom-out" ? 1 / 1.2 : 1;
            if (factor !== 1) {
                const container = $("#study-graph");
                graph.zoom({
                    level: Math.max(graph.minZoom(), Math.min(graph.maxZoom(), graph.zoom() * factor)),
                    renderedPosition: { x: container.clientWidth / 2, y: container.clientHeight / 2 },
                });
            }
        }
    });
    window.lucide?.createIcons();
    // Exposed for browser diagnostics without coupling other pages to this graph.
    window.studyGraph = graph;
    window.StudyContent = {
        document: () => ({ ...config, nodes: config.nodes.map((item) => ({ ...item, score: scoreOf(item), level: levelOf(item).id })) }),
        notes: studyNotes,
        selectNode,
    };
    window.dispatchEvent(new CustomEvent("studycontentready", { detail: { notes: studyNotes } }));
}

const architectureTabs = [...document.querySelectorAll("[data-architecture]")];
function setArchitecture(tab) {
    for (const button of architectureTabs) {
        const active = button === tab;
        button.setAttribute("aria-selected", String(active));
        button.tabIndex = active ? 0 : -1;
        $(`#diagram-${button.dataset.architecture}`).hidden = !active;
    }
}
for (const tab of architectureTabs) {
    tab.addEventListener("click", () => setArchitecture(tab));
    tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const index = architectureTabs.indexOf(tab);
        const next = event.key === "Home" ? 0 : event.key === "End" ? architectureTabs.length - 1
            : (index + (event.key === "ArrowRight" ? 1 : -1) + architectureTabs.length) % architectureTabs.length;
        setArchitecture(architectureTabs[next]);
        architectureTabs[next].focus();
    });
}
start().catch((error) => {
    $("#graph-message").textContent = "知识数据加载失败，请刷新后重试";
    $("#knowledge-detail").textContent = "暂时无法加载知识点。";
    console.error(error);
});
