const relations = [["prerequisite", "前置基础"], ["component", "组成部分"], ["combination", "方法组合"], ["support", "工程支撑"]];

export function mountStudyMapEditor(target, { api, make, button }) {
    const panel = make("section", null, "local-paper-editor local-study-editor");
    panel.hidden = true;
    let dirty = () => false;
    window.addEventListener("beforeunload", (event) => {
        if (dirty()) { event.preventDefault(); event.returnValue = ""; }
    });
    const trigger = button("编辑知识图谱", async () => {
        trigger.disabled = true;
        try {
            const loaded = await api("/resource?id=knowledge");
            const value = structuredClone(loaded.document);
            const baseline = JSON.stringify(value);
            dirty = () => JSON.stringify(value) !== baseline;
            const selected = { group: value.groups[0].id, node: "", query: "" };
            render(loaded, value, selected);
        } catch (error) {
            panel.replaceChildren(make("p", error.message, "local-edit-status"));
            panel.hidden = false;
        } finally { trigger.disabled = false; }
    }, "network");
    target.append(trigger);
    const heading = target.closest(".study-heading");
    if (heading) heading.after(panel);
    else target.after(panel);

    function render(loaded, value, selected) {
        const group = value.groups.find((item) => item.id === selected.group) || value.groups[0];
        selected.group = group.id;
        const nodes = value.nodes.filter((item) => item.group === group.id);
        const node = nodes.find((item) => item.id === selected.node) || nodes[0];
        selected.node = node?.id || "";
        const form = make("div", null, "local-paper-form");
        const heading = make("div", null, "local-paper-form-heading");
        heading.append(make("strong", "图谱内容编辑"));
        const actions = make("div", null, "local-paper-form-actions");
        const feedback = make("p", "管理专题、知识点目录及关系；单个知识点属性请在右侧详情中编辑。", "local-edit-status");
        feedback.setAttribute("role", "status");
        const rerender = () => render(loaded, value, selected);
        const save = button("保存图谱", async () => {
            form.inert = true;
            feedback.textContent = "正在验证并保存…";
            try {
                const latest = await api("/resource?id=knowledge");
                if (latest.revision !== loaded.revision) throw new Error("图谱已在其他位置修改，请收起后重新打开。");
                await api("/resource?id=knowledge", "PUT", { revision: loaded.revision, document: value, label: "学习图谱可视化编辑" });
                dirty = () => false;
                location.reload();
            } catch (error) { feedback.textContent = error.message; }
            finally { form.inert = false; }
        }, "save");
        actions.append(save, button("取消 / 收起", () => {
            if (dirty() && !confirm("放弃未保存的图谱修改？")) return;
            dirty = () => false;
            panel.replaceChildren();
            panel.hidden = true;
        }, "chevron-up"));
        heading.append(actions);
        const columns = make("div", null, "local-paper-hierarchy local-study-hierarchy");
        function column(title) {
            const section = make("section", null, "local-paper-column");
            section.append(make("h3", title)); columns.append(section); return section;
        }
        function field(parent, title, text, update, multiline = false, eventName = "input") {
            const label = make("label", title);
            const input = make(multiline ? "textarea" : "input");
            input.value = text ?? "";
            input.setAttribute("aria-label", title);
            input.addEventListener(eventName, () => update(input.value));
            label.append(input); parent.append(label); return input;
        }
        function select(parent, title, choices, current, update) {
            const label = make("label", title);
            const control = make("select");
            for (const [id, text] of choices) control.add(new Option(text, id));
            control.value = current;
            control.setAttribute("aria-label", title);
            control.addEventListener("change", () => update(control.value));
            label.append(control); parent.append(label); return control;
        }
        function addNamed(parent, title, action) {
            const row = make("div", null, "local-study-add");
            const input = make("input");
            input.placeholder = title; input.setAttribute("aria-label", title);
            row.append(input, button("新增", () => {
                const name = input.value.trim();
                if (!name) { input.focus(); return; }
                action(name); rerender();
            }, "plus"));
            parent.append(row);
        }
        function unique(prefix, entries) {
            let index = 1;
            while (entries.some((item) => item.id === `${prefix}-${index}`)) index++;
            return `${prefix}-${index}`;
        }
        const groupsColumn = column("1 · 专题与方向");
        const groupFields = make("div", null, "local-study-group-fields");
        select(groupFields, "当前专题", value.groups.map((item) => [item.id, item.label]), group.id, (id) => {
            selected.group = id; selected.node = ""; rerender();
        });
        field(groupFields, "专题名称", group.label, (text) => { group.label = text; });
        groupsColumn.append(groupFields);
        const directions = make("div", null, "local-study-directions");
        for (const direction of group.directions) {
            const row = make("div", null, "local-study-direction");
            field(row, "方向名称", direction, () => {}).addEventListener("change", (event) => {
                const name = event.target.value.trim();
                if (!name || (name !== direction && group.directions.includes(name))) {
                    event.target.value = direction; feedback.textContent = "方向名称不能为空或重复。"; return;
                }
                group.directions[group.directions.indexOf(direction)] = name;
                for (const key of Object.keys(group.paths)) if (group.paths[key] === direction) group.paths[key] = name;
                for (const item of value.nodes) if (item.group === group.id && item.direction === direction) item.direction = name;
                rerender();
            });
            const remove = button("删除方向", () => {
                if (nodes.some((item) => item.direction === direction) || group.directions.length === 1) {
                    feedback.textContent = "请先移动该方向的知识点；每个专题至少保留一个方向。"; return;
                }
                if (!confirm(`删除方向“${direction}”？关联笔记可能需要先调整分类。`)) return;
                group.directions = group.directions.filter((item) => item !== direction);
                for (const key of Object.keys(group.paths)) if (group.paths[key] === direction) delete group.paths[key];
                rerender();
            }, "x");
            remove.title = "删除方向";
            remove.setAttribute("aria-label", "删除方向");
            row.append(remove); directions.append(row);
        }
        groupsColumn.append(directions);
        const groupAdditions = make("div", null, "local-study-group-additions");
        addNamed(groupAdditions, "新增方向名称", (name) => {
            if (group.directions.includes(name)) return;
            group.directions.push(name);
            const id = unique("direction", Object.keys(group.paths).map((id) => ({ id })));
            group.paths[id] = name;
        });
        addNamed(groupAdditions, "新增专题名称", (name) => {
            const id = unique("topic", value.groups);
            value.groups.push({ id, label: name, directions: ["基础概念"], paths: { basics: "基础概念" } });
            selected.group = id; selected.node = "";
        });
        groupsColumn.append(groupAdditions);
        const nodesColumn = column("2 · 知识点");
        const search = field(nodesColumn, "筛选知识点", selected.query, (text) => {
            selected.query = text;
            for (const item of list.children) item.hidden = !item.textContent.toLowerCase().includes(text.toLowerCase());
        });
        search.type = "search";
        const list = make("div", null, "local-study-node-list");
        for (const item of nodes) {
            const choice = button(item.label, () => { selected.node = item.id; rerender(); });
            choice.setAttribute("aria-pressed", String(item.id === node?.id));
            choice.hidden = !item.label.toLowerCase().includes(selected.query.toLowerCase());
            list.append(choice);
        }
        nodesColumn.append(list);
        addNamed(nodesColumn, "新增知识点名称", (name) => {
            const id = unique("knowledge", value.nodes);
            value.nodes.push({ id, label: name, group: group.id, direction: group.directions[0], level: value.levels[0].id, score: value.levels[0].score, description: "" });
            selected.node = id; selected.query = "";
        });
        const relationColumn = column("3 · 图谱关系");
        const nodeEdges = node ? value.edges.filter((item) => item.source === node.id || item.target === node.id) : [];
        const edgeList = make("div", null, "local-study-edge-list");
        const add = button("新增连线", () => {
            const other = value.nodes.find((item) => item.id !== node?.id);
            if (!node || !other) return;
            selected.relation = { source: node.id, target: other.id, type: "prerequisite", label: "" };
            value.edges.push(selected.relation);
            rerender();
        }, "plus");
        add.disabled = !node || value.nodes.length < 2;
        relationColumn.append(add, edgeList);
        for (const edge of nodeEdges) {
            const relation = make("details", null, "local-study-edge");
            relation.open = selected.relation === edge;
            const source = value.nodes.find((item) => item.id === edge.source)?.label || edge.source;
            const target = value.nodes.find((item) => item.id === edge.target)?.label || edge.target;
            relation.append(make("summary", `${source} → ${target} · ${relations.find(([id]) => id === edge.type)?.[1] || edge.type}${edge.label ? ` · ${edge.label}` : ""}`));
            const choices = value.nodes.filter((item) => item.id !== edge.target).map((item) => [item.id, item.label]);
            const targets = value.nodes.filter((item) => item.id !== edge.source).map((item) => [item.id, item.label]);
            select(relation, "起点知识点", choices, edge.source, (id) => { edge.source = id; });
            select(relation, "终点知识点", targets, edge.target, (id) => { edge.target = id; });
            select(relation, "关系类型", relations, edge.type, (text) => { edge.type = text; });
            field(relation, "关系说明", edge.label, (text) => { edge.label = text; });
            relation.append(button("删除连线", () => { value.edges.splice(value.edges.indexOf(edge), 1); rerender(); }, "unlink"));
            edgeList.append(relation);
        }
        if (!nodeEdges.length) edgeList.append(make("p", "当前知识点暂无关联，添加后会显示在这里。", "local-edit-status"));
        form.append(heading, columns, feedback);
        panel.dataset.editorOpen = "true";
        panel.replaceChildren(form);
        panel.hidden = false;
        window.lucide?.createIcons();
    }
}

export function mountStudyNodeEditor(target, { api, make, button }) {
    const detail = target.closest("#knowledge-detail");
    if (!detail) return;
    const panel = make("section", null, "local-study-node-editor");
    panel.hidden = true;
    let nodeId = detail.dataset.nodeId || "";
    let activeTrigger;
    let dirty = () => false;

    const close = (ask = true) => {
        if (ask && dirty() && !confirm("放弃未保存的知识点修改？")) return false;
        dirty = () => false;
        panel.replaceChildren();
        panel.hidden = true;
        if (activeTrigger) {
            activeTrigger.querySelector("span").textContent = "编辑此知识点";
            activeTrigger.setAttribute("aria-expanded", "false");
        }
        return true;
    };
    window.addEventListener("studybeforeselectnode", (event) => {
        if (!panel.hidden && !close()) event.preventDefault();
    });

    function bind(id) {
        nodeId = id;
        const currentDetail = document.querySelector("#knowledge-detail");
        const actions = currentDetail?.querySelector("#node-editor-actions");
        const heading = currentDetail?.querySelector(".knowledge-detail-heading");
        if (!actions || !heading) return;
        const trigger = button("编辑此知识点", async () => {
            if (!panel.hidden) {
                close();
                return;
            }
            const selectedNodeId = nodeId;
            trigger.disabled = true;
            try {
                const loaded = await api("/resource?id=knowledge");
                const value = structuredClone(loaded.document);
                const node = value.nodes.find((item) => item.id === selectedNodeId);
                if (!node) throw new Error("知识点已不存在，请刷新页面。");
                if (nodeId !== selectedNodeId) return;
                const baseline = JSON.stringify(node);
                dirty = () => JSON.stringify(node) !== baseline;
                render(loaded, value, node);
                activeTrigger.querySelector("span").textContent = "收起知识点编辑";
                activeTrigger.setAttribute("aria-expanded", "true");
            } catch (error) {
                if (nodeId !== selectedNodeId) return;
                panel.replaceChildren(make("p", error.message, "local-edit-status"));
                panel.hidden = false;
                trigger.querySelector("span").textContent = "收起知识点编辑";
                trigger.setAttribute("aria-expanded", "true");
            } finally {
                trigger.disabled = false;
            }
        }, "pencil");
        activeTrigger = trigger;
        trigger.setAttribute("aria-expanded", "false");
        actions.replaceChildren(trigger);
        heading.after(panel);
        panel.hidden = true;
        window.lucide?.createIcons();
    }

    function render(loaded, value, node) {
        const form = make("div", null, "local-study-node-form");
        const heading = make("div", null, "local-study-node-form-heading");
        heading.append(make("strong", `${node.label} · 知识点属性`));
        const actions = make("div", null, "local-paper-form-actions");
        const feedback = make("p", "掌握度修改仅在本地编辑模式下写入知识库。", "local-edit-status");
        feedback.setAttribute("role", "status");
        const save = button("保存知识点", async () => {
            form.inert = true;
            feedback.textContent = "正在验证并保存…";
            try {
                const latest = await api("/resource?id=knowledge");
                if (latest.revision !== loaded.revision) throw new Error("知识图谱已在其他位置修改，请关闭后重新打开编辑。");
                await api("/resource?id=knowledge", "PUT", {
                    revision: loaded.revision,
                    document: value,
                    label: `学习知识点：${node.label}`,
                });
                dirty = () => false;
                location.reload();
            } catch (error) {
                feedback.textContent = error.message;
            } finally {
                form.inert = false;
            }
        }, "save");
        const cancel = button("取消", () => close(), "x");
        actions.append(save, cancel);
        heading.append(actions);

        const fields = make("div", null, "local-study-node-fields");
        const field = (title, text, update, multiline = false) => {
            const label = make("label", title);
            const control = make(multiline ? "textarea" : "input");
            control.value = text ?? "";
            control.setAttribute("aria-label", title);
            control.addEventListener("input", () => update(control.value));
            label.append(control);
            fields.append(label);
            return control;
        };
        const select = (title, choices, current, update) => {
            const label = make("label", title);
            const control = make("select");
            for (const [id, text] of choices) control.add(new Option(text, id));
            control.value = current;
            control.setAttribute("aria-label", title);
            control.addEventListener("change", () => update(control.value));
            label.append(control);
            fields.append(label);
            return control;
        };
        field("知识点名称", node.label, (text) => {
            node.label = text;
            heading.querySelector("strong").textContent = `${text || "未命名知识点"} · 知识点属性`;
        });
        select("所属专题", value.groups.map((item) => [item.id, item.label]), node.group, (id) => {
            node.group = id;
            const group = value.groups.find((item) => item.id === id);
            node.direction = group.directions[0];
            render(loaded, value, node);
        });
        const group = value.groups.find((item) => item.id === node.group) || value.groups[0];
        select("具体方向", group.directions.map((item) => [item, item]), node.direction, (direction) => {
            node.direction = direction;
        });
        const defaultScore = Number.isInteger(node.score)
            ? node.score
            : value.levels.find((item) => item.id === node.level)?.score ?? 0;
        const mastery = make("section", null, "local-study-mastery-editor");
        mastery.append(make("h4", "我的掌握程度"));
        const controls = make("div", null, "local-study-mastery-controls");
        const rangeLabel = make("label", "滑动调整");
        const range = make("input");
        range.type = "range";
        range.min = "0";
        range.max = "100";
        range.step = "1";
        range.value = String(defaultScore);
        range.setAttribute("aria-label", "熟练度滑块");
        rangeLabel.append(range);
        const numberLabel = make("label", "分值");
        const number = make("input");
        number.type = "number";
        number.min = "0";
        number.max = "100";
        number.step = "1";
        number.value = String(defaultScore);
        number.inputMode = "numeric";
        number.setAttribute("aria-label", "熟练度数值");
        numberLabel.append(number);
        const result = make("output", null, "local-study-mastery-result");
        const description = make("p", "", "local-study-mastery-description");
        const updateMastery = (raw, persist = true) => {
            const score = Number(raw);
            if (!Number.isInteger(score) || score < 0 || score > 100) return false;
            const level = value.levels.find((item) => score >= item.min && score <= item.max) || value.levels[0];
            if (persist) {
                node.score = score;
                node.level = level.id;
            }
            range.value = String(score);
            number.value = String(score);
            range.style.setProperty("--mastery-color", level.color);
            const dot = make("span", null, "mastery-dot");
            dot.style.setProperty("--mastery-color", level.color);
            result.replaceChildren(dot, make("strong", level.label), make("span", `${score} / 100`));
            description.textContent = level.description;
            return true;
        };
        range.addEventListener("input", () => updateMastery(range.value));
        number.addEventListener("change", () => {
            if (!updateMastery(number.value)) updateMastery(node.score ?? defaultScore);
        });
        controls.append(rangeLabel, numberLabel, result);
        mastery.append(controls, description);
        const descriptionField = field("知识点说明", node.description, (text) => { node.description = text; }, true);
        updateMastery(defaultScore, false);
        const deleteButton = button("删除知识点", () => {
            if (value.nodes.length === 1) {
                feedback.textContent = "至少保留一个知识点。";
                return;
            }
            if (!confirm(`删除“${node.label}”及其图谱关系？引用该知识点的学习笔记也需要检查。`)) return;
            value.nodes = value.nodes.filter((item) => item !== node);
            value.edges = value.edges.filter((edge) => edge.source !== node.id && edge.target !== node.id);
            for (const reference of value.references || []) {
                reference.concepts = (reference.concepts || []).filter((id) => id !== node.id);
            }
            save.click();
        }, "trash-2");
        form.append(heading, fields, mastery, descriptionField.closest("label"), deleteButton, feedback);
        panel.dataset.editorOpen = "true";
        panel.replaceChildren(form);
        panel.hidden = false;
        window.lucide?.createIcons();
    }

    window.addEventListener("studynodeselected", (event) => bind(event.detail.id));
    bind(nodeId);
}

export function mountStudySelfAssessmentEditor(target, { api, make, button }) {
    const section = target.closest(".knowledge-list");
    if (!section) return;
    const panel = make("section", null, "local-paper-editor local-study-editor local-study-assessment-editor");
    panel.hidden = true;
    let dirty = () => false;
    window.addEventListener("beforeunload", (event) => {
        if (dirty()) { event.preventDefault(); event.returnValue = ""; }
    });

    const close = () => {
        if (dirty() && !confirm("放弃未保存的自评修改？")) return;
        dirty = () => false;
        panel.replaceChildren();
        panel.hidden = true;
        trigger.querySelector("span").textContent = "编辑知识自评";
        trigger.setAttribute("aria-expanded", "false");
    };
    const trigger = button("编辑知识自评", async () => {
        if (!panel.hidden) { close(); return; }
        trigger.disabled = true;
        try {
            const loaded = await api("/resource?id=knowledge");
            const value = structuredClone(loaded.document);
            const scoreOf = (node) => node.score ?? value.levels.find((level) => level.id === node.level)?.score ?? 0;
            const baseline = JSON.stringify(value.nodes.map((node) => [node.id, scoreOf(node)]));
            dirty = () => JSON.stringify(value.nodes.map((node) => [node.id, scoreOf(node)])) !== baseline;
            render(loaded, value, scoreOf);
            panel.hidden = false;
            trigger.querySelector("span").textContent = "收起知识自评";
            trigger.setAttribute("aria-expanded", "true");
        } catch (error) {
            panel.replaceChildren(make("p", error.message, "local-edit-status"));
            panel.hidden = false;
            trigger.querySelector("span").textContent = "收起知识自评";
            trigger.setAttribute("aria-expanded", "true");
        } finally { trigger.disabled = false; }
    }, "sliders-horizontal");
    trigger.setAttribute("aria-expanded", "false");
    target.append(trigger);
    section.insertBefore(panel, section.querySelector(".knowledge-list-details"));

    function render(loaded, value, scoreOf) {
        const form = make("div", null, "local-paper-form");
        const heading = make("div", null, "local-paper-form-heading");
        heading.append(make("strong", "知识点自评"));
        const actions = make("div", null, "local-paper-form-actions");
        const feedback = make("p", "调整分数后会按当前等级区间自动更新掌握状态。", "local-edit-status");
        feedback.setAttribute("role", "status");
        const save = button("保存自评", async () => {
            if (value.nodes.some((node) => !Number.isInteger(scoreOf(node)) || scoreOf(node) < 0 || scoreOf(node) > 100)) {
                feedback.textContent = "请将每个知识点的分数设为 0 到 100 之间的整数。";
                return;
            }
            form.inert = true;
            feedback.textContent = "正在验证并保存…";
            try {
                const latest = await api("/resource?id=knowledge");
                if (latest.revision !== loaded.revision) throw new Error("知识图谱已在其他位置修改，请关闭后重新打开。");
                await api("/resource?id=knowledge", "PUT", {
                    revision: loaded.revision,
                    document: value,
                    label: "学习知识点自评",
                });
                dirty = () => false;
                location.reload();
            } catch (error) {
                feedback.textContent = error.message;
            } finally { form.inert = false; }
        }, "save");
        actions.append(save, button("取消 / 收起", close, "chevron-up"));
        heading.append(actions);
        const list = make("div", null, "local-study-assessment-list");

        for (const group of value.groups) {
            const groupNodes = value.nodes.filter((node) => node.group === group.id);
            if (!groupNodes.length) continue;
            const groupSection = make("section", null, "local-study-assessment-group");
            groupSection.append(make("h4", group.label));
            const rows = make("div", null, "local-study-assessment-rows");
            for (const node of groupNodes) {
                const row = make("div", null, "local-study-assessment-row");
                const copy = make("div", null, "local-study-assessment-copy");
                copy.append(make("strong", node.label), make("small", node.direction));
                const score = scoreOf(node);
                const level = value.levels.find((item) => score >= item.min && score <= item.max) || value.levels[0];
                const range = make("input");
                range.type = "range";
                range.min = "0";
                range.max = "100";
                range.step = "1";
                range.value = String(score);
                range.setAttribute("aria-label", `自评滑块：${node.label}`);
                const rangeLabel = make("div", null, "local-study-assessment-range");
                rangeLabel.append(range);
                const number = make("input");
                number.type = "number";
                number.min = "0";
                number.max = "100";
                number.step = "1";
                number.value = String(score);
                number.inputMode = "numeric";
                number.setAttribute("aria-label", `自评分数：${node.label}`);
                const numberLabel = make("div", null, "local-study-assessment-number");
                numberLabel.append(number);
                const result = make("output", null, "local-study-assessment-result");
                const update = (raw) => {
                    const next = Number(raw);
                    if (!Number.isInteger(next) || next < 0 || next > 100) return false;
                    const nextLevel = value.levels.find((item) => next >= item.min && next <= item.max) || value.levels[0];
                    node.score = next;
                    node.level = nextLevel.id;
                    range.value = String(next);
                    number.value = String(next);
                    range.style.setProperty("--mastery-color", nextLevel.color);
                    result.replaceChildren(make("span", nextLevel.label));
                    result.style.setProperty("--mastery-color", nextLevel.color);
                    return true;
                };
                range.addEventListener("input", () => update(range.value));
                number.addEventListener("change", () => {
                    if (!update(number.value)) {
                        feedback.textContent = "分数需为 0 到 100 之间的整数。";
                        number.value = String(scoreOf(node));
                    } else feedback.textContent = "调整分数后会按当前等级区间自动更新掌握状态。";
                });
                update(score);
                row.append(copy, rangeLabel, result, numberLabel);
                rows.append(row);
            }
            groupSection.append(rows);
            list.append(groupSection);
        }
        form.append(heading, list, feedback);
        panel.replaceChildren(form);
        window.lucide?.createIcons();
    }
}

export function mountStudySourcesEditor(target, { api, make, button }) {
    const section = target.closest(".knowledge-sources");
    const panel = make("section", null, "local-paper-editor local-study-editor local-study-source-editor");
    panel.hidden = true;
    let dirty = () => false;
    window.addEventListener("beforeunload", (event) => {
        if (dirty()) { event.preventDefault(); event.returnValue = ""; }
    });
    const trigger = button("编辑资料来源", async () => {
        if (!panel.hidden) {
            if (dirty() && !confirm("放弃未保存的资料来源修改？")) return;
            dirty = () => false;
            panel.replaceChildren();
            panel.hidden = true;
            trigger.querySelector("span").textContent = "编辑资料来源";
            return;
        }
        trigger.disabled = true;
        try {
            const loaded = await api("/resource?id=knowledge");
            const value = structuredClone(loaded.document);
            value.references ||= [];
            const baseline = JSON.stringify(value.references);
            dirty = () => JSON.stringify(value.references) !== baseline;
            render(loaded, value);
            panel.hidden = false;
            trigger.querySelector("span").textContent = "收起资料编辑";
        } catch (error) {
            panel.replaceChildren(make("p", error.message, "local-edit-status"));
            panel.hidden = false;
        } finally { trigger.disabled = false; }
    }, "book-open");
    target.append(trigger);
    section.insertBefore(panel, section.querySelector("#knowledge-sources"));

    function render(loaded, value) {
        const form = make("div", null, "local-paper-form");
        const heading = make("div", null, "local-paper-form-heading");
        heading.append(make("strong", "原始资料来源编辑"));
        const actions = make("div", null, "local-paper-form-actions");
        const feedback = make("p", "修改资料名称、链接及关联知识点后保存。", "local-edit-status");
        feedback.setAttribute("role", "status");
        const close = () => {
            if (dirty() && !confirm("放弃未保存的资料来源修改？")) return;
            dirty = () => false;
            panel.replaceChildren();
            panel.hidden = true;
            trigger.querySelector("span").textContent = "编辑资料来源";
        };
        const save = button("保存资料", async () => {
            form.inert = true;
            feedback.textContent = "正在验证并保存…";
            try {
                const latest = await api("/resource?id=knowledge");
                if (latest.revision !== loaded.revision) throw new Error("知识图谱文件已在其他位置修改，请收起后重新打开。");
                await api("/resource?id=knowledge", "PUT", { revision: loaded.revision, document: value, label: "学习资料来源编辑" });
                dirty = () => false;
                location.reload();
            } catch (error) { feedback.textContent = error.message; }
            finally { form.inert = false; }
        }, "save");
        actions.append(save, button("取消 / 收起", close, "chevron-up"));
        heading.append(actions);
        const list = make("div", null, "local-study-source-list");
        function field(parent, title, text, update, type = "text") {
            const label = make("label", title);
            const input = make("input");
            input.type = type;
            input.value = text ?? "";
            input.setAttribute("aria-label", title);
            input.addEventListener("input", () => update(input.value));
            label.append(input);
            parent.append(label);
            return input;
        }
        value.references.forEach((reference, index) => {
            reference.concepts ||= [];
            const item = make("section", null, "local-study-source-item");
            const itemHeading = make("strong", `${index + 1} · ${reference.label || "未命名资料"}`);
            item.append(itemHeading);
            const row = make("div", null, "local-study-source");
            field(row, "资料名称", reference.label, (text) => {
                reference.label = text;
                itemHeading.textContent = `${index + 1} · ${text || "未命名资料"}`;
            });
            field(row, "HTTPS 链接", reference.url, (text) => { reference.url = text; }, "url");
            row.append(button("删除资料", () => {
                value.references.splice(index, 1);
                dirty = () => JSON.stringify(value.references) !== JSON.stringify(loaded.document.references || []);
                render(loaded, value);
            }, "trash-2"));
            item.append(row);
            const picker = make("details", null, "local-study-reference-concepts");
            const summary = make("summary", `关联知识点 · ${reference.concepts.length}`);
            const search = make("input");
            search.type = "search";
            search.placeholder = "搜索知识点";
            search.setAttribute("aria-label", "筛选资料关联知识点");
            const checks = make("div", null, "local-study-reference-checks");
            for (const concept of value.nodes) {
                const label = make("label");
                const checkbox = make("input");
                checkbox.type = "checkbox";
                checkbox.value = concept.id;
                checkbox.checked = reference.concepts.includes(concept.id);
                checkbox.setAttribute("aria-label", concept.label);
                checkbox.addEventListener("change", () => {
                    reference.concepts = checkbox.checked
                        ? [...new Set([...reference.concepts, concept.id])]
                        : reference.concepts.filter((id) => id !== concept.id);
                    summary.textContent = `关联知识点 · ${reference.concepts.length}`;
                });
                label.append(checkbox, make("span", concept.label));
                checks.append(label);
            }
            search.addEventListener("input", () => {
                for (const option of checks.children) option.hidden = !option.textContent.toLowerCase().includes(search.value.toLowerCase());
            });
            picker.append(summary, search, checks);
            item.append(picker);
            list.append(item);
        });
        const add = button("新增资料", () => {
            value.references.push({ label: "新资料", url: "https://", concepts: [] });
            dirty = () => JSON.stringify(value.references) !== JSON.stringify(loaded.document.references || []);
            render(loaded, value);
        }, "plus");
        form.append(heading, list, add, feedback);
        panel.replaceChildren(form);
        window.lucide?.createIcons();
    }
}

export function mountStudyDetailEditors(target, { api, make, button }) {
    const detail = target.closest("#knowledge-detail");
    if (!detail) return;

    const definitions = [
        { id: "notes", selector: '[data-detail-editor="notes"]', title: "编辑笔记关联", icon: "notebook-pen" },
        { id: "resources", selector: '[data-detail-editor="resources"]', title: "编辑学习资料", icon: "pencil" },
        { id: "relations", selector: '[data-detail-editor="relations"]', title: "编辑知识关系", icon: "git-branch" },
    ];
    const editors = new Map();
    let nodeId = detail.dataset.nodeId || "";
    let activeId = "";

    function close(editor, ask = true) {
        if (ask && editor.dirty() && !confirm("放弃未保存的修改？")) return false;
        editor.dirty = () => false;
        editor.panel.replaceChildren();
        editor.panel.hidden = true;
        editor.trigger?.setAttribute("aria-expanded", "false");
        activeId = "";
        return true;
    }

    window.addEventListener("studybeforeselectnode", (event) => {
        const editor = editors.get(activeId);
        if (editor && !close(editor)) event.preventDefault();
    });
    window.addEventListener("beforeunload", (event) => {
        const editor = editors.get(activeId);
        if (editor?.dirty()) { event.preventDefault(); event.returnValue = ""; }
    });

    function bind(id) {
        nodeId = id;
        for (const definition of definitions) {
            let editor = editors.get(definition.id);
            if (!editor) {
                editor = {
                    ...definition,
                    panel: make("section", null, "local-study-detail-editor"),
                    trigger: null,
                    dirty: () => false,
                };
                editor.panel.hidden = true;
                editors.set(definition.id, editor);
            }
            const actions = detail.querySelector(editor.selector);
            const heading = actions?.closest(".node-section-heading");
            if (!actions || !heading) continue;
            const trigger = button("编辑", async () => {
                if (activeId === editor.id) {
                    close(editor);
                    return;
                }
                const active = editors.get(activeId);
                if (active && !close(active)) return;
                const selectedId = nodeId;
                trigger.disabled = true;
                try {
                    if (editor.id === "notes") await openNotes(editor, selectedId);
                    else if (editor.id === "resources") await openResources(editor, selectedId);
                    else await openRelations(editor, selectedId);
                    editor.trigger = trigger;
                    trigger.setAttribute("aria-expanded", "true");
                    activeId = editor.id;
                } catch (error) {
                    editor.panel.replaceChildren(make("p", error.message, "local-edit-status"));
                    editor.panel.hidden = false;
                    editor.trigger = trigger;
                    trigger.setAttribute("aria-expanded", "true");
                    activeId = editor.id;
                } finally {
                    trigger.disabled = false;
                }
            }, editor.icon);
            trigger.title = editor.title;
            trigger.setAttribute("aria-label", editor.title);
            trigger.setAttribute("aria-expanded", String(activeId === editor.id));
            editor.trigger = trigger;
            actions.replaceChildren(trigger);
            heading.after(editor.panel);
        }
        window.lucide?.createIcons();
    }

    function field(parent, title, text, update, type = "text") {
        const label = make("label", title, "local-study-detail-field");
        const input = make("input");
        input.type = type;
        input.value = text ?? "";
        input.setAttribute("aria-label", title);
        input.addEventListener("input", () => update(input.value));
        label.append(input);
        parent.append(label);
        return input;
    }

    function select(parent, title, choices, current, update) {
        const label = make("label", title, "local-study-detail-field");
        const control = make("select");
        for (const [id, text] of choices) control.add(new Option(text, id));
        control.value = current;
        control.setAttribute("aria-label", title);
        control.addEventListener("change", () => update(control.value));
        label.append(control);
        parent.append(label);
        return control;
    }

    function startForm(editor, title, onSave, saveLabel) {
        const form = make("div", null, "local-study-detail-form");
        const heading = make("div", null, "local-paper-form-heading");
        heading.append(make("strong", title));
        const actions = make("div", null, "local-paper-form-actions");
        const feedback = make("p", "", "local-edit-status");
        feedback.setAttribute("role", "status");
        const save = button(saveLabel, async () => {
            form.inert = true;
            feedback.textContent = "正在验证并保存…";
            try {
                await onSave();
                editor.dirty = () => false;
                location.reload();
            } catch (error) {
                feedback.textContent = error.message;
            } finally {
                form.inert = false;
            }
        }, "save");
        const cancel = button("取消", () => close(editor), "x");
        actions.append(save, cancel);
        heading.append(actions);
        form.append(heading);
        editor.panel.replaceChildren(form, feedback);
        editor.panel.hidden = false;
        return { form, feedback };
    }

    async function saveKnowledge(loaded, value, label) {
        const latest = await api("/resource?id=knowledge");
        if (latest.revision !== loaded.revision) throw new Error("知识图谱已在其他位置修改，请关闭后重新打开。");
        await api("/resource?id=knowledge", "PUT", {
            revision: loaded.revision,
            document: value,
            label,
        });
    }

    async function openNotes(editor, selectedId) {
        const loaded = await Promise.all(studyNoteIndex.map(async (note) => {
            const path = note.source || note.localNote;
            if (!path?.startsWith("Study/notes/") || !path.endsWith(".md")) return null;
            const response = await api(`/resource?id=${encodeURIComponent(`note:${path}`)}`);
            const concepts = response.document.metadata.concepts || [];
            return {
                note,
                response,
                associated: concepts.includes(selectedId),
                nextAssociated: concepts.includes(selectedId),
            };
        }));
        const entries = loaded.filter(Boolean);
        const { form, feedback } = startForm(editor, "当前知识点 · 笔记关联", async () => {
            const changed = entries.filter((entry) => entry.associated !== entry.nextAssociated);
            for (const entry of changed) {
                const latest = await api(`/resource?id=${encodeURIComponent(entry.response.resource.id)}`);
                if (latest.revision !== entry.response.revision) {
                    throw new Error(`笔记“${entry.note.title}”已在其他位置修改；此前成功的关联已保存，可重新打开后继续。`);
                }
                const document = structuredClone(entry.response.document);
                const concepts = new Set(document.metadata.concepts || []);
                if (entry.nextAssociated) concepts.add(selectedId);
                else concepts.delete(selectedId);
                document.metadata.concepts = [...concepts];
                entry.response = await api(`/resource?id=${encodeURIComponent(entry.response.resource.id)}`, "PUT", {
                    revision: entry.response.revision,
                    document,
                    label: `知识点笔记关联：${entry.note.title}`,
                });
                entry.associated = entry.nextAssociated;
            }
            feedback.textContent = "笔记关联已保存。";
        }, "保存笔记关联");
        const search = make("input");
        search.type = "search";
        search.placeholder = "搜索学习笔记";
        search.setAttribute("aria-label", "搜索学习笔记");
        const list = make("div", null, "local-study-note-assignments");
        const renderList = () => {
            list.replaceChildren();
            const query = search.value.trim().toLocaleLowerCase();
            for (const entry of entries.filter((item) => `${item.note.title} ${item.note.category || ""}`.toLocaleLowerCase().includes(query))) {
                const label = make("label", null, "local-study-note-assignment");
                const checkbox = make("input");
                checkbox.type = "checkbox";
                checkbox.checked = entry.nextAssociated;
                checkbox.setAttribute("aria-label", `关联笔记：${entry.note.title}`);
                checkbox.addEventListener("change", () => {
                    entry.nextAssociated = checkbox.checked;
                    editor.dirty = () => entries.some((item) => item.associated !== item.nextAssociated);
                });
                const text = make("span", null, "local-study-note-assignment-copy");
                text.append(make("strong", entry.note.shortTitle || entry.note.title || entry.note.id));
                text.append(make("small", [entry.note.category, entry.note.status].filter(Boolean).join(" · ") || entry.note.id));
                label.append(checkbox, text);
                list.append(label);
            }
            if (!list.children.length) list.append(make("p", entries.length ? "没有匹配的笔记" : "还没有可关联的学习笔记。", "local-edit-status"));
        };
        search.addEventListener("input", renderList);
        renderList();
        form.append(search, list);
        editor.dirty = () => entries.some((entry) => entry.associated !== entry.nextAssociated);
    }

    async function openResources(editor, selectedId) {
        const loaded = await api("/resource?id=knowledge");
        const value = structuredClone(loaded.document);
        const node = value.nodes.find((item) => item.id === selectedId);
        if (!node) throw new Error("当前知识点已不存在，请刷新页面。");
        value.references ||= [];
        const baseline = JSON.stringify(value);
        editor.dirty = () => JSON.stringify(value) !== baseline;
        const { form } = startForm(editor, `${node.label} · 学习资料`, () => {
            for (const reference of value.references) {
                let validUrl = false;
                try { validUrl = new URL(reference.url).protocol === "https:"; } catch {}
                if (!reference.label?.trim() || !validUrl) throw new Error("原始资料合集需要填写名称和 HTTPS 链接。");
            }
            for (const resource of node.resources || []) {
                let validUrl = false;
                try { validUrl = new URL(resource.url).protocol === "https:"; } catch {}
                if (!resource.label?.trim() || !validUrl) throw new Error("本知识点补充资料需要填写名称和 HTTPS 链接。");
            }
            return saveKnowledge(loaded, value, `学习资料：${node.label}`);
        }, "保存学习资料");
        const shared = make("section", null, "local-study-detail-source-scope");
        const sharedHeading = make("div", null, "local-study-detail-subheading");
        sharedHeading.append(make("strong", "原始资料合集"), make("small", "修改后同步到底部资料库"));
        const sharedList = make("div", null, "local-study-detail-source-list");
        const sharedActions = make("div", null, "local-study-detail-source-actions");
        const linkSelect = make("select");
        linkSelect.setAttribute("aria-label", "选择现有合集资料");
        const linkButton = button("关联已有资料", () => {
            const index = Number(linkSelect.value);
            const reference = value.references[index];
            if (!reference) return;
            reference.concepts = [...new Set([...(reference.concepts || []), selectedId])];
            renderShared();
            linkSelect.focus();
        }, "link");
        linkSelect.addEventListener("change", () => {
            linkButton.disabled = !linkSelect.value;
        });
        const supplemental = make("section", null, "local-study-detail-source-scope");
        const supplementalHeading = make("div", null, "local-study-detail-subheading");
        supplementalHeading.append(make("strong", "本知识点补充"), make("small", "仅显示在当前知识点"));
        const supplementalList = make("div", null, "local-study-detail-source-list");

        const renderShared = () => {
            sharedList.replaceChildren();
            const linked = value.references
                .map((reference, index) => ({ reference, index }))
                .filter(({ reference }) => (reference.concepts || []).includes(selectedId));
            linked.forEach(({ reference }) => {
                const row = make("div", null, "local-study-detail-resource-row local-study-detail-resource-row--linked");
                const fields = make("div", null, "local-study-detail-resource-fields");
                field(fields, "合集资料名称", reference.label, (text) => { reference.label = text; });
                field(fields, "合集资料链接", reference.url, (text) => { reference.url = text; }, "url");
                const remove = button("取消关联", () => {
                    reference.concepts = (reference.concepts || []).filter((id) => id !== selectedId);
                    renderShared();
                }, "unlink");
                remove.title = "取消当前知识点与该合集的关联";
                remove.setAttribute("aria-label", "取消当前知识点与该合集的关联");
                row.append(fields, remove);
                sharedList.append(row);
            });
            if (!linked.length) sharedList.append(make("p", "当前知识点暂未关联合集资料。", "local-edit-status"));
            const available = value.references
                .map((reference, index) => ({ reference, index }))
                .filter(({ reference }) => !(reference.concepts || []).includes(selectedId));
            linkSelect.replaceChildren(new Option("选择已有合集资料…", ""));
            for (const { reference, index } of available) {
                linkSelect.add(new Option(reference.label || "未命名资料", String(index)));
            }
            linkSelect.disabled = !available.length;
            linkButton.disabled = !available.length || !linkSelect.value;
        };

        const renderSupplemental = () => {
            supplementalList.replaceChildren();
            (node.resources || []).forEach((resource, index) => {
                const row = make("div", null, "local-study-detail-resource-row local-study-detail-resource-row--local");
                const fields = make("div", null, "local-study-detail-resource-fields");
                field(fields, "补充资料名称", resource.label, (text) => { resource.label = text; });
                field(fields, "补充资料链接", resource.url, (text) => { resource.url = text; }, "url");
                row.append(fields, button("删除补充资料", () => {
                    node.resources.splice(index, 1);
                    renderSupplemental();
                }, "trash-2"));
                supplementalList.append(row);
            });
            if (!(node.resources || []).length) supplementalList.append(make("p", "暂无本知识点补充资料。", "local-edit-status"));
        };

        sharedActions.append(linkSelect, linkButton);
        shared.append(sharedHeading, sharedActions, sharedList, button("添加到原始资料合集", () => {
            value.references.push({ label: "", url: "", concepts: [selectedId] });
            renderShared();
            sharedList.querySelector(".local-study-detail-resource-row:last-child input[aria-label='合集资料名称']")?.focus();
        }, "plus"));
        supplemental.append(supplementalHeading, supplementalList, button("添加本点补充资料", () => {
            node.resources ||= [];
            node.resources.push({ label: "", url: "" });
            renderSupplemental();
            supplementalList.querySelector(".local-study-detail-resource-row:last-child input[aria-label='补充资料名称']")?.focus();
        }, "plus"));
        renderShared();
        renderSupplemental();
        form.append(shared, supplemental);
    }

    async function openRelations(editor, selectedId) {
        const loaded = await api("/resource?id=knowledge");
        const value = structuredClone(loaded.document);
        const node = value.nodes.find((item) => item.id === selectedId);
        if (!node) throw new Error("当前知识点已不存在，请刷新页面。");
        const baseline = JSON.stringify(value.edges);
        editor.dirty = () => JSON.stringify(value.edges) !== baseline;
        const { form } = startForm(editor, `${node.label} · 知识关系`, () => saveKnowledge(loaded, value, `知识关系：${node.label}`), "保存知识关系");
        const list = make("div", null, "local-study-detail-relations");
        const relationChoices = [["prerequisite", "前置基础"], ["component", "组成部分"], ["combination", "方法组合"], ["support", "工程支撑"]];
        const renderRelations = () => {
            list.replaceChildren();
            const edges = value.edges.filter((edge) => edge.source === selectedId || edge.target === selectedId);
            for (const edge of edges) {
                const row = make("div", null, "local-study-detail-relation");
                select(row, "起点知识点", value.nodes.filter((item) => item.id !== edge.target).map((item) => [item.id, item.label]), edge.source, (id) => {
                    edge.source = id;
                    if (edge.source === edge.target) edge.target = value.nodes.find((item) => item.id !== id)?.id || edge.target;
                    renderRelations();
                });
                select(row, "关系类型", relationChoices, edge.type, (type) => { edge.type = type; });
                select(row, "终点知识点", value.nodes.filter((item) => item.id !== edge.source).map((item) => [item.id, item.label]), edge.target, (id) => {
                    edge.target = id;
                    renderRelations();
                });
                field(row, "关系说明", edge.label, (text) => { edge.label = text; });
                row.append(button("删除关系", () => {
                    value.edges.splice(value.edges.indexOf(edge), 1);
                    renderRelations();
                }, "unlink"));
                list.append(row);
            }
            if (!edges.length) list.append(make("p", "当前知识点暂无关系，可以新增一条连接。", "local-edit-status"));
        };
        const add = button("新增关系", () => {
            const other = value.nodes.find((item) => item.id !== selectedId);
            if (!other) return;
            value.edges.push({ source: selectedId, target: other.id, type: "prerequisite", label: "" });
            renderRelations();
        }, "plus");
        form.append(add, list);
        renderRelations();
    }

    bind(nodeId);
    window.addEventListener("studynodeselected", (event) => bind(event.detail.id));
}

let studyNoteIndex = window.StudyContent?.notes || [];
window.addEventListener("studycontentready", (event) => {
    studyNoteIndex = event.detail.notes || [];
});
