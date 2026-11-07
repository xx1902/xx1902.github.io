export function bindTransientScrollbar(element, { delay = 900 } = {}) {
    let timer;
    const scrolling = () => {
        clearTimeout(timer);
        element.classList.add("is-scrolling");
        timer = setTimeout(() => element.classList.remove("is-scrolling"), delay);
    };
    element.addEventListener("scroll", scrolling, { capture: true, passive: true });
    return () => {
        element.removeEventListener("scroll", scrolling, { capture: true });
        clearTimeout(timer);
        element.classList.remove("is-scrolling");
    };
}

export function mountReaderChrome(detail) {
    let currentOutline;
    let disposeOutline = () => {};
    let disposed = false;

    function iconControl(control, name, label) {
        if (!control) return;
        control.setAttribute("aria-label", label);
        if (!control.title) control.title = label;
        if (control.querySelector(".paper-reader-icon")?.dataset.readerIcon === name
            && control.querySelector(".paper-reader-label")?.textContent === label) return;
        const icon = document.createElement("i");
        icon.className = "paper-reader-icon";
        icon.dataset.lucide = name;
        icon.dataset.readerIcon = name;
        icon.setAttribute("aria-hidden", "true");
        const text = document.createElement("span");
        text.className = "paper-reader-label";
        text.textContent = label;
        control.replaceChildren(icon, text);
    }

    function bindOutline(outline) {
        const stopScrollbar = bindTransientScrollbar(outline);
        const desktop = window.matchMedia("(min-width: 1001px)");
        let frame;
        const update = () => {
            frame = null;
            if (!document.body.classList.contains("reader-mode")) return;
            const sections = [...outline.querySelectorAll("a")].map((link) => {
                const id = new URLSearchParams(new URL(link.href).hash.slice(1)).get("heading");
                return { link, heading: document.getElementById(id) };
            }).filter(({ heading }) => heading);
            const top = (detail.querySelector(".reader-toolbar")?.getBoundingClientRect().bottom || 56) + 32;
            const scrollPadding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
            let active = sections[0];
            for (const section of sections) {
                const scrollMargin = parseFloat(getComputedStyle(section.heading).scrollMarginTop) || 0;
                if (section.heading.getBoundingClientRect().top <= Math.max(top, scrollPadding + scrollMargin + 2)) {
                    active = section;
                }
            }
            for (const { link } of sections) {
                if (link === active?.link) link.setAttribute("aria-current", "location");
                else link.removeAttribute("aria-current");
            }
        };
        const schedule = () => { frame ??= requestAnimationFrame(update); };
        const toggle = () => {
            const summary = outline.querySelector("summary");
            summary.title = outline.open ? "收起目录" : "展开目录";
            iconControl(summary, desktop.matches ? outline.open ? "panel-left-close" : "panel-left-open"
                : outline.open ? "chevron-up" : "chevron-down", "章节目录");
            window.lucide?.createIcons();
            schedule();
        };
        const breakpoint = () => {
            outline.open = desktop.matches;
            toggle();
        };
        outline.addEventListener("toggle", toggle);
        window.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("resize", schedule, { passive: true });
        desktop.addEventListener("change", breakpoint);
        breakpoint();
        return () => {
            stopScrollbar();
            cancelAnimationFrame(frame);
            outline.removeEventListener("toggle", toggle);
            window.removeEventListener("scroll", schedule);
            window.removeEventListener("resize", schedule);
            desktop.removeEventListener("change", breakpoint);
        };
    }

    function enhance() {
        if (disposed) return;
        const toolbar = detail.querySelector(".reader-toolbar");
        if (toolbar) {
            toolbar.setAttribute("role", "group");
            toolbar.setAttribute("aria-label", "阅读操作");
        }
        const reading = document.body.classList.contains("reader-mode");
        const back = detail.querySelector("[data-reader-toggle]");
        if (back && !back.disabled) {
            back.title = reading ? "返回文献索引" : "查看详细正文与章节目录";
        }
        iconControl(back, reading ? "arrow-left" : "book-open", reading ? "返回索引" : "详细阅读");
        iconControl(detail.querySelector("[data-copy-note]"), "link", "复制链接");
        iconControl(detail.querySelector("[data-copy-local-note]"), "folder-open", "复制笔记地址");
        iconControl(detail.querySelector(".local-note-edit button"), "square-pen", "编辑笔记");
        iconControl(detail.querySelector(".paper-create-note"), "file-plus-2", "新建笔记");
        const outline = detail.querySelector(".reader-outline");
        if (outline !== currentOutline) {
            disposeOutline();
            currentOutline = outline;
            disposeOutline = outline ? bindOutline(outline) : () => {};
        }
        if (detail.querySelector("i.paper-reader-icon")) window.lucide?.createIcons();
    }

    const observer = new MutationObserver(enhance);
    observer.observe(detail, { childList: true, subtree: true });
    const modeObserver = new MutationObserver(enhance);
    modeObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("load", enhance, { once: true });
    enhance();
    return () => {
        disposed = true;
        observer.disconnect();
        modeObserver.disconnect();
        disposeOutline();
        window.removeEventListener("load", enhance);
    };
}
