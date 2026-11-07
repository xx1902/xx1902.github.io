import * as THREE from "../vendor/paper/three.js";
import { OrbitControls } from "../vendor/paper/three.js";
import { createPaperGraph, paperGraphScope } from "./paper-graph-model.mjs";

const host = document.querySelector("#paper-graph");
const stage = document.querySelector("#paper-graph-stage");
const labelLayer = document.querySelector("#paper-graph-labels");
const selection = document.querySelector("#paper-graph-selection");
const context = document.querySelector("#paper-graph-context");
const fallback = document.querySelector("#paper-graph-fallback");
const motion = matchMedia("(prefers-reduced-motion: reduce)");
let graph;
let renderer;
let stopped = false;

function showFallback(message) {
    stopped = true;
    renderer?.setAnimationLoop(null);
    stage.hidden = true;
    host.querySelector(".paper-graph-tools").hidden = true;
    host.querySelector(".paper-graph-scopes")?.setAttribute("hidden", "");
    fallback.hidden = false;
    const notice = document.createElement("p");
    notice.className = "section-note";
    notice.textContent = message;
    fallback.replaceChildren(notice);
    for (const node of graph?.nodes || []) {
        if (node.kind === "root") continue;
        const link = document.createElement("a");
        link.href = node.href;
        link.textContent = node.label;
        link.setAttribute(node.kind === "paper" ? "data-note-link" : "data-workspace-filter", "");
        fallback.append(link);
    }
}

async function start() {
    window.lucide?.createIcons({ root: host });
    const responses = await Promise.all([fetch("/paper/data/map.json"), fetch("/paper/data/papers.json")]);
    if (responses.some((response) => !response.ok)) throw new Error("Unable to load graph data");
    graph = createPaperGraph(...await Promise.all(responses.map((response) => response.json())));
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.setClearColor(0xfafcfb);
    renderer.domElement.setAttribute("aria-label", "论文三维关系图");
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        showFallback("三维视图暂不可用，可通过以下入口浏览。");
    });
    stage.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 1, 5000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = false;
    controls.rotateSpeed = 0.55;
    controls.zoomSpeed = 0.65;
    controls.autoRotateSpeed = 0.28;
    controls.minPolarAngle = Math.PI * 0.22;
    controls.maxPolarAngle = Math.PI * 0.78;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc4d5ce, 2.2));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3);
    keyLight.position.set(-250, 350, 450);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xe4efff, 1.5);
    rimLight.position.set(250, -100, -200);
    scene.add(rimLight);
    const sphere = new THREE.SphereGeometry(1, 28, 20);
    const meshes = [];
    const byId = new Map();
    const labels = [];
    const edges = [];
    const projected = new THREE.Vector3();
    const cameraSpace = new THREE.Vector3();
    const connected = new Set();
    let hovered = null;
    let focused = null;
    let clearHighlightTimer = 0;
    let activeScope = new Set(graph.nodes.map((node) => node.id));
    let focusedTopic = null;
    let focusedDirection = null;
    const topicSelect = host.querySelector("#graph-topic");
    const directionSelect = host.querySelector("#graph-direction");
    let size = { width: 1, height: 1 };
    let lastTime = 0;
    let lastLabels = 0;
    let labelDirty = true;
    let visible = !document.querySelector("#map").hidden;
    let intersecting = true;
    let dragging = false;
    let pointerDirty = false;
    let transition = null;
    let defaultPosition = new THREE.Vector3();
    let defaultTarget = new THREE.Vector3();
    let lastWake = 0;
    const pointer = new THREE.Vector2(5, 5);
    const raycaster = new THREE.Raycaster();
    const rotationButton = host.querySelector('[data-graph-action="rotate"]');
    for (const node of graph.nodes) {
        const radius = node.kind === "root" ? 21 : node.kind === "topic" ? 12.5 : node.kind === "direction" ? 8 : 6;
        const material = new THREE.MeshStandardMaterial({
            color: node.color, roughness: 0.27, metalness: 0.18, transparent: true,
        });
        const mesh = new THREE.Mesh(sphere, material);
        mesh.position.fromArray(node.position);
        mesh.scale.setScalar(radius);
        mesh.userData = { ...node, radius, factor: 1, emphasis: 0, opacity: 1 };
        scene.add(mesh);
        meshes.push(mesh);
        byId.set(node.id, mesh);
        const label = document.createElement("a");
        label.className = `paper-node-label paper-node-${node.kind}`;
        label.textContent = node.compactLabel || node.label;
        label.setAttribute("aria-label", node.label);
        label.title = node.detail;
        label.href = node.href;
        label.style.setProperty("--node-color", node.color);
        label.setAttribute(node.kind === "paper" ? "data-note-link" : "data-workspace-filter", "");
        label.addEventListener("pointerenter", () => setHighlight(mesh));
        label.addEventListener("pointerleave", clearHighlightSoon);
        label.addEventListener("focus", () => { focused = mesh; setHighlight(mesh); });
        label.addEventListener("blur", () => { focused = null; setHighlight(null); });
        labelLayer.append(label);
        labels.push({ mesh, label, width: 0, height: 0, placement: 0 });
    }
    const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.4, 1.52, 48),
        new THREE.MeshBasicMaterial({ color: 0x258c7b, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
    );
    scene.add(ring);
    for (const [index, link] of graph.links.entries()) {
        const source = byId.get(link.source);
        const target = byId.get(link.target);
        const color = source.userData.kind === "direction" ? source.userData.color : target.userData.color;
        const material = new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.24, depthWrite: false,
        });
        const line = new THREE.Mesh(new THREE.BufferGeometry(), material);
        const signal = new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.6, depthWrite: false,
        }));
        signal.scale.setScalar(link.source === "root" ? 1.6 : 1.25);
        scene.add(line, signal);
        edges.push({ ...link, sourceMesh: source, targetMesh: target, line, signal, phase: index * 0.137 });
    }

    function clearHighlightSoon() {
        window.clearTimeout(clearHighlightTimer);
        clearHighlightTimer = window.setTimeout(() => setHighlight(null), 220);
    }
    function setHighlight(mesh) {
        window.clearTimeout(clearHighlightTimer);
        const next = focused || mesh;
        if (next === hovered) return;
        hovered = next;
        connected.clear();
        if (hovered) {
            connected.add(hovered.userData.id);
            for (const upstream of [true, false]) {
                const visited = new Set([hovered.userData.id]);
                const queue = [hovered.userData.id];
                for (let i = 0; i < queue.length; i++) for (const edge of edges) {
                    if (edge.type === "custom") continue;
                    if ((upstream ? edge.target : edge.source) !== queue[i]) continue;
                    const next = upstream ? edge.source : edge.target;
                    if (!activeScope.has(next) || visited.has(next)) continue;
                    visited.add(next); connected.add(next); queue.push(next);
                }
            }
            for (const edge of edges.filter((edge) => edge.type === "custom")) {
                if (edge.source === hovered.userData.id) connected.add(edge.target);
                if (edge.target === hovered.userData.id) connected.add(edge.source);
            }
            ring.position.copy(hovered.position);
            ring.scale.setScalar(hovered.userData.radius * hovered.userData.factor);
            ring.material.color.set(hovered.userData.color);
        }
        for (const { mesh: item, label } of labels) {
            label.classList.toggle("node-related", connected.has(item.userData.id));
            label.classList.toggle("node-active", item === hovered);
        }
        selection.textContent = hovered ? `${hovered.userData.label} ↗` : "全部文献 ↗";
        selection.href = hovered?.userData.href || "/paper/#notes";
        selection.toggleAttribute("data-note-link", hovered?.userData.kind === "paper");
        selection.toggleAttribute("data-workspace-filter", hovered?.userData.kind !== "paper");
        const customRelations = hovered ? edges.filter((edge) => edge.type === "custom"
            && (edge.source === hovered.userData.id || edge.target === hovered.userData.id)).map((edge) => {
                const neighbor = edge.source === hovered.userData.id ? edge.targetMesh : edge.sourceMesh;
                return `${edge.label} · ${neighbor.userData.compactLabel || neighbor.userData.label}`;
            }) : [];
        context.textContent = hovered ? [hovered.userData.detail, ...customRelations].join(" / ") : "研究方向与本地论文的关联";
        labelDirty = true;
        wake();
    }
    function refreshCurves() {
        for (const edge of edges) {
            const start = edge.sourceMesh.position.clone();
            const end = edge.targetMesh.position.clone();
            const center = start.clone().lerp(end, 0.5);
            const offset = end.clone().sub(start);
            center.add(new THREE.Vector3(-offset.y * 0.09, offset.x * 0.09, 28));
            edge.curve = new THREE.QuadraticBezierCurve3(start, center, end);
            edge.line.geometry.dispose();
            edge.line.geometry = new THREE.TubeGeometry(edge.curve, 32, edge.source === "root" ? 0.65 : 0.45, 4, false);
        }
    }
    function measureLabels() {
        for (const item of labels) {
            item.width = item.label.offsetWidth;
            item.height = item.label.offsetHeight;
        }
        labelDirty = true;
    }
    function positionLabels() {
        const occupied = [];
        const priority = (item) => item.mesh === hovered ? 0 : connected.has(item.mesh.userData.id) ? 1
            : item.mesh.userData.kind === "root" ? 2 : item.mesh.userData.kind === "topic" ? 3
                : item.mesh.userData.kind === "paper" ? 4 : 5;
        for (const item of [...labels].sort((a, b) => priority(a) - priority(b))) {
            const { mesh, label, width, height } = item;
            projected.copy(mesh.position).project(camera);
            cameraSpace.copy(mesh.position).applyMatrix4(camera.matrixWorldInverse);
            const x = (projected.x + 1) * size.width / 2;
            const y = (1 - projected.y) * size.height / 2;
            const radius = mesh.userData.radius * mesh.userData.factor * size.height
                / (2 * Math.tan(THREE.MathUtils.degToRad(20)) * -cameraSpace.z);
            const gap = radius + 6;
            const candidates = [
                { left: x - width / 2, top: y + gap },
                { left: x + gap, top: y - height / 2 },
                { left: x - width / 2, top: y - gap - height },
                { left: x - width - gap, top: y - height / 2 },
            ];
            const available = activeScope.has(mesh.userData.id);
            const candidatesOrdered = [item.placement, ...[0, 1, 2, 3].filter((index) => index !== item.placement)];
            let placed = false;
            for (const index of candidatesOrdered) {
                const bounds = { ...candidates[index], width, height };
                const outside = projected.z < -1 || projected.z > 1 || bounds.left < 5 || bounds.top < 5
                    || bounds.left + width > size.width - 5 || bounds.top + height > size.height - 5;
                const overlaps = occupied.some((box) => bounds.left < box.left + box.width + 7
                    && bounds.left + width > box.left - 7 && bounds.top < box.top + box.height + 4 && bounds.top + height > box.top - 4);
                if (outside || overlaps || !available) continue;
                label.style.transform = `translate3d(${Math.round(bounds.left)}px, ${Math.round(bounds.top)}px, 0)`;
                label.style.visibility = "visible";
                label.style.opacity = hovered && !connected.has(mesh.userData.id) ? "0.22" : "1";
                item.placement = index;
                occupied.push(bounds);
                placed = true;
                break;
            }
            if (!placed) {
                label.style.visibility = "hidden";
                label.style.opacity = "0";
            }
        }
        labelDirty = false;
    }
    function pick() {
        raycaster.setFromCamera(pointer, camera);
        return raycaster.intersectObjects(meshes, false).find((hit) => activeScope.has(hit.object.userData.id))?.object || null;
    }
    function setPointer(event) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
        pointerDirty = true;
        wake();
    }
    let down;
    renderer.domElement.addEventListener("pointerdown", (event) => {
        down = { x: event.clientX, y: event.clientY };
        transition = null;
        dragging = true;
        setHighlight(null);
        renderer.domElement.style.cursor = "grabbing";
    });
    renderer.domElement.addEventListener("pointermove", (event) => {
        if (!dragging) setPointer(event);
    });
    renderer.domElement.addEventListener("pointerleave", () => {
        pointer.set(5, 5);
        pointerDirty = false;
        clearHighlightSoon();
    });
    renderer.domElement.addEventListener("pointerup", (event) => {
        dragging = false;
        renderer.domElement.style.cursor = "grab";
        if (event.button !== 0 || !down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) return;
        setPointer(event);
        const mesh = pick();
        if (mesh) labels.find((item) => item.mesh === mesh).label.click();
    });
    renderer.domElement.addEventListener("pointercancel", () => { dragging = false; down = null; });
    renderer.domElement.addEventListener("wheel", () => { transition = null; }, { passive: true });
    controls.addEventListener("start", () => { transition = null; wake(); });
    controls.addEventListener("end", () => { dragging = false; });

    function animateCamera(position, target = controls.target) {
        transition = {
            from: camera.position.clone(), to: position.clone(),
            targetFrom: controls.target.clone(), targetTo: target.clone(), start: performance.now(),
        };
        wake();
    }
    function setScope(topic = topicSelect.value, direction = directionSelect.value) {
        if (!topic && direction) topic = graph.nodes.find((node) => node.direction === direction)?.topic || "";
        focusedTopic = topic || null;
        focusedDirection = direction || null;
        topicSelect.value = topic;
        directionSelect.replaceChildren(new Option("全部具体方向", ""));
        for (const node of graph.nodes.filter((node) => node.kind === "direction" && (!topic || node.topic === topic))) {
            directionSelect.add(new Option(node.label, node.direction));
        }
        directionSelect.value = direction;
        if (!directionSelect.value) focusedDirection = null;
        activeScope = paperGraphScope(graph, topic, directionSelect.value);
        arrangeMeshes();
        refreshCurves();
        focused = null;
        setHighlight(null);
        const positions = meshes.filter((mesh) => activeScope.has(mesh.userData.id)).map((mesh) => mesh.position);
        const center = new THREE.Box3().setFromPoints(positions).getCenter(new THREE.Vector3());
        const viewOffset = defaultPosition.clone().sub(defaultTarget);
        animateCamera(center.clone().add(viewOffset.multiplyScalar(topic ? 0.86 : 1)), center);
        labelDirty = true;
    }
    function arrangeMeshes() {
        const narrow = size.width < 640;
        for (const mesh of meshes) {
            mesh.position.fromArray(mesh.userData.position);
            mesh.position.x *= narrow ? 0.69 : 1.6;
            mesh.position.y *= narrow ? 1.38 : 0.78;
            mesh.position.z *= narrow ? 1 : 1.35;
            mesh.userData.factor = narrow ? 1.4 : 1;
            mesh.scale.setScalar(mesh.userData.radius * mesh.userData.factor);
        }
        if (!focusedTopic && !focusedDirection) return;
        const slots = new Map();
        for (const mesh of meshes.filter((mesh) => mesh.userData.kind === "paper" && activeScope.has(mesh.userData.id))) {
            const parent = meshes.find((candidate) => candidate.userData.kind === "direction"
                && activeScope.has(candidate.userData.id) && mesh.userData.directions.includes(candidate.userData.direction));
            if (!parent) continue;
            const slot = slots.get(parent.userData.id) || 0;
            slots.set(parent.userData.id, slot + 1);
            const angle = Math.atan2(parent.position.y, parent.position.x) + (slot - 0.5) * 0.45;
            mesh.position.copy(parent.position).add(new THREE.Vector3(
                Math.cos(angle) * (narrow ? 72 : 125), Math.sin(angle) * (narrow ? 105 : 72), 35 + slot * 18));
        }
    }
    topicSelect.addEventListener("change", () => setScope(topicSelect.value, ""));
    directionSelect.addEventListener("change", () => setScope());
    for (const node of graph.nodes.filter((node) => node.kind === "direction")) directionSelect.add(new Option(node.label, node.direction));
    rotationButton.addEventListener("click", () => {
        controls.autoRotate = !controls.autoRotate;
        rotationButton.setAttribute("aria-pressed", String(controls.autoRotate));
        wake();
    });
    for (const button of host.querySelectorAll('[data-graph-action="in"], [data-graph-action="out"]')) {
        button.addEventListener("click", () => {
            const distance = camera.position.distanceTo(controls.target);
            const factor = button.dataset.graphAction === "in" ? 0.8 : 1.25;
            const next = THREE.MathUtils.clamp(distance * factor, controls.minDistance, controls.maxDistance);
            const direction = camera.position.clone().sub(controls.target).normalize();
            animateCamera(controls.target.clone().add(direction.multiplyScalar(next)));
        });
    }
    host.querySelector('[data-graph-action="reset"]').addEventListener("click", () => {
        controls.autoRotate = false;
        rotationButton.setAttribute("aria-pressed", "false");
        setScope("", "");
        setHighlight(null);
        animateCamera(defaultPosition, defaultTarget);
    });

    function resize() {
        const width = stage.clientWidth;
        const height = stage.clientHeight;
        if (!width || !height || width === size.width && height === size.height) return;
        size = { width, height };
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        arrangeMeshes();
        for (const { mesh, label } of labels) {
            label.textContent = mesh.userData.compactLabel || mesh.userData.label;
        }
        refreshCurves();
        const box = new THREE.Box3().setFromPoints(meshes.map((mesh) => mesh.position));
        defaultTarget = box.getCenter(new THREE.Vector3());
        const span = box.getSize(new THREE.Vector3());
        const tangent = Math.tan(THREE.MathUtils.degToRad(20));
        const distance = Math.max(span.y * 0.6 / tangent, span.x * 0.57 / (tangent * camera.aspect)) + span.z * 0.3 + 55;
        defaultPosition = defaultTarget.clone().add(new THREE.Vector3(65, 35, distance));
        camera.position.copy(defaultPosition);
        controls.target.copy(defaultTarget);
        controls.minDistance = distance * 0.55;
        controls.maxDistance = distance * 1.8;
        camera.updateProjectionMatrix();
        transition = null;
        measureLabels();
        wake();
    }
    function wake() {
        lastWake = performance.now();
        if (!stopped && size.width > 1 && visible && intersecting && !document.hidden) renderer.setAnimationLoop(frame);
    }
    function syncVisibility() {
        if (stopped || !visible || !intersecting || document.hidden) renderer.setAnimationLoop(null);
        else { lastTime = 0; wake(); }
    }
    function frame(time) {
        const dt = Math.min((time - (lastTime || time - 16.7)) / 1000, 0.05);
        lastTime = time;
        const ease = motion.matches ? 1 : 1 - Math.exp(-dt * 10);
        if (transition) {
            const progress = motion.matches ? 1 : Math.min((performance.now() - transition.start) / 560, 1);
            const smooth = 1 - (1 - progress) ** 3;
            camera.position.lerpVectors(transition.from, transition.to, smooth);
            controls.target.lerpVectors(transition.targetFrom, transition.targetTo, smooth);
            if (progress === 1) transition = null;
        }
        const rotate = controls.autoRotate;
        controls.autoRotate = rotate && !hovered && !dragging;
        const changed = controls.update(dt);
        controls.autoRotate = rotate;
        if (pointerDirty && !dragging) {
            pointerDirty = false;
            const mesh = pick();
            renderer.domElement.style.cursor = mesh ? "pointer" : "grab";
            if (mesh) setHighlight(mesh);
            else if (hovered) clearHighlightSoon();
        }
        for (const mesh of meshes) {
            const data = mesh.userData;
            const active = activeScope.has(data.id);
            const emphasis = hovered === mesh ? 1 : 0;
            const opacity = !active ? 0 : hovered && !connected.has(data.id) ? 0.2 : 1;
            mesh.visible = active;
            data.emphasis += (emphasis - data.emphasis) * ease;
            data.opacity += (opacity - data.opacity) * ease;
            mesh.scale.setScalar(data.radius * data.factor * (1 + data.emphasis * 0.18));
            mesh.material.opacity = data.opacity;
            mesh.material.emissive.set(data.color);
            mesh.material.emissiveIntensity = data.emphasis * 0.18;
        }
        ring.quaternion.copy(camera.quaternion);
        ring.material.opacity += ((hovered ? 0.5 : 0) - ring.material.opacity) * ease;
        for (const edge of edges) {
            const active = activeScope.has(edge.source) && activeScope.has(edge.target);
            const related = hovered && connected.has(edge.source) && connected.has(edge.target);
            const structural = ["mainline-topic", "topic-direction"].includes(edge.type);
            const opacity = !active ? 0 : hovered ? related ? 0.8 : structural ? 0.05 : 0
                : edge.type === "mainline-topic" ? 0.48 : edge.type === "topic-direction" ? 0.27
                    : edge.type === "custom" ? 0 : focusedTopic || focusedDirection ? 0.24 : 0.07;
            edge.line.visible = active;
            edge.line.material.opacity += (opacity - edge.line.material.opacity) * ease;
            edge.signal.visible = !motion.matches && active && hovered && related;
            if (edge.signal.visible) {
                const progress = (time * 0.000075 + edge.phase) % 1;
                edge.signal.position.copy(edge.curve.getPoint(progress));
                edge.signal.material.opacity = Math.sin(progress * Math.PI) * (related ? 0.85 : 0.5);
            }
        }
        renderer.render(scene, camera);
        if (labelDirty || changed || transition || time - lastLabels > 80) {
            if (labelDirty || time - lastLabels >= 32) {
                positionLabels();
                lastLabels = time;
            }
        }
        // Idle graphs do not need a continuous render loop.
        if (!controls.autoRotate && !transition && !dragging && !changed && (!hovered || motion.matches) && performance.now() - lastWake > 800) {
            renderer.setAnimationLoop(null);
        }
    }
    new ResizeObserver(resize).observe(stage);
    new IntersectionObserver(([entry]) => {
        intersecting = entry.isIntersecting;
        syncVisibility();
    }, { rootMargin: "80px" }).observe(stage);
    window.addEventListener("workspaceviewchange", (event) => {
        visible = event.detail.view === "map";
        if (visible) requestAnimationFrame(() => { resize(); measureLabels(); wake(); });
        syncVisibility();
    });
    document.addEventListener("visibilitychange", syncVisibility);
    motion.addEventListener("change", syncVisibility);
    document.fonts.ready.then(() => { measureLabels(); wake(); });
    stage.querySelector(".paper-graph-loading").remove();
    host.dataset.graphReady = "true";
    resize();
    syncVisibility();
}

start().catch((error) => {
    console.error("Paper graph:", error);
    showFallback(graph ? "当前设备无法显示三维视图，可通过以下入口浏览。" : "论文关系暂未加载，请刷新后重试。");
});
