(() => {
    if (document.body.dataset.section !== "paper") return;

    const list = document.querySelector("#note-list");
    const detail = document.querySelector("#note-detail");
    const heading = document.querySelector(".paper-library-heading");
    const dialog = document.querySelector("#paper-venue-dialog");
    const records = new Map();
    const topics = new Map();
    const directions = new Map();
    let createButton = null;
    let selectedPaperId = null;

    function make(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function icon(name) {
        const node = make("i");
        node.dataset.lucide = name;
        node.setAttribute("aria-hidden", "true");
        return node;
    }

    async function loadJson(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
        return response.json();
    }

    function placeCreateButton() {
        createButton ||= heading.querySelector(":scope > div > .local-edit-button");
        if (!createButton) return;
        createButton.classList.add("paper-create-note");
        const toolbar = detail.querySelector(".reader-toolbar");
        if (toolbar) {
            if (createButton.parentElement !== toolbar) toolbar.append(createButton);
            detail.querySelector(".paper-empty-actions")?.remove();
        } else {
            let actions = detail.querySelector(".paper-empty-actions");
            if (!actions) {
                actions = make("div", "paper-empty-actions");
                detail.prepend(actions);
            }
            if (createButton.parentElement !== actions) actions.append(createButton);
        }
    }

    // Keep the editor's original button and callback across reader re-renders.
    const editorObserver = new MutationObserver(() => {
        placeCreateButton();
        if (createButton) editorObserver.disconnect();
    });
    editorObserver.observe(heading, { childList: true, subtree: true });
    new MutationObserver(() => {
        placeCreateButton();
        enhanceDetail();
    }).observe(detail, { childList: true, subtree: true });
    window.addEventListener("noteselected", placeCreateButton);
    placeCreateButton();

    function enhanceCards() {
        for (const card of list.querySelectorAll(".note-card:not([data-paper-card])")) {
            const paper = records.get(card.dataset.id);
            if (!paper) continue;
            const title = card.querySelector("h3");
            const summary = card.querySelector(":scope > p");
            const tags = card.querySelector(".tag-row");
            const header = make("div", "paper-card-heading");
            title.title = paper.title;
            header.append(title);

            const source = make("span", "paper-card-source");
            if (paper.venue) source.append(make("span", "paper-card-venue", paper.venue));
            if (paper.year) {
                const year = make("time", "", paper.year);
                year.dateTime = paper.year;
                source.append(year);
            }
            if (source.childElementCount) header.append(source);

            const memberships = make("span", "paper-card-topics");
            for (const id of [...new Set(paper.topics || [])]) {
                const topic = topics.get(id);
                const chip = make("span", "paper-topic-chip", topic?.shortTitle || topic?.title || id);
                chip.dataset.topic = id;
                chip.title = topic?.title || id;
                if (/^#[\da-f]{6}$/i.test(topic?.color || "")) {
                    chip.style.setProperty("--topic-color", topic.color);
                }
                memberships.append(chip);
            }
            memberships.title = `${memberships.childElementCount} 个专题`;
            if (memberships.childElementCount) header.append(memberships);

            const metadata = make("div", "paper-card-metadata");
            const directionList = make("div", "paper-card-directions");
            const titles = paper.directionTitles?.length ? paper.directionTitles
                : (paper.directions || []).map((id) => directions.get(id)?.title).filter(Boolean);
            for (const text of [...new Set(titles.length ? titles : [paper.category || "未分类"])]) {
                directionList.append(make("span", "", text));
            }
            const progress = make("div", "paper-card-progress");
            const status = ["精读", "已精读"].includes(paper.status) ? "精读"
                : ["已阅读", "已读"].includes(paper.status) ? "已阅读" : "待阅读";
            const reading = make("span", "paper-card-status", status);
            reading.dataset.status = status;
            progress.append(reading);
            if (paper.priority) {
                const priority = make("span", "paper-card-priority", paper.priority);
                priority.title = `优先级 ${paper.priority}`;
                progress.append(priority);
            }
            if (paper.example) progress.append(make("span", "example-label", "示例"));
            metadata.append(directionList, progress);
            summary.classList.add("paper-card-summary");
            card.replaceChildren(header, metadata, summary);
            if (tags) {
                tags.classList.add("paper-card-tags");
                card.append(tags);
            }
            card.classList.add("paper-card");
            card.dataset.paperCard = "true";
        }
    }

    function enhanceDetail() {
        const paper = records.get(selectedPaperId);
        const title = detail.querySelector(":scope > h3");
        const meta = detail.querySelector(":scope > .detail-meta");
        if (!paper || !title || !meta) return;
        if (detail.dataset.paperDetailId === paper.id && detail.querySelector(".paper-detail-source")) return;

        detail.classList.add("paper-note-detail");
        detail.dataset.paperDetailId = paper.id;
        const kicker = detail.querySelector(":scope > .detail-kicker");
        if (kicker) kicker.classList.add("paper-detail-kicker");

        const source = make("span", "paper-card-source paper-detail-source");
        if (paper.venue) source.append(make("span", "paper-card-venue", paper.venue));
        if (paper.year) {
            const year = make("time", "", paper.year);
            year.dateTime = paper.year;
            source.append(year);
        }
        const memberships = make("span", "paper-card-topics");
        for (const id of [...new Set(paper.topics || [])]) {
            const topic = topics.get(id);
            const chip = make("span", "paper-topic-chip", topic?.shortTitle || topic?.title || id);
            chip.title = topic?.title || id;
            if (/^#[\da-f]{6}$/i.test(topic?.color || "")) {
                chip.style.setProperty("--topic-color", topic.color);
            }
            memberships.append(chip);
        }
        if (memberships.childElementCount) {
            memberships.title = `${memberships.childElementCount} 个专题`;
            source.append(memberships);
        }
        source.title = [paper.venue, paper.year].filter(Boolean).join(" ");

        const titleText = make("span", "paper-detail-title-text", title.textContent.trim());
        const metadata = make("div", "detail-meta paper-card-metadata paper-detail-metadata");
        const directionList = make("div", "paper-card-directions");
        const titles = paper.directionTitles?.length ? paper.directionTitles
            : (paper.directions || []).map((id) => directions.get(id)?.title).filter(Boolean);
        for (const text of [...new Set(titles.length ? titles : [paper.category || "未分类"])]) {
            directionList.append(make("span", "", text));
        }
        const progress = make("div", "paper-card-progress");
        const status = ["精读", "已精读"].includes(paper.status) ? "精读"
            : ["已阅读", "已读"].includes(paper.status) ? "已阅读" : "待阅读";
        const reading = make("span", "paper-card-status", status);
        reading.dataset.status = status;
        progress.append(reading);
        if (paper.priority) {
            const priority = make("span", "paper-card-priority", paper.priority);
            priority.title = `优先级 ${paper.priority}`;
            progress.append(priority);
        }
        if (paper.example) progress.append(make("span", "example-label", "示例"));
        metadata.append(directionList, progress);

        const authors = detail.querySelector(":scope > .detail-authors");
        const tags = detail.querySelector(":scope > .tag-row");
        if (tags) tags.classList.add("paper-card-tags", "paper-detail-tags");
        title.replaceChildren(titleText, source);
        title.after(metadata);
        if (authors) metadata.after(authors);
        if (tags) (authors || metadata).after(tags);
        meta.remove();
    }

    window.addEventListener("noteselected", (event) => {
        selectedPaperId = event.detail.id;
        enhanceDetail();
    });
    new MutationObserver(enhanceCards).observe(list, { childList: true });
    Promise.all([loadJson(document.body.dataset.index), loadJson("/paper/data/map.json")])
        .then(([papers, map]) => {
            for (const paper of papers) records.set(paper.id, paper);
            for (const topic of [...(map.layers || []), ...(map.relatedTopics || [])]) topics.set(topic.topic, topic);
            for (const direction of map.directions || []) directions.set(direction.id, direction);
            enhanceCards();
            enhanceDetail();
        }).catch((error) => console.error("Unable to enhance paper cards:", error));

    function externalLink(url, className) {
        try {
            const parsed = new URL(url);
            if (!["https:", "http:"].includes(parsed.protocol)) return null;
            const link = make("a", className);
            link.href = parsed.href;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            return link;
        } catch {
            return null;
        }
    }

    function showVenue(venue) {
        document.querySelector("#paper-venue-title").textContent = venue.name;
        const content = document.querySelector("#paper-venue-content");
        content.replaceChildren();
        const archive = externalLink(venue.archiveUrl, "paper-venue-archive");
        if (archive) {
            const label = make("span", "paper-venue-link-label");
            label.append(make("strong", "", "全部年份论文集"), make("small", "", venue.archiveLabel || "历届会议与出版记录"));
            archive.append(icon("library"), label, icon("arrow-up-right"));
            content.append(archive);
        }
        content.append(make("p", "paper-venue-years-label", "按年份浏览"));
        const years = make("div", "paper-venue-years");
        for (const [year, url] of Object.entries(venue.years || {}).sort(([a], [b]) => Number(b) - Number(a))) {
            const link = externalLink(url, "paper-venue-year");
            if (!link) continue;
            const time = make("time", "", year);
            time.dateTime = year;
            link.append(time, make("span", "", `${venue.name} 论文列表`), icon("arrow-up-right"));
            years.append(link);
        }
        content.append(years);
        window.lucide?.createIcons();
        dialog.showModal();
    }

    dialog.addEventListener("click", (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right
            || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    loadJson("/paper/data/venues.json").then((venues) => {
        for (const link of document.querySelectorAll(".venue-resources [data-venue-resource]")) {
            const venue = venues.find((entry) => entry.name === link.dataset.venueResource);
            if (!venue) continue;
            const trigger = make("button", "paper-venue-trigger", venue.name);
            trigger.type = "button";
            trigger.dataset.venueResource = venue.name;
            trigger.setAttribute("aria-haspopup", "dialog");
            trigger.setAttribute("aria-controls", dialog.id);
            trigger.title = `查看 ${venue.name} 历年论文`;
            trigger.classList.toggle("venue-selected", link.classList.contains("venue-selected"));
            trigger.addEventListener("click", () => showVenue(venue));
            link.replaceWith(trigger);
        }
    }).catch((error) => console.error("Unable to load venue dialog:", error));
})();
