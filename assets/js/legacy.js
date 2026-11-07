const hash = location.hash;
const isRoadmap = hash === "#phases" || hash === "#note=llm-inference-optimization";
location.replace(`${isRoadmap ? "/" : "/paper/"}${location.search}${hash === "#phases" ? "#research-roadmap" : hash}`);
