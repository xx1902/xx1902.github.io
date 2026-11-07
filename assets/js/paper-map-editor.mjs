import { paperTopics } from "./paper-taxonomy.mjs";

export function mountPaperMapEditor(target, { api, make, button }) {
    const panel = make("section", null, "local-paper-editor");
    let unsaved = () => false;
    window.addEventListener("beforeunload", (event) => {
        if (unsaved()) { event.preventDefault(); event.returnValue = ""; }
    });
    const trigger = button("编辑专题与关系", async () => {
        trigger.disabled = true;
        try {
            const loaded = await api("/resource?id=paper-map");
            const notes = (await api("")).resources.filter((entry) => entry.module === "Paper" && entry.kind === "note");
            const value = structuredClone(loaded.document);
            value.graph ||= { title: "推理系统与模型服务", description: "" };
            value.rootTopics ??= paperTopics(value).map((topic) => topic.topic);
            value.directions ??= [];
            value.relations ??= [];
            const baseline = JSON.stringify(value);
            unsaved = () => JSON.stringify(value) !== baseline;
            render(loaded, notes, value, { topic: paperTopics(value)[0]?.topic || "", direction: "" });
        } catch (error) { panel.replaceChildren(trigger, make("p", error.message, "local-edit-status")); }
        finally { trigger.disabled = false; }
    }, "network");
    panel.append(trigger);
    target.after(panel);

    function render(loaded, notes, value, selected) {
        const topics = paperTopics(value);
        const currentTopic = topics.find((topic) => topic.topic === selected.topic);
        const directions = value.directions.filter((direction) => direction.topic === currentTopic?.topic);
        if (!directions.some((direction) => direction.id === selected.direction)) selected.direction = directions[0]?.id || "";
        const currentDirection = directions.find((direction) => direction.id === selected.direction);
        const form = make("div", null, "local-paper-form");
        const heading = make("div", null, "local-paper-form-heading");
        heading.append(make("strong", "专题与图谱关系"));
        const actions = make("div", null, "local-paper-form-actions");
        const feedback = make("p", "", "local-edit-status");
        feedback.setAttribute("role", "status");
        const rerender = () => render(loaded, notes, value, selected);
        const save = button("保存", async () => {
            save.disabled = true;
            form.inert = true;
            feedback.textContent = "正在保存…";
            try {
                const latest = await api("/resource?id=paper-map");
                if (latest.revision !== loaded.revision) throw new Error("图谱已在其他位置更新，请重新打开编辑器。");
                await api("/resource?id=paper-map", "PUT", { revision: loaded.revision, document: value, label: "论文四层图谱与归属" });
                unsaved = () => false;
                location.reload();
            } catch (error) { feedback.textContent = error.message; }
            finally { save.disabled = false; form.inert = false; }
        }, "save");
        actions.append(save, button("收起", () => {
            if (JSON.stringify(value) !== JSON.stringify(loaded.document) && !confirm("放弃未保存的图谱修改？")) return;
            unsaved = () => false;
            panel.replaceChildren(trigger);
        }, "chevron-up"));
        heading.append(actions);
        const columns = make("div", null, "local-paper-hierarchy");
        const column = (title, step) => {
            const section = make("section", null, "local-paper-column");
            section.dataset.level = step;
            const titleElement = make("h3", title);
            section.append(titleElement);
            columns.append(section);
            return section;
        };
        const rootColumn = column(value.graph.title, "root");
        const topicColumn = column("专题", "topic");
        const directionColumn = column("具体方向", "direction");
        const paperColumn = column("论文", "paper");
        const textField = (parent, title, text, update, multiline = false) => {
            const label = make("label", title);
            const input = make(multiline ? "textarea" : "input");
            input.value = text || "";
            input.setAttribute("aria-label", title);
            input.addEventListener("input", () => update(input.value));
            label.append(input); parent.append(label);
            return input;
        };
        const selectField = (parent, title, choices, initial, update) => {
            const label = make("label", title);
            const select = make("select");
            select.setAttribute("aria-label", title);
            select.add(new Option("请选择", ""));
            for (const [id, title] of choices) select.add(new Option(title, id));
            select.value = initial || "";
            select.addEventListener("change", () => update(select.value));
            label.append(select); parent.append(label);
            return select;
        };
        const row = (parent, label, remove) => {
            const element = make("div", null, "local-paper-link-row");
            const unlink = button(`删除连线：${label}`, remove, "unlink");
            unlink.title = `删除连线：${label}`;
            unlink.setAttribute("aria-label", unlink.title);
            element.append(make("span", label), unlink); parent.append(element);
        };
        const addNamed = (parent, label, action) => {
            const group = make("div", null, "local-paper-add");
            const input = make("input");
            input.placeholder = label;
            input.setAttribute("aria-label", label);
            group.append(input, button("新增", () => {
                const name = input.value.trim();
                if (!name) { input.focus(); return; }
                action(name); rerender();
            }, "plus"));
            parent.append(group);
        };
        const uniqueId = (prefix, ids) => {
            let number = 1;
            while (ids.has(`${prefix}-${number}`)) number++;
            return `${prefix}-${number}`;
        };
        const removeRelations = (ids) => {
            value.relations = value.relations.filter((edge) => !ids.has(edge.source) && !ids.has(edge.target));
        };
        const connectRoot = () => {
            if (currentTopic && !value.rootTopics.includes(currentTopic.topic)) value.rootTopics.push(currentTopic.topic);
        };
        textField(rootColumn, "主线名称", value.graph.title, (text) => {
            value.graph.title = text; rootColumn.querySelector("h3").textContent = text;
        });
        textField(rootColumn, "主线简介", value.graph.description, (text) => { value.graph.description = text; }, true);
        const detached = topics.filter((topic) => !value.rootTopics.includes(topic.topic));
        const rootSelect = selectField(rootColumn, "连接专题", detached.map((topic) => [topic.topic, topic.title]), "", () => {});
        rootColumn.append(button("增加连线", () => {
            if (!rootSelect.value) return;
            value.rootTopics.push(rootSelect.value); selected.topic = rootSelect.value; rerender();
        }, "git-branch-plus"));
        const rootLinks = make("div", null, "local-paper-link-list");
        for (const topicId of value.rootTopics) {
            const topic = topics.find((topic) => topic.topic === topicId);
            if (topic) row(rootLinks, topic.title, () => {
                value.rootTopics = value.rootTopics.filter((id) => id !== topicId); rerender();
            });
        }
        rootColumn.append(rootLinks);
        selectField(topicColumn, "选择专题", topics.map((topic) => [topic.topic, topic.title]), selected.topic, (id) => {
            selected.topic = id; selected.direction = ""; rerender();
        });
        if (currentTopic) {
            textField(topicColumn, "专题名称", currentTopic.title, (text) => { currentTopic.title = text; currentTopic.shortTitle = text; });
            textField(topicColumn, "专题简介", currentTopic.description, (text) => { currentTopic.description = text; }, true);
            topicColumn.append(button("删除专题", () => {
                if (!confirm(`删除专题“${currentTopic.title}”及其方向连线？Markdown 笔记不会被删除。`)) return;
                const ids = new Set([`topic:${currentTopic.topic}`, ...directions.map((direction) => `direction:${direction.id}`)]);
                value.layers = (value.layers || []).filter((topic) => topic.topic !== currentTopic.topic);
                value.relatedTopics = (value.relatedTopics || []).filter((topic) => topic.topic !== currentTopic.topic);
                value.rootTopics = value.rootTopics.filter((id) => id !== currentTopic.topic);
                value.directions = value.directions.filter((direction) => direction.topic !== currentTopic.topic);
                removeRelations(ids); selected.topic = paperTopics(value)[0]?.topic || ""; rerender();
            }, "trash-2"));
        }
        addNamed(topicColumn, "新增专题名称", (name) => {
            const id = uniqueId("topic", new Set(topics.map((topic) => topic.topic)));
            value.layers.push({ topic: id, title: name, shortTitle: name, description: "", color: "#538f9d" });
            value.rootTopics.push(id); selected.topic = id; selected.direction = "";
        });
        selectField(directionColumn, "选择具体方向", directions.map((direction) => [direction.id, direction.title]), selected.direction, (id) => {
            selected.direction = id; rerender();
        });
        if (currentDirection) {
            textField(directionColumn, "方向名称", currentDirection.title, (text) => { currentDirection.title = text; });
            textField(directionColumn, "方向简介", currentDirection.description, (text) => { currentDirection.description = text; }, true);
            directionColumn.append(button("删除方向", () => {
                if (!confirm(`删除“${currentDirection.title}”及其论文连线？Markdown 笔记不会被删除。`)) return;
                value.directions = value.directions.filter((direction) => direction.id !== currentDirection.id);
                removeRelations(new Set([`direction:${currentDirection.id}`])); rerender();
            }, "trash-2"));
        }
        if (currentTopic) addNamed(directionColumn, "新增具体方向名称", (name) => {
            const id = uniqueId("direction", new Set(value.directions.map((direction) => direction.id)));
            value.directions.push({ id, topic: currentTopic.topic, title: name, description: "", papers: [] });
            connectRoot(); selected.direction = id;
        });
        const directionLinks = make("div", null, "local-paper-link-list");
        for (const direction of directions) row(directionLinks, direction.title, () => {
            if (!confirm(`移除方向“${direction.title}”及其论文连线？`)) return;
            value.directions = value.directions.filter((item) => item.id !== direction.id);
            removeRelations(new Set([`direction:${direction.id}`])); rerender();
        });
        directionColumn.append(directionLinks);
        const choices = notes.filter((note) => !currentDirection?.papers.includes(note.noteId));
        const paperSelect = selectField(paperColumn, "选择论文", choices.map((note) => [note.noteId, note.shortTitle || note.label]), "", () => {});
        const addPaper = button("增加论文连线", () => {
            if (!currentDirection || !paperSelect.value) return;
            if (!currentDirection.papers.includes(paperSelect.value)) currentDirection.papers.push(paperSelect.value);
            connectRoot(); rerender();
        }, "git-branch-plus");
        addPaper.disabled = !currentDirection || !choices.length;
        paperSelect.disabled = !currentDirection;
        paperColumn.append(addPaper);
        const paperLinks = make("div", null, "local-paper-link-list");
        for (const id of currentDirection?.papers || []) {
            const note = notes.find((note) => note.noteId === id);
            row(paperLinks, note?.shortTitle || note?.label || id, () => {
                currentDirection.papers = currentDirection.papers.filter((paper) => paper !== id); rerender();
            });
        }
        paperColumn.append(paperLinks);
        form.append(heading, columns, feedback);
        panel.replaceChildren(form);
        window.lucide?.createIcons();
    }
}
