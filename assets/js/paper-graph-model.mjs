import { indexPaperTaxonomy } from "./paper-taxonomy.mjs";

export function paperGraphScope(graph, topic = "", direction = "") {
    if (!topic && direction) topic = graph.nodes.find((node) => node.kind === "direction" && node.direction === direction)?.topic || "";
    const selectedDirections = new Set(graph.nodes.filter((node) => node.kind === "direction"
        && (!topic || node.topic === topic) && (!direction || node.direction === direction)).map((node) => node.direction));
    return new Set(graph.nodes.filter((node) => !topic && !direction || node.kind === "root"
        || node.kind === "topic" && node.topic === topic
        || node.kind === "direction" && selectedDirections.has(node.direction)
        || node.kind === "paper" && (direction ? node.directions.some((id) => selectedDirections.has(id)) : node.topics.includes(topic)))
        .map((node) => node.id));
}

export function createPaperGraph(config, records) {
    records = indexPaperTaxonomy(config, records);
    const topics = [...(config.layers || []), ...(config.relatedTopics || [])];
    const topicIds = new Set(topics.map((topic) => topic.topic));
    const directions = (config.directions || []).filter((direction) => topicIds.has(direction.topic));
    const topicById = new Map(topics.map((topic) => [topic.topic, topic]));
    const topicPositions = new Map();
    const nodes = [{
        id: "root",
        kind: "root",
        label: config.graph?.title || "推理系统与模型服务",
        compactLabel: config.graph?.title || "推理系统与模型服务",
        detail: config.graph?.description || "推理系统与模型服务",
        href: "/paper/#notes",
        position: [0, 0, 35],
        color: "#344f58",
        topics: topics.map((topic) => topic.topic),
    }];
    const links = [];
    const rootTopics = new Set(config.rootTopics ?? topics.map((topic) => topic.topic));
    const topicCount = Math.max(topics.length, 1);

    topics.forEach((topic, index) => {
        const angle = Math.PI * 2 * index / topicCount - Math.PI * 0.9;
        const position = [Math.cos(angle) * 190, Math.sin(angle) * 145, Math.sin(angle * 2) * 55];
        topicPositions.set(topic.topic, position);
        nodes.push({
            id: `topic:${topic.topic}`,
            kind: "topic",
            topic: topic.topic,
            label: topic.title,
            compactLabel: topic.shortTitle || topic.title,
            detail: topic.description || "关联研究专题",
            href: `/paper/?topic=${encodeURIComponent(topic.topic)}#notes`,
            color: topic.color || "#258c7b",
            position,
        });
        if (rootTopics.has(topic.topic)) {
            links.push({
                source: "root",
                target: `topic:${topic.topic}`,
                label: "研究专题",
                type: "mainline-topic",
            });
        }
    });

    const directionsByTopic = new Map();
    const directionPositions = new Map();
    for (const direction of directions) {
        const siblings = directionsByTopic.get(direction.topic) || [];
        siblings.push(direction);
        directionsByTopic.set(direction.topic, siblings);
    }
    for (const [topicId, topicDirections] of directionsByTopic) {
        const parent = topicById.get(topicId);
        const anchor = topicPositions.get(topicId);
        const parentAngle = Math.atan2(anchor[1], anchor[0]);
        topicDirections.forEach((direction, index) => {
            const spread = (index - (topicDirections.length - 1) / 2) * 0.32;
            const angle = parentAngle + spread;
            const position = [
                anchor[0] + Math.cos(angle) * 115,
                anchor[1] + Math.sin(angle) * 100,
                anchor[2] + (index - (topicDirections.length - 1) / 2) * 24,
            ];
            directionPositions.set(direction.id, position);
            nodes.push({
                id: `direction:${direction.id}`,
                kind: "direction",
                direction: direction.id,
                topic: topicId,
                label: direction.title,
                compactLabel: direction.shortTitle || direction.title,
                detail: [parent?.title, direction.description].filter(Boolean).join(" · "),
                href: `/paper/?topic=${encodeURIComponent(topicId)}&category=${encodeURIComponent(direction.id)}#notes`,
                color: direction.color || parent?.color || "#8b7b9b",
                position,
                paperIds: [...new Set(direction.papers || [])],
            });
            links.push({
                source: `topic:${topicId}`,
                target: `direction:${direction.id}`,
                label: "具体方向",
                type: "topic-direction",
            });
        });
    }

    const publicRecords = records.filter((record) => !record.private);
    const recordById = new Map(publicRecords.map((record) => [record.id, record]));
    const assignedDirections = new Map();
    for (const direction of directions) {
        for (const paperId of new Set(direction.papers || [])) {
            if (!recordById.has(paperId)) continue;
            const assigned = assignedDirections.get(paperId) || [];
            assigned.push(direction);
            assignedDirections.set(paperId, assigned);
        }
    }
    const paperCounts = new Map();
    publicRecords.forEach((record, index) => {
        const matchingTopics = [...new Set(record.topics || [])].filter((topic) => topicIds.has(topic));
        const matchingDirections = assignedDirections.get(record.id) || [];
        const primaryDirection = matchingDirections[0];
        const primaryTopic = primaryDirection?.topic || matchingTopics[0];
        const topicAnchor = topicPositions.get(primaryTopic) || [0, 0, 0];
        const parentDirection = primaryDirection ? directionPositions.get(primaryDirection.id) : null;
        const anchor = parentDirection || topicAnchor;
        const key = primaryDirection?.id || primaryTopic || "unclassified";
        const slot = paperCounts.get(key) || 0;
        paperCounts.set(key, slot + 1);
        const angle = Math.atan2(anchor[1], anchor[0]) + (slot % 2 ? 0.45 : -0.45) + index * 0.04;
        const radius = primaryDirection ? 82 + Math.floor(slot / 4) * 34 : 135 + Math.floor(slot / 4) * 40;
        const directionTopic = primaryDirection ? topicById.get(primaryDirection.topic) : topicById.get(primaryTopic);
        const paperNode = {
            id: `paper:${record.id}`,
            kind: "paper",
            label: record.shortTitle || record.title,
            compactLabel: record.shortTitle || record.title,
            detail: [record.title, record.venue, record.year].filter(Boolean).join(" · "),
            href: `/paper/#note=${encodeURIComponent(record.id)}`,
            color: directionTopic?.color || "#538f9d",
            topics: matchingTopics,
            directions: matchingDirections.map((direction) => direction.id),
            position: [
                anchor[0] + Math.cos(angle) * radius,
                anchor[1] + Math.sin(angle) * radius * 0.78,
                anchor[2] + (slot % 2 ? -36 : 36),
            ],
        };
        nodes.push(paperNode);
        for (const direction of matchingDirections) {
            links.push({
                source: `direction:${direction.id}`,
                target: paperNode.id,
                label: "关联论文",
                type: "direction-paper",
            });
        }
        for (const topicId of matchingTopics) {
            if (!matchingDirections.some((direction) => direction.topic === topicId)) {
                links.push({
                    source: `topic:${topicId}`,
                    target: paperNode.id,
                    label: "关联论文",
                    type: "paper-topic",
                });
            }
        }
        if (!matchingTopics.length && !matchingDirections.length) {
            links.push({ source: "root", target: paperNode.id, label: "未分类论文", type: "paper-topic" });
        }
    });

    const ids = new Set(nodes.map((node) => node.id));
    for (const relation of config.relations || []) {
        if (ids.has(relation.source) && ids.has(relation.target) && relation.source !== relation.target) {
            const existing = links.find((link) => link.source === relation.source && link.target === relation.target);
            if (existing) {
                existing.label = relation.label;
                existing.type = "custom";
            } else links.push({ ...relation, type: "custom" });
        }
    }
    return { nodes, links };
}
