(() => {
    if (document.body.dataset.section !== "paper") return;

    async function copyPath(path) {
        try {
            await navigator.clipboard.writeText(path);
            return;
        } catch {
            // Fall back when the Clipboard API is unavailable or access is denied.
        }

        const focused = document.activeElement;
        const input = document.createElement("textarea");
        input.value = path;
        input.readOnly = true;
        input.style.position = "fixed";
        input.style.left = "-9999px";
        document.body.append(input);
        try {
            input.select();
            if (!document.execCommand("copy")) throw new Error("Copy failed");
        } finally {
            input.remove();
            focused?.focus({ preventScroll: true });
        }
    }

    window.addEventListener("noteselected", (event) => {
        const detail = document.querySelector("#note-detail");
        const toolbar = detail?.querySelector(".reader-toolbar");
        const localPaper = toolbar?.querySelector("[data-local-pdf]");
        const actions = detail?.querySelector(".detail-actions");
        if (localPaper && actions) {
            localPaper.textContent = "本地论文 ↗";
            localPaper.href = event.detail.localPdfUrl;
            localPaper.removeAttribute("aria-disabled");
            localPaper.title = "在新标签页预览本站存档的论文 PDF";
            actions.prepend(localPaper);
        }

        const root = document.body.dataset.localNoteRoot;
        const relativePath = event.detail.localNote;
        const original = toolbar?.querySelector("[data-local-note]");
        if (!original) return;
        const localEditor = ["127.0.0.1", "localhost", "[::1]"].includes(location.hostname)
            && document.querySelector('script[src="/__edit/bootstrap.js"]');
        if (!localEditor) {
            original.remove();
            return;
        }
        if (!root || !relativePath) return;

        const path = `${root.replace(/[\\/]+$/, "")}\\${relativePath.replace(/^[\\/]+/, "")}`
            .replaceAll("/", "\\");
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.copyLocalNote = "true";
        button.textContent = "复制笔记地址";
        button.title = path;
        button.addEventListener("click", async () => {
            const status = toolbar.querySelector(".reader-feedback");
            status.textContent = "";
            button.disabled = true;
            try {
                await copyPath(path);
                status.textContent = "笔记地址已复制";
            } catch {
                status.textContent = "复制失败，请允许剪贴板访问后重试";
            } finally {
                button.disabled = false;
            }
        });
        original.replaceWith(button);
    });
})();
