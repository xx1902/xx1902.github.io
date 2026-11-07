const homePanels = [...document.querySelectorAll(".home-view")];
const homeLinks = [...document.querySelectorAll(".home-section-nav a")];
const researchPanels = [...document.querySelectorAll("[data-research-panel]")];
const researchLinks = [...document.querySelectorAll("[data-research-view]")];
const homeAliases = { phases: "research-directions", "research-roadmap": "research-directions", reports: "research-papers", "research-reports": "research-papers", progress: "research-progress", news: "research-progress", overview: "research", skills: "projects", tools: "projects" };
let activeHomeView = null;
let activeResearchView = null;

function updateHomeView() {
    const hash = location.hash.slice(1);
    const key = homeAliases[hash] || hash;
    const query = new URLSearchParams(location.search);
    const hasFilters = ["q", "topic", "stage", "category", "status", "tag", "priority"]
        .some((name) => query.has(name));
    const reportRequested = key.startsWith("note=") || key === "research-papers" || (!key && hasFilters);
    const researchRequested = reportRequested || key.startsWith("research");
    const selected = researchRequested ? "research" : homePanels.some((panel) => panel.dataset.homeView === key) ? key : "about";

    for (const panel of homePanels) panel.hidden = panel.dataset.homeView !== selected;
    for (const link of homeLinks) {
        const active = link.dataset.homeView === selected;
        link.classList.toggle("active", active);
        if (active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
    }

    const research = reportRequested ? "papers" : key === "research-progress" ? "progress" : "directions";
    for (const panel of researchPanels) panel.hidden = panel.dataset.researchPanel !== research;
    for (const link of researchLinks) {
        const active = link.dataset.researchView === research;
        link.classList.toggle("active", active);
        if (active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
    }
    if (selected !== activeHomeView || research !== activeResearchView) {
        window.scrollTo({ top: 0, behavior: "instant" });
        activeHomeView = selected;
        activeResearchView = research;
    }
}

document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-home-view], a[data-research-view], .skip-link");
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, "", `${location.pathname}${location.search}${link.hash}`);
    updateHomeView();
    if (link.classList.contains("skip-link")) {
        const content = document.querySelector(".profile-content");
        content.tabIndex = -1;
        content.focus({ preventScroll: true });
    }
    window.dispatchEvent(new PopStateEvent("popstate"));
});

for (const event of ["hashchange", "popstate", "libraryready", "libraryrestored", "noteselected"]) {
    window.addEventListener(event, updateHomeView);
}
window.addEventListener("languagechange", updateHomeView);
// Initial fragment navigation happens after deferred scripts; views should open at the top.
window.addEventListener("load", () => requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" })));
updateHomeView();
