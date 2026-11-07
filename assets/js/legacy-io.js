const aliases = { "#phases": "#research-roadmap", "#progress": "#research-progress", "#reports": "#research-reports", "#skills": "#skills" };
const target = location.hash.startsWith("#note=") ? location.hash : aliases[location.hash] || "#research";
location.replace(`/${location.search}${target}`);
