export const paperTopics = (config) => [...(config.layers || []), ...(config.relatedTopics || [])];

// The presence of directions opts into explicit membership; older maps keep MD topics.
export function indexPaperTaxonomy(config, records) {
    if (!Array.isArray(config.directions)) return records;
    return records.map((record) => {
        const directions = config.directions.filter((direction) => (direction.papers || []).includes(record.id));
        const assigned = new Set(directions.map((direction) => direction.topic));
        return {
            ...record,
            topics: [...new Set([...(record.topics || []).filter((topic) => assigned.has(topic)), ...assigned])],
            directions: directions.map((direction) => direction.id),
            directionTitles: directions.map((direction) => direction.title),
        };
    });
}

export function validatePaperTaxonomy(config, paperIds = null) {
    const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!config || !Array.isArray(config.layers) || !Array.isArray(config.relatedTopics || [])) throw new Error("论文专题列表格式错误。");
    if (config.graph && (typeof config.graph.title !== "string" || !config.graph.title.trim()
        || typeof config.graph.description !== "string")) throw new Error("请填写主线名称和文字简介。");
    const topics = paperTopics(config);
    if (topics.some((topic) => !topic || typeof topic.topic !== "string" || !slug.test(topic.topic) || typeof topic.title !== "string" || !topic.title.trim())
        || new Set(topics.map((topic) => topic.topic)).size !== topics.length) throw new Error("专题编号重复或标题为空。");
    const topicIds = new Set(topics.map((topic) => topic.topic));
    if (config.rootTopics != null && (!Array.isArray(config.rootTopics)
        || config.rootTopics.some((id) => !topicIds.has(id)) || new Set(config.rootTopics).size !== config.rootTopics.length)) throw new Error("主线的专题连线无效或重复。");
    if (config.directions != null && !Array.isArray(config.directions)) throw new Error("具体方向必须是列表。");
    const ids = new Set();
    for (const direction of config.directions || []) {
        if (!direction || typeof direction.id !== "string" || !slug.test(direction.id) || ids.has(direction.id)
            || typeof direction.title !== "string" || !direction.title.trim()) throw new Error("具体方向编号重复或名称为空。");
        ids.add(direction.id);
        if (!topicIds.has(direction.topic)) throw new Error("具体方向必须属于已设置的专题。");
        if (!Array.isArray(direction.papers) || direction.papers.some((id) => typeof id !== "string" || !id.trim())
            || new Set(direction.papers).size !== direction.papers.length) throw new Error("方向中的论文列表无效或重复。");
        if (paperIds && direction.papers.some((id) => !paperIds.has(id))) throw new Error("方向中引用的论文不存在，请先移除相关连线。");
        if (direction.description != null && typeof direction.description !== "string") throw new Error("方向简介必须是文字。");
    }
    return config;
}
