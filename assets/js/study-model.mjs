export function masteryLevel(config, score) {
    return config.levels.find((level) => score >= level.min && score <= level.max) || config.levels[0];
}

function scoreFor(node, scores) {
    return node.score ?? scores.get(node.level) ?? 0;
}

function masteryDistribution(config, nodes) {
    const scores = new Map(config.levels.map((level) => [level.id, level.score]));
    const levels = config.levels.map((level) => ({ ...level, count: 0 }));
    const countsById = new Map(levels.map((level) => [level.id, level]));
    for (const node of nodes) {
        const level = masteryLevel(config, scoreFor(node, scores));
        countsById.get(level.id).count += 1;
    }
    return {
        count: nodes.length,
        mastered: countsById.get("mastered")?.count ?? 0,
        levels,
    };
}

export function masterySummary(config) {
    return config.groups.map((group) => ({
        ...group,
        ...masteryDistribution(config, config.nodes.filter((node) => node.group === group.id)),
    }));
}

export function overallMasterySummary(config) {
    return { ...masteryDistribution(config, config.nodes), groupCount: config.groups.length };
}

export function graphPositions(config) {
    const positions = new Map();
    config.groups.forEach((group, groupIndex) => {
        const nodes = config.nodes.filter((node) => node.group === group.id);
        nodes.forEach((node, index) => {
            positions.set(node.id, { x: groupIndex * 195, y: index * 82 + 30 });
        });
    });
    return positions;
}

export function directionSummary(config, groupId) {
    const group = config.groups.find((group) => group.id === groupId);
    if (!group) return [];
    const scores = new Map(config.levels.map((level) => [level.id, level.score]));
    return group.directions.map((direction) => {
        const nodes = config.nodes.filter((node) => node.group === groupId && node.direction === direction);
        return { direction, count: nodes.length, score: nodes.length
            ? Math.round(nodes.reduce((sum, node) => sum + scoreFor(node, scores), 0) / nodes.length) : null };
    });
}
