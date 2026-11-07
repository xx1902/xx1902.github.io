function markdownCodeRanges(markdown) {
    const ranges = [];
    let fence = null;
    let offset = 0;

    for (const line of markdown.match(/[^\n]*(?:\n|$)/g) || []) {
        if (!line) continue;
        const text = line.replace(/\n$/, "");
        const marker = /^ {0,3}(`{3,}|~{3,})/.exec(text)?.[1];
        if (fence) {
            if (marker?.[0] === fence.character && marker.length >= fence.length && /^[ \t]*$/.test(text.slice(text.indexOf(marker) + marker.length))) {
                ranges.push([fence.start, offset + line.length]);
                fence = null;
            }
        } else if (marker) {
            fence = { character: marker[0], length: marker.length, start: offset };
        } else if (/^(?: {4}|\t)/.test(text)) {
            ranges.push([offset, offset + line.length]);
        }
        offset += line.length;
    }
    if (fence) ranges.push([fence.start, markdown.length]);

    const contains = (position) => ranges.some(([start, end]) => position >= start && position < end);
    const pendingTicks = new Map();
    for (const match of markdown.matchAll(/`+/g)) {
        const start = match.index;
        if (contains(start)) continue;
        const width = match[0].length;
        const pending = pendingTicks.get(width);
        if (pending) {
            ranges.push([pending.start, start + width]);
            pendingTicks.delete(width);
        } else {
            pendingTicks.set(width, { start });
        }
    }

    return ranges;
}

function withoutDraftSections(markdown) {
    const lines = markdown.match(/[^\n]*(?:\n|$)/g) || [];
    let draftDepth = null;
    let fence = null;
    const visible = [];

    for (const line of lines) {
        if (!line) continue;
        const text = line.replace(/\n$/, "");
        const marker = /^ {0,3}(`{3,}|~{3,})/.exec(text)?.[1];
        if (fence) {
            if (marker?.[0] === fence.character && marker.length >= fence.length && /^[ \t]*$/.test(text.slice(text.indexOf(marker) + marker.length))) {
                fence = null;
            }
            if (draftDepth === null) visible.push(line);
            continue;
        }
        if (marker) {
            fence = { character: marker[0], length: marker.length };
            if (draftDepth === null) visible.push(line);
            continue;
        }

        const heading = /^( {0,3})(#{1,6})[ \t]+(.+?)\s*$/.exec(text);
        if (heading) {
            const depth = heading[2].length;
            const title = heading[3].replace(/[ \t]+#+[ \t]*$/, "").trim();
            if (draftDepth !== null && depth <= draftDepth) draftDepth = null;
            if (draftDepth === null && title === "\u8349\u7a3f") draftDepth = depth;
        }
        if (draftDepth === null) visible.push(line);
    }
    return visible.join("").replace(/<!--[\s\S]*?-->/g, "");
}

export function findDisplayMath(markdown) {
    const source = withoutDraftSections(markdown.replace(/\r\n?/g, "\n"));
    const codeRanges = markdownCodeRanges(source);
    const isCode = (position) => codeRanges.some(([start, end]) => position >= start && position < end);
    const delimiters = [...source.matchAll(/\$\$/g)].map((match) => match.index);
    const pairs = [];
    let opening = null;

    delimiters.forEach((position, index) => {
        if (isCode(position)) return;
        if (opening === null) {
            opening = { position, index };
            return;
        }
        pairs.push({
            openIndex: opening.index,
            closeIndex: index,
            openPosition: opening.position,
            closePosition: position,
            standalone: /^[ \t]*$/.test(source.slice(source.lastIndexOf("\n", opening.position - 1) + 1, opening.position))
                && /^[ \t]*(?:\n|$)/.test(source.slice(position + 2, source.indexOf("\n", position) === -1 ? source.length : source.indexOf("\n", position))),
            source: source.slice(opening.position + 2, position),
        });
        opening = null;
    });

    return { source, delimiters, pairs };
}

function topLevelNode(root, node) {
    let current = node;
    while (current?.parentNode && current.parentNode !== root) current = current.parentNode;
    return current?.parentNode === root ? current : null;
}

function delimiterNodes(root) {
    const document = root.ownerDocument;
    const walker = document.createTreeWalker(root, document.defaultView.NodeFilter.SHOW_TEXT);
    const markers = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        for (const match of node.nodeValue.matchAll(/\$\$/g)) {
            markers.push({ node, offset: match.index });
        }
    }
    return markers;
}

export function restoreDisplayMath(root, markdown) {
    const { source, delimiters, pairs } = findDisplayMath(markdown);
    const markers = delimiterNodes(root);
    if (delimiters.length !== markers.length) return 0;

    let restored = 0;
    for (const pair of [...pairs].reverse()) {
        const opening = markers[pair.openIndex];
        const closing = markers[pair.closeIndex];
        if (!opening || !closing
            || opening.node.parentElement?.closest("pre, code, kbd, samp, script, style, textarea")
            || closing.node.parentElement?.closest("pre, code, kbd, samp, script, style, textarea")) continue;

        const first = topLevelNode(root, opening.node);
        const last = topLevelNode(root, closing.node);
        if (!first || !last) continue;

        const range = root.ownerDocument.createRange();
        range.setStart(opening.node, opening.offset);
        range.setEnd(closing.node, closing.offset + 2);
        range.extractContents();

        const formula = root.ownerDocument.createElement("span");
        formula.className = "paper-math-source";
        formula.textContent = `$$${pair.source}$$`;
        range.insertNode(formula);
        if (pair.standalone && /^H[1-6]$/.test(first.nodeName) && first.parentNode === root) {
            root.insertBefore(formula, first);
        }
        restored += 1;

        let current = first;
        while (current) {
            const next = current.nextSibling;
            if (current.nodeType === 1 && !current.textContent.trim()
                && !current.querySelector("img, table, hr, pre, svg, math")
                && !/^(?:TABLE|UL|OL|LI|BLOCKQUOTE)$/.test(current.nodeName)) current.remove();
            if (current === last) break;
            current = next;
        }
    }
    return restored;
}
