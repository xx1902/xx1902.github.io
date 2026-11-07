import { Marked } from "./vendor/marked.esm.js";
import { omitDraftSections } from "./draft-sections.mjs";

const annotation = `paper-${globalThis.crypto.randomUUID()}`;
const parser = new Marked({
    extensions: [{
        name: "paperHighlight",
        level: "inline",
        start: (source) => source.indexOf("=="),
        tokenizer(source) {
            if (this.lexer.state.inRawBlock || this.lexer.state.inLink) return;
            const escaped = /^\\==((?:\\.|[^\\\n])+?)==(?!=)/.exec(source);
            if (escaped) return { type: "text", raw: escaped[0], text: escaped[0].slice(1) };
            const match = /^==((?:\\.|[^\\\n])+?)==(?!=)/.exec(source);
            if (!match || !match[1].trim() || /^\s|\s$/.test(match[1]) || match[1].startsWith("=")) return;
            return {
                type: "paperHighlight",
                raw: match[0],
                tokens: this.lexer.inlineTokens(match[1]),
            };
        },
        renderer(token) {
            // Retain the delimiters here so source and sanitized text can be compared exactly.
            return `<mark data-paper-highlight="${annotation}">==${this.parser.parseInline(token.tokens)}==</mark>`;
        },
    }],
});

export function readingSections(markdown) {
    const tokens = new Marked().lexer(markdown);
    let offset = 0;
    let summaryStart = null;
    let deepStart = null;
    let deepContentStart = null;
    for (const token of tokens) {
        offset = markdown.indexOf(token.raw, offset);
        if (token.type === "heading" && token.depth === 1) {
            if (token.text.trim() === "\u5c0f\u7ed3" && summaryStart === null && deepStart === null) summaryStart = offset;
            if (token.text.trim() === "\u7cbe\u8bfb" && deepStart === null) {
                deepStart = offset;
                deepContentStart = offset + token.raw.length;
            }
        }
        offset += token.raw.length;
    }
    return {
        summary: markdown.slice(summaryStart ?? 0, deepStart ?? markdown.length).trim(),
        deep: deepContentStart === null ? "" : markdown.slice(deepContentStart).trim(),
    };
}

function textRange(root, start, end) {
    const document = root.ownerDocument;
    const walker = document.createTreeWalker(root, 4);
    const range = document.createRange();
    let offset = 0;
    let started = false;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const next = offset + node.length;
        if (!started && start < next) {
            range.setStart(node, start - offset);
            started = true;
        }
        if (started && end <= next) {
            range.setEnd(node, end - offset);
            return range;
        }
        offset = next;
    }
    return null;
}

export function highlightMarkdown(content, markdown) {
    if (!markdown.includes("==")) return;
    const document = content.ownerDocument;
    const template = document.createElement("template");
    template.innerHTML = parser.parse(markdown, { async: false });
    omitDraftSections(template.content);

    // This template stays inert. Only ranges from the site's already sanitized DOM are moved.
    // If sanitization removed text, keep the original rendering rather than guess at offsets.
    if (template.content.textContent !== content.textContent) return;
    const ranges = new Map();
    const walker = document.createTreeWalker(template.content, 4);
    let offset = 0;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const mark = node.parentElement?.closest(`mark[data-paper-highlight="${annotation}"]`);
        if (mark && !mark.closest("pre, code, kbd, samp, script, style, textarea, a")) {
            const existing = ranges.get(mark);
            if (existing) existing.end = offset + node.length;
            else ranges.set(mark, { start: offset, end: offset + node.length });
        }
        offset += node.length;
    }

    for (const { start, end } of [...ranges.values()].sort((a, b) => b.start - a.start)) {
        const range = textRange(content, start, end);
        if (!range) continue;
        const text = range.toString();
        if (!text.startsWith("==") || !text.endsWith("==")) continue;
        const fragment = range.extractContents();
        textRange(fragment, end - start - 2, end - start).deleteContents();
        textRange(fragment, 0, 2).deleteContents();
        const mark = document.createElement("mark");
        mark.append(fragment);
        range.insertNode(mark);
    }
}
