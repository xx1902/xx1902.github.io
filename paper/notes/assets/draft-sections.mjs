export function omitDraftSections(root) {
    let hiddenDepth = null;
    let changed = false;
    for (const node of [...root.childNodes]) {
        const depth = /^H[1-6]$/.test(node.nodeName) ? Number(node.nodeName[1]) : null;
        if (depth !== null && hiddenDepth !== null && depth <= hiddenDepth) hiddenDepth = null;
        if (depth !== null && node.textContent.trim() === "\u8349\u7a3f" && hiddenDepth === null) {
            hiddenDepth = depth;
        }
        if (hiddenDepth !== null) {
            node.remove();
            changed = true;
        }
    }
    return changed;
}

export function omitDraftHtml(html, document) {
    const template = document.createElement("template");
    template.innerHTML = html;
    return omitDraftSections(template.content) ? template.innerHTML : html;
}
