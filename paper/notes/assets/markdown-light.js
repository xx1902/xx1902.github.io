import { highlightMarkdown, readingSections } from "./markdown-highlight.mjs";
import { omitDraftHtml, omitDraftSections } from "./draft-sections.mjs";
import { restoreDisplayMath } from "./display-math.mjs";
import { mountReaderChrome } from "./reader-chrome.mjs";
import renderMathInElement from "./katex/contrib/auto-render.mjs";

if (document.body.dataset.section === "paper") {
    const detail = document.querySelector("#note-detail");
    mountReaderChrome(detail);
    const rendered = new WeakMap();
    let selectedId = new URLSearchParams(location.hash.slice(1)).get("note");
    let records = new Map();

    function enhanceMarkdown() {
        const content = detail.querySelector(".detail-content");
        const paper = records.get(selectedId);
        if (!content || !paper || rendered.get(content) === content.innerHTML) return;
        omitDraftSections(content);
        const sections = readingSections(paper.body || "");
        const deepReading = content.dataset.readingMode === "deep";
        const markdown = deepReading ? sections.deep : sections.summary;
        highlightMarkdown(content, markdown);
        restoreDisplayMath(content, markdown);
        renderMathInElement(content, {
            delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "\\[", right: "\\]", display: true },
                { left: "\\(", right: "\\)", display: false },
                { left: "$", right: "$", display: false },
            ],
            throwOnError: false,
            strict: "ignore",
            trust: false,
        });
        const sectionTitle = content.firstElementChild;
        if (!deepReading && sectionTitle?.tagName === "H1" && sectionTitle.textContent.trim() === "\u5c0f\u7ed3") {
            sectionTitle.remove();
        }
        for (const link of detail.querySelectorAll(".reader-outline a")) {
            const id = new URLSearchParams(new URL(link.href).hash.slice(1)).get("heading");
            const heading = document.getElementById(id);
            if (heading) link.textContent = heading.textContent;
            else link.remove();
        }
        const outline = detail.querySelector(".reader-outline");
        if (outline && !outline.querySelector("a")) outline.remove();
        rendered.set(content, content.innerHTML);
    }

    // Filter the reader payload before the shared workspace builds either view or its outline.
    window.addEventListener("noteselected", (event) => {
        const reading = event.detail;
        for (const field of ["summaryHtml", "deepHtml", "html"]) {
            reading[field] = omitDraftHtml(reading[field] || "", document);
        }
        const deep = document.createElement("template");
        deep.innerHTML = reading.deepHtml;
        reading.deepReading &&= Boolean(deep.content.textContent.trim() || deep.content.querySelector("img, table, pre, hr"));
        if (!reading.deepReading) {
            const url = new URL(location.href);
            if (url.searchParams.get("view") === "reader") {
                url.searchParams.delete("view");
                history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
            }
        }
    }, { capture: true });

    const initializedOutlines = new WeakSet();
    function setOutlineDefault() {
        const outline = detail.querySelector(".reader-outline");
        if (!outline || initializedOutlines.has(outline)) return;
        initializedOutlines.add(outline);
        outline.open = window.matchMedia("(min-width: 1001px)").matches;
    }

    new MutationObserver(() => {
        setOutlineDefault();
        enhanceMarkdown();
    }).observe(detail, { childList: true, subtree: true, characterData: true });
    window.addEventListener("noteselected", (event) => {
        selectedId = event.detail.id;
        const button = detail.querySelector("[data-reader-toggle]");
        if (button) {
            button.disabled = !event.detail.deepReading;
            if (button.disabled) button.title = "\u6682\u65e0\u53ef\u7528\u7684\u7cbe\u8bfb\u6b63\u6587";
        }
        enhanceMarkdown();
    });
    fetch(document.body.dataset.index).then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        records = new Map((await response.json()).map((paper) => [paper.id, paper]));
        enhanceMarkdown();
    }).catch((error) => console.error("Unable to enhance paper Markdown:", error));

    await import("/assets/js/library.js");
}
