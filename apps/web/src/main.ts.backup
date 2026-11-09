import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import "./style.css";

const container = document.querySelector<HTMLDivElement>("#scene-container")!;
const status = document.querySelector<HTMLSpanElement>("#render-status")!;
const objectList = document.querySelector<HTMLDivElement>("#object-list")!;
const emptyInspector = document.querySelector<HTMLDivElement>("#empty-inspector")!;
const objectInspector = document.querySelector<HTMLDivElement>("#object-inspector")!;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#101522");
scene.fog = new THREE.Fog("#101522", 25, 65);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 150);
camera.position.set(7, 6, 9);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
container.appendChild(renderer.domElement);

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.06;
orbit.minDistance = 2;
orbit.maxDistance = 35;
orbit.maxPolarAngle = Math.PI * 0.49;
orbit.target.set(0, 0.8, 0);

scene.add(new THREE.HemisphereLight("#c6d8ff", "#25283a", 2));

const light = new THREE.DirectionalLight("#ffffff", 3);
light.position.set(5, 9, 6);
light.castShadow = true;
light.shadow.mapSize.set(1024, 1024);
scene.add(light);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: "#171d2b", roughness: 0.92 })
);
floor.name = "Ground";
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.025;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(40, 40, "#53678e", "#303b53");
grid.position.y = 0.002;
scene.add(grid);

const editableObjects: THREE.Mesh[] = [];
let selected: THREE.Mesh | null = null;
let nextObjectId = 1;

const transform = new TransformControls(camera, renderer.domElement);
scene.add(transform.getHelper());
transform.setMode("translate");
transform.setSize(0.85);

transform.addEventListener("dragging-changed", (event) => {
  orbit.enabled = !event.value;
});

transform.addEventListener("objectChange", () => {
  updateInspector();
});

function createMaterial(color = "#7c6cff"): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.4,
    metalness: 0.12
  });
}

function addObject(
  type: "Cube" | "Sphere" | "Plane",
  initial = false
): void {
  let geometry: THREE.BufferGeometry;

  if (type === "Sphere") {
    geometry = new THREE.SphereGeometry(0.75, 32, 24);
  } else if (type === "Plane") {
    geometry = new THREE.PlaneGeometry(1.8, 1.8);
  } else {
    geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
  }

  const mesh = new THREE.Mesh(geometry, createMaterial());
  mesh.name = type === "Cube" ? `Cube ${nextObjectId}` : `${type} ${nextObjectId}`;
  mesh.userData.editorId = nextObjectId++;
  mesh.userData.objectType = type;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  if (type === "Plane") {
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.01;
  } else {
    mesh.position.set(initial ? 0 : (Math.random() - 0.5) * 3, type === "Sphere" ? 0.75 : 0.76, initial ? 0 : (Math.random() - 0.5) * 3);
  }

  scene.add(mesh);
  editableObjects.push(mesh);
  selectObject(mesh);
  renderObjectList();
}

function selectObject(mesh: THREE.Mesh | null): void {
  selected = mesh;
  if (mesh) {
    transform.attach(mesh);
  } else {
    transform.detach();
  }
  renderObjectList();
  updateInspector();
}

function renderObjectList(): void {
  objectList.replaceChildren();

  for (const mesh of [...editableObjects].reverse()) {
    const item = document.createElement("button");
    item.className = `object-item${mesh === selected ? " selected" : ""}`;
    item.type = "button";

    const icon = document.createElement("span");
    icon.className = "object-icon";
    icon.textContent = mesh.userData.objectType === "Sphere" ? "●" :
      mesh.userData.objectType === "Plane" ? "▱" : "◆";

    const name = document.createElement("span");
    name.className = "object-name";
    name.textContent = mesh.name;

    item.append(icon, name);
    item.addEventListener("click", () => selectObject(mesh));
    objectList.append(item);
  }
}

function updateInspector(): void {
  emptyInspector.hidden = selected !== null;
  objectInspector.hidden = selected === null;
  if (!selected) return;

  const mesh = selected;
  (document.querySelector<HTMLInputElement>("#object-name")!).value = mesh.name;
  document.querySelector("#object-type")!.textContent = mesh.userData.objectType;

  const values: [string, THREE.Vector3][] = [
    ["pos", mesh.position],
    ["scale", mesh.scale]
  ];

  for (const [prefix, vector] of values) {
    for (const axis of ["x", "y", "z"] as const) {
      const input = document.querySelector<HTMLInputElement>(`#${prefix}-${axis}`)!;
      if (document.activeElement !== input) input.value = vector[axis].toFixed(2);
    }
  }

  for (const axis of ["x", "y", "z"] as const) {
    const input = document.querySelector<HTMLInputElement>(`#rot-${axis}`)!;
    if (document.activeElement !== input) {
      input.value = THREE.MathUtils.radToDeg(mesh.rotation[axis]).toFixed(1);
    }
  }
}

function deleteSelected(): void {
  if (!selected) return;
  const target = selected;
  selectObject(null);
  scene.remove(target);
  target.geometry.dispose();
  if (Array.isArray(target.material)) {
    target.material.forEach(material => material.dispose());
  } else {
    target.material.dispose();
  }
  editableObjects.splice(editableObjects.indexOf(target), 1);
  renderObjectList();
  updateInspector();
}

function focusSelected(): void {
  if (!selected) return;
  const target = selected.position.clone();
  orbit.target.copy(target);
  const direction = camera.position.clone().sub(orbit.target).normalize();
  camera.position.copy(target).add(direction.multiplyScalar(5));
  orbit.update();
}

function setMode(mode: "translate" | "rotate" | "scale"): void {
  transform.setMode(mode);
  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach(button => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
}

document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach(button => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode as "translate" | "rotate" | "scale");
  });
});

document.querySelector<HTMLButtonElement>("#delete-object")!.addEventListener("click", deleteSelected);
document.querySelector<HTMLButtonElement>("#focus-object")!.addEventListener("click", focusSelected);

document.querySelector<HTMLButtonElement>("#add-menu")!.addEventListener("click", () => {
  const choice = window.prompt("Add object: cube, sphere, or plane", "cube");
  if (!choice) return;
  const type = choice.trim().toLowerCase();
  if (type === "cube" || type === "sphere" || type === "plane") {
    addObject(type[0].toUpperCase() + type.slice(1) as "Cube" | "Sphere" | "Plane");
  } else {
    window.alert("Unknown object type. Choose cube, sphere, or plane.");
  }
});

document.querySelector<HTMLInputElement>("#object-name")!.addEventListener("change", event => {
  if (!selected) return;
  const value = (event.currentTarget as HTMLInputElement).value.trim();
  if (value) selected.name = value;
  renderObjectList();
});

for (const [prefix, property] of [
  ["pos", "position"],
  ["rot", "rotation"],
  ["scale", "scale"]
] as const) {
  for (const axis of ["x", "y", "z"] as const) {
    document.querySelector<HTMLInputElement>(`#${prefix}-${axis}`)!.addEventListener("change", event => {
      if (!selected) return;
      const value = Number((event.currentTarget as HTMLInputElement).value);
      if (!Number.isFinite(value)) return;
      if (property === "rotation") {
        selected.rotation[axis] = THREE.MathUtils.degToRad(value);
      } else if (property === "scale") {
        selected.scale[axis] = Math.max(0.01, value);
      } else {
        selected.position[axis] = value;
      }
      updateInspector();
    });
  }
}

renderer.domElement.addEventListener("pointerdown", event => {
  if (transform.dragging) return;

  const rect = renderer.domElement.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(editableObjects, false);
  selectObject(hits.length ? hits[0].object as THREE.Mesh : null);
});

window.addEventListener("keydown", event => {
  if (event.target instanceof HTMLInputElement) return;

  if (event.key === "Delete" || event.key === "Backspace") {
    deleteSelected();
  } else if (event.key.toLowerCase() === "w") {
    setMode("translate");
  } else if (event.key.toLowerCase() === "e") {
    setMode("rotate");
  } else if (event.key.toLowerCase() === "r") {
    setMode("scale");
  } else if (event.key.toLowerCase() === "f") {
    focusSelected();
  } else if (event.key === "Escape") {
    selectObject(null);
  }
});

const resizeObserver = new ResizeObserver(() => {
  const width = container.clientWidth;
  const height = container.clientHeight;
  if (!width || !height) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});
resizeObserver.observe(container);

addObject("Cube", true);
selectObject(null);

function animate(): void {
  requestAnimationFrame(animate);
  orbit.update();
  renderer.render(scene, camera);
}

animate();
status.textContent = "EDITOR READY";
console.info("KBVERSE World Editor initialized.");
