import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
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

const editableObjects: THREE.Group[] = [];
let selected: THREE.Group | null = null;
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

type AssetDefinition = {
  id: string;
  name: string;
  category: string;
  icon: string;
};

const assetCatalog: AssetDefinition[] = [
  { id: "house", name: "House", category: "Buildings", icon: "⌂" },
  { id: "villa", name: "Villa", category: "Buildings", icon: "⌂" },
  { id: "wooden-house", name: "Wooden House", category: "Buildings", icon: "⌂" },
  { id: "apartment", name: "Apartment", category: "Buildings", icon: "▥" },
  { id: "skyscraper", name: "Skyscraper", category: "Buildings", icon: "▤" },
  { id: "castle", name: "Castle", category: "Buildings", icon: "♜" },
  { id: "bridge", name: "Bridge", category: "Buildings", icon: "⌒" },
  { id: "pagoda", name: "Pagoda", category: "Buildings", icon: "塔" },

  { id: "tree", name: "Tree", category: "Nature", icon: "♣" },
  { id: "pine", name: "Pine Tree", category: "Nature", icon: "♠" },
  { id: "rock", name: "Rock", category: "Nature", icon: "◆" },
  { id: "flower", name: "Flower", category: "Nature", icon: "✿" },
  { id: "grass", name: "Grass", category: "Nature", icon: "⁙" },
  { id: "bush", name: "Bush", category: "Nature", icon: "❀" },

  { id: "car", name: "Car", category: "Vehicles", icon: "🚗" },
  { id: "bus", name: "Bus", category: "Vehicles", icon: "▰" },

  { id: "table", name: "Table", category: "Furniture", icon: "▱" },
  { id: "chair", name: "Chair", category: "Furniture", icon: "▣" },
  { id: "bed", name: "Bed", category: "Furniture", icon: "▰" },
  { id: "computer-desk", name: "Computer Desk", category: "Furniture", icon: "▦" },

  { id: "traffic-light", name: "Traffic Light", category: "Props", icon: "🚦" },
  { id: "street-lamp", name: "Street Lamp", category: "Props", icon: "♧" },
  { id: "fence", name: "Fence", category: "Props", icon: "▥" },
  { id: "trash-can", name: "Trash Can", category: "Props", icon: "▤" },
  { id: "fountain", name: "Fountain", category: "Props", icon: "♒" },

  { id: "cube", name: "Cube", category: "Primitives", icon: "◼" },
  { id: "sphere", name: "Sphere", category: "Primitives", icon: "●" },
  { id: "cylinder", name: "Cylinder", category: "Primitives", icon: "◉" },
  { id: "cone", name: "Cone", category: "Primitives", icon: "▲" },
  { id: "torus", name: "Torus", category: "Primitives", icon: "◎" },
  { id: "plane", name: "Plane", category: "Primitives", icon: "▱" },
  { id: "circle", name: "Circle", category: "Primitives", icon: "○" },
  { id: "ring", name: "Ring", category: "Primitives", icon: "◌" },
  { id: "capsule", name: "Capsule", category: "Primitives", icon: "⬭" },
  { id: "pyramid", name: "Pyramid", category: "Primitives", icon: "△" },
  { id: "icosahedron", name: "Icosahedron", category: "Primitives", icon: "⬡" },
  { id: "kitchen", name: "Kitchen", category: "Furniture", icon: "▦" },
  { id: "kitchen-counter", name: "Kitchen Counter", category: "Furniture", icon: "▤" },
  { id: "stove", name: "Stove", category: "Furniture", icon: "▥" },
  { id: "refrigerator", name: "Refrigerator", category: "Furniture", icon: "▯" },
  { id: "sign", name: "Sign", category: "Props", icon: "⚑" },
  { id: "clock", name: "Clock", category: "Props", icon: "◷" },
  { id: "statue", name: "Statue", category: "Props", icon: "♟" },
  { id: "gate", name: "Gate", category: "Props", icon: "▥" },
  { id: "bench", name: "Bench", category: "Props", icon: "▰" },
  { id: "mailbox", name: "Mailbox", category: "Props", icon: "▣" },  { id: "torus-knot", name: "Torus Knot", category: "Primitives", icon: "∞" }
];

function createAsset(assetId: string): THREE.Group {
  const group = new THREE.Group();

  const material = (color: string, roughness = 0.8) =>
    new THREE.MeshStandardMaterial({ color, roughness });

  const part = (
    geometry: THREE.BufferGeometry,
    color: string,
    x: number,
    y: number,
    z: number,
    rotationX = 0,
    rotationY = 0,
    rotationZ = 0
  ) => {
    const mesh = new THREE.Mesh(geometry, material(color));
    mesh.position.set(x, y, z);
    mesh.rotation.set(rotationX, rotationY, rotationZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  const box = (w: number, h: number, d: number, color: string,
    x: number, y: number, z: number) =>
    part(new THREE.BoxGeometry(w, h, d), color, x, y, z);

  const cylinder = (rt: number, rb: number, h: number, color: string,
    x: number, y: number, z: number, segments = 16) =>
    part(new THREE.CylinderGeometry(rt, rb, h, segments), color, x, y, z);

  const sphere = (r: number, color: string, x: number, y: number, z: number) =>
    part(new THREE.SphereGeometry(r, 16, 12), color, x, y, z);

  const cone = (r: number, h: number, color: string, x: number, y: number, z: number) =>
    part(new THREE.ConeGeometry(r, h, 8), color, x, y, z);

  const house = (wall: string, roof: string, size = 1) => {
    box(2 * size, 1.5 * size, 1.8 * size, wall, 0, 0.75 * size, 0);
    part(new THREE.ConeGeometry(1.55 * size, 1.1 * size, 4),
      roof, 0, 2.05 * size, 0, 0, Math.PI / 4);
    box(0.42 * size, 0.8 * size, 0.08 * size, "#68452f",
      0, 0.4 * size, 0.94 * size);
    box(0.38 * size, 0.4 * size, 0.07 * size, "#8bd5ff",
      -0.62 * size, 0.95 * size, 0.94 * size);
    box(0.38 * size, 0.4 * size, 0.07 * size, "#8bd5ff",
      0.62 * size, 0.95 * size, 0.94 * size);
  };

  switch (assetId) {
    case "house":
      house("#e6c9a3", "#8e4e42");
      break;
    case "villa":
      house("#eee6d8", "#555d76", 1.25);
      box(2.9, 0.16, 2.5, "#c7bba9", 0, 0.08, 0);
      break;
    case "wooden-house":
      house("#98613c", "#49352d");
      break;
    case "apartment":
    case "skyscraper": {
      const tall = assetId === "skyscraper";
      const h = tall ? 6 : 3.8;
      box(2.2, h, 2, tall ? "#667b98" : "#c5cbd4", 0, h / 2, 0);
      for (let y = 0.5; y < h; y += tall ? 0.7 : 0.8) {
        for (const x of [-0.7, 0, 0.7]) {
          box(0.38, 0.42, 0.035, "#8edbff", x, y, 1.02);
        }
      }
      break;
    }
    case "castle":
      box(3.4, 1.8, 2.6, "#aaa9a2", 0, 0.9, 0);
      for (const x of [-1.45, 1.45]) {
        for (const z of [-1.05, 1.05]) {
          box(0.65, 2.8, 0.65, "#b9b6ac", x, 1.4, z);
          part(new THREE.ConeGeometry(0.52, 0.9, 4),
            "#694d62", x, 3.25, z, 0, Math.PI / 4);
        }
      }
      box(0.8, 1.1, 0.08, "#59483e", 0, 0.55, 1.34);
      break;
    case "bridge":
      box(4, 0.25, 1.3, "#98704c", 0, 1.1, 0);
      for (const x of [-1.7, -0.9, 0, 0.9, 1.7]) {
        box(0.1, 0.75, 0.1, "#76543a", x, 1.55, -0.55);
        box(0.1, 0.75, 0.1, "#76543a", x, 1.55, 0.55);
      }
      box(4, 0.1, 0.1, "#76543a", 0, 1.88, -0.55);
      box(4, 0.1, 0.1, "#76543a", 0, 1.88, 0.55);
      break;
    case "pagoda":
      box(1.5, 1.8, 1.5, "#9a5543", 0, 0.9, 0);
      for (let i = 0; i < 3; i++) {
        const s = 2.5 - i * 0.65;
        box(s, 0.12, s, "#473b35", 0, 1.85 + i * 0.75, 0);
        part(new THREE.ConeGeometry(s * 0.72, 0.55, 4),
          "#57453a", 0, 2.18 + i * 0.75, 0, 0, Math.PI / 4);
      }
      break;
    case "tree":
    case "pine":
      cylinder(0.16, 0.23, 1.6, "#765039", 0, 0.8, 0);
      if (assetId === "tree") {
        sphere(0.85, "#3d985b", 0, 1.9, 0);
        sphere(0.58, "#50ae69", -0.42, 2.1, 0.12);
        sphere(0.58, "#34834f", 0.42, 2.1, -0.1);
      } else {
        cone(0.95, 1.8, "#287d4c", 0, 2.0, 0);
        cone(0.72, 1.5, "#31945a", 0, 2.8, 0);
      }
      break;
    case "rock":
      part(new THREE.DodecahedronGeometry(0.8, 0), "#777d83", 0, 0.55, 0);
      break;
    case "flower":
      cylinder(0.035, 0.045, 0.8, "#3c9c59", 0, 0.4, 0);
      sphere(0.16, "#ffd34e", 0, 0.9, 0);
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5;
        sphere(0.13, "#ed79b5", Math.cos(a) * 0.2, 0.9, Math.sin(a) * 0.2);
      }
      break;
    case "grass":
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9;
        part(new THREE.ConeGeometry(0.09, 0.65, 5), "#55a95c",
          Math.cos(a) * 0.2, 0.3, Math.sin(a) * 0.2, 0, 0, (i % 2 ? 0.2 : -0.2));
      }
      break;
    case "bush":
      sphere(0.55, "#34834f", 0, 0.45, 0);
      sphere(0.4, "#45a65c", -0.35, 0.48, 0.1);
      sphere(0.4, "#3b9655", 0.35, 0.48, -0.1);
      break;
    case "car":
    case "bus": {
      const bus = assetId === "bus";
      const w = bus ? 1.55 : 1.25;
      box(bus ? 1.5 : 1.8, bus ? 1.45 : 0.55, bus ? 3.2 : 3,
        bus ? "#e8b94f" : "#d84f55", 0, bus ? 0.95 : 0.65, 0);
      if (!bus) {
        box(1.45, 0.65, 1.45, "#7eafc9", 0, 1.2, -0.15);
      } else {
        for (const z of [-1, 0, 1]) {
          box(1.53, 0.55, 0.04, "#8edbff", 0, 1.25, z);
        }
      }
      for (const x of [-w / 2, w / 2]) {
        for (const z of [-1, 1]) {
          part(new THREE.CylinderGeometry(0.34, 0.34, 0.18, 16),
            "#22252c", x, 0.38, z, 0, 0, Math.PI / 2);
        }
      }
      break;
    }
    case "traffic-light":
      cylinder(0.07, 0.07, 2.4, "#343b48", 0, 1.2, 0);
      box(0.45, 1.2, 0.38, "#252a35", 0, 2.25, 0);
      sphere(0.13, "#ef5555", 0, 2.62, 0.2);
      sphere(0.13, "#edc34d", 0, 2.25, 0.2);
      sphere(0.13, "#50d58a", 0, 1.88, 0.2);
      break;
    case "street-lamp":
      cylinder(0.06, 0.08, 3, "#505a6d", 0, 1.5, 0);
      box(0.75, 0.08, 0.08, "#505a6d", 0.3, 2.95, 0);
      sphere(0.2, "#ffe9a5", 0.65, 2.82, 0);
      break;
    case "table":
    case "computer-desk":
      box(2, 0.15, 1.2, "#98704c", 0, 1.1, 0);
      for (const x of [-0.82, 0.82]) {
        for (const z of [-0.42, 0.42]) {
          box(0.12, 1.05, 0.12, "#76543a", x, 0.53, z);
        }
      }
      if (assetId === "computer-desk") {
        box(0.85, 0.58, 0.08, "#252c3a", 0, 1.48, -0.3);
        box(0.72, 0.42, 0.025, "#6c8fbc", 0, 1.49, -0.245);
        box(0.8, 0.05, 0.35, "#353d4d", 0, 1.22, 0.28);
      }
      break;
    case "chair":
      box(0.9, 0.15, 0.9, "#98704c", 0, 0.8, 0);
      box(0.9, 1, 0.13, "#76543a", 0, 1.35, -0.38);
      for (const x of [-0.35, 0.35]) {
        for (const z of [-0.3, 0.3]) {
          box(0.1, 0.75, 0.1, "#76543a", x, 0.38, z);
        }
      }
      break;
    case "bed":
      box(1.7, 0.3, 2.4, "#76543a", 0, 0.45, 0);
      box(1.65, 0.18, 2.05, "#d6d9e4", 0, 0.68, 0.12);
      box(1.7, 0.75, 0.12, "#76543a", 0, 0.8, -1.18);
      box(0.65, 0.18, 0.45, "#f0f0f5", -0.45, 0.82, -0.72);
      box(0.65, 0.18, 0.45, "#f0f0f5", 0.45, 0.82, -0.72);
      break;
    case "fence":
      for (let x = -1.5; x <= 1.5; x += 0.5) {
        box(0.12, 1.1, 0.12, "#98704c", x, 0.55, 0);
      }
      box(3.2, 0.12, 0.12, "#76543a", 0, 0.35, 0);
      box(3.2, 0.12, 0.12, "#76543a", 0, 0.85, 0);
      break;
    case "trash-can":
      cylinder(0.42, 0.34, 0.9, "#667486", 0, 0.48, 0);
      cylinder(0.44, 0.44, 0.1, "#3d4654", 0, 0.98, 0);
      break;
    case "fountain":
      cylinder(1.2, 1.2, 0.25, "#8b9eaa", 0, 0.13, 0);
      cylinder(0.25, 0.35, 0.8, "#9cabb5", 0, 0.55, 0);
      sphere(0.3, "#75c9ec", 0, 1.05, 0);
      break;
    case "kitchen":
      box(3.2, 0.16, 0.9, "#8b674b", 0, 1.05, 0);
      box(3.0, 0.85, 0.75, "#e3dfd5", 0, 0.48, 0);
      box(1.0, 0.12, 0.72, "#777f8b", -0.7, 1.18, 0);
      box(0.65, 0.04, 0.55, "#4c5965", -0.7, 1.26, 0);
      box(0.8, 1.0, 0.65, "#b7c4d0", 1.0, 1.5, -0.05);
      box(3.0, 0.12, 0.5, "#ded8cb", 0, 2.05, -0.25);
      break;

    case "kitchen-counter":
      box(2.5, 0.15, 0.9, "#8c6748", 0, 1.05, 0);
      box(2.35, 0.85, 0.78, "#d9d4ca", 0, 0.48, 0);
      box(0.9, 0.06, 0.55, "#657582", -0.45, 1.16, 0);
      for (const x of [-0.75, 0, 0.75]) {
        box(0.025, 0.72, 0.02, "#a6a39c", x, 0.48, 0.4);
      }
      break;

    case "stove":
      box(1.35, 0.85, 1.0, "#aeb8c2", 0, 0.55, 0);
      box(1.4, 0.12, 1.05, "#343d49", 0, 1.04, 0);
      for (const x of [-0.38, 0.38]) {
        for (const z of [-0.28, 0.28]) {
          cylinder(0.17, 0.17, 0.035, "#171b22", x, 1.12, z);
          cylinder(0.07, 0.07, 0.04, "#747d88", x, 1.14, z);
        }
      }
      box(0.45, 0.25, 0.025, "#313b48", 0, 0.65, 0.51);
      break;

    case "refrigerator":
      box(1.15, 2.5, 0.9, "#dce3e9", 0, 1.25, 0);
      box(1.17, 0.035, 0.92, "#8795a3", 0, 1.5, 0);
      box(0.045, 0.65, 0.06, "#667585", 0.42, 0.95, 0.47);
      box(0.045, 0.55, 0.06, "#667585", 0.42, 1.95, 0.47);
      break;

    case "sign":
      cylinder(0.065, 0.065, 2.2, "#76543a", 0, 1.1, 0);
      box(1.5, 0.75, 0.12, "#d9ad55", 0, 1.8, 0);
      box(1.25, 0.06, 0.025, "#72502e", 0, 1.95, 0.07);
      box(0.85, 0.06, 0.025, "#72502e", 0, 1.72, 0.07);
      break;

    case "clock":
      cylinder(0.65, 0.65, 0.16, "#76543a", 0, 1.5, 0, 32)
        .rotation.x = Math.PI / 2;
      cylinder(0.55, 0.55, 0.025, "#eee9d8", 0, 1.5, 0.095, 32)
        .rotation.x = Math.PI / 2;
      box(0.045, 0.34, 0.025, "#303847", 0, 1.59, 0.12);
      box(0.28, 0.045, 0.025, "#303847", 0.12, 1.5, 0.12);
      break;

    case "statue":
      box(1.2, 0.35, 1.2, "#777d85", 0, 0.18, 0);
      box(0.8, 0.8, 0.8, "#96999c", 0, 0.75, 0);
      cylinder(0.3, 0.38, 0.45, "#b2b0a8", 0, 1.35, 0);
      sphere(0.36, "#bcb9af", 0, 1.95, 0);
      sphere(0.08, "#777d85", -0.13, 2.0, 0.3);
      sphere(0.08, "#777d85", 0.13, 2.0, 0.3);
      break;

    case "gate":
      for (const x of [-1.35, 1.35]) {
        box(0.22, 2.5, 0.22, "#777f8b", x, 1.25, 0);
        sphere(0.18, "#c5a96c", x, 2.6, 0);
      }
      box(2.7, 0.2, 0.18, "#8b929c", 0, 2.35, 0);
      box(2.7, 0.15, 0.18, "#8b929c", 0, 0.2, 0);
      for (let x = -1.05; x <= 1.05; x += 0.35) {
        box(0.09, 2.0, 0.12, "#a5adb7", x, 1.25, 0);
        cone(0.09, 0.2, "#c5a96c", x, 2.35, 0);
      }
      break;

    case "bench":
      box(2.0, 0.16, 0.65, "#98704c", 0, 0.8, 0);
      box(2.0, 0.75, 0.12, "#76543a", 0, 1.2, -0.28);
      for (const x of [-0.78, 0.78]) {
        box(0.12, 0.75, 0.12, "#505965", x, 0.38, 0);
      }
      break;

    case "mailbox":
      cylinder(0.06, 0.08, 1.5, "#505965", 0, 0.75, 0);
      box(0.8, 0.65, 0.55, "#c84f4f", 0, 1.75, 0);
      part(new THREE.SphereGeometry(0.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        "#d96363", 0, 2.05, 0);
      box(0.42, 0.06, 0.025, "#343b48", 0, 1.82, 0.29);
      break;
    case "cube":
      box(1.5, 1.5, 1.5, "#7c6cff", 0, 0.75, 0);
      break;
    case "sphere":
      sphere(0.75, "#7c6cff", 0, 0.75, 0);
      break;
    case "cylinder":
      cylinder(0.7, 0.7, 1.5, "#7c6cff", 0, 0.75, 0);
      break;
    case "cone":
      cone(0.8, 1.5, "#7c6cff", 0, 0.75, 0);
      break;
    case "torus":
      part(new THREE.TorusGeometry(0.7, 0.22, 16, 48), "#7c6cff", 0, 0.9, 0);
      break;
    case "plane":
      part(new THREE.PlaneGeometry(2, 2), "#7c6cff", 0, 0.02, 0, -Math.PI / 2);
      break;
    case "circle":
      part(new THREE.CircleGeometry(1, 48), "#7c6cff", 0, 0.02, 0, -Math.PI / 2);
      break;
    case "ring":
      part(new THREE.RingGeometry(0.55, 1, 48), "#7c6cff", 0, 0.02, 0, -Math.PI / 2);
      break;
    case "capsule":
      part(new THREE.CapsuleGeometry(0.45, 0.8, 8, 16), "#7c6cff", 0, 0.9, 0);
      break;
    case "pyramid":
      part(new THREE.ConeGeometry(0.9, 1.5, 4), "#7c6cff", 0, 0.75, 0, 0, Math.PI / 4);
      break;
    case "icosahedron":
      part(new THREE.IcosahedronGeometry(0.85, 0), "#7c6cff", 0, 0.9, 0);
      break;
    case "torus-knot":
      part(new THREE.TorusKnotGeometry(0.55, 0.18, 100, 12), "#7c6cff", 0, 1, 0);
      break;
    default:
      box(1.5, 1.5, 1.5, "#7c6cff", 0, 0.75, 0);
  }

  const definition = assetCatalog.find(asset => asset.id === assetId);
  group.name = definition?.name ?? "Object";
  group.userData.objectType = definition?.name ?? "Object";
  group.userData.assetId = assetId;
  return group;
}

function renderAssetLibrary(): void {
  const grid = document.querySelector<HTMLDivElement>("#asset-grid")!;
  const search = document.querySelector<HTMLInputElement>("#asset-search")!.value
    .trim().toLowerCase();
  const category = document.querySelector<HTMLSelectElement>("#asset-category")!.value;

  const filtered = assetCatalog.filter(asset =>
    (category === "all" || asset.category === category) &&
    (asset.name.toLowerCase().includes(search) ||
      asset.category.toLowerCase().includes(search))
  );

  grid.replaceChildren();

  for (const asset of filtered) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "asset-card";

    const icon = document.createElement("span");
    icon.className = "asset-card-icon";
    icon.textContent = asset.icon;

    const name = document.createElement("span");
    name.className = "asset-card-name";
    name.textContent = asset.name;

    const categoryLabel = document.createElement("span");
    categoryLabel.className = "asset-card-category";
    categoryLabel.textContent = asset.category;

    button.append(icon, name, categoryLabel);
    button.addEventListener("click", () => {
      addAssetToScene(asset.id);
      document.querySelector<HTMLDialogElement>("#asset-dialog")!.close();
    });

    grid.append(button);
  }

  document.querySelector("#asset-count")!.textContent =
    `${filtered.length} ASSETS`;
  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "asset-empty";
    empty.textContent = "No assets found.";
    grid.append(empty);
  }
}

function addAssetToScene(assetId: string): void {
  const group = createAsset(assetId);
  const definition = assetCatalog.find(asset => asset.id === assetId);

  group.name = `${definition?.name ?? "Object"} ${nextObjectId}`;
  group.userData.editorId = nextObjectId++;
  group.position.set(
    (Math.random() - 0.5) * 3,
    0,
    (Math.random() - 0.5) * 3
  );

  scene.add(group);
  editableObjects.push(group);
  selectObject(group);
  renderObjectList();
}

function addObject(
  type: "Cube" | "Sphere" | "Plane",
  initial = false
): void {
  const group = createAsset(type.toLowerCase());
  group.name = `${type} ${nextObjectId}`;
  group.userData.editorId = nextObjectId++;
  group.position.set(
    initial ? 0 : (Math.random() - 0.5) * 3,
    0,
    initial ? 0 : (Math.random() - 0.5) * 3
  );

  scene.add(group);
  editableObjects.push(group);
  selectObject(group);
  renderObjectList();
}
function selectObject(group: THREE.Group | null): void {
  selected = group;

  if (group) {
    transform.attach(group);
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

function getSelectedMaterials(): THREE.MeshStandardMaterial[] {
  if (!selected) return [];

  const materials = new Set<THREE.MeshStandardMaterial>();

  selected.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;

    const list = Array.isArray(object.material)
      ? object.material
      : [object.material];

    for (const material of list) {
      if (material instanceof THREE.MeshStandardMaterial) {
        materials.add(material);
      }
    }
  });

  return [...materials];
}

function updateMaterialInspector(): void {
  const materials = getSelectedMaterials();
  if (!materials.length) return;

  const material = materials[0];

  const color = "#" + material.color.getHexString();
  document.querySelector<HTMLInputElement>("#mat-color")!.value = color;
  document.querySelector<HTMLInputElement>("#mat-hex")!.value = color.toUpperCase();

  document.querySelector<HTMLInputElement>("#mat-roughness")!.value =
    String(material.roughness);
  document.querySelector("#mat-roughness-value")!.textContent =
    material.roughness.toFixed(2);

  document.querySelector<HTMLInputElement>("#mat-metalness")!.value =
    String(material.metalness);
  document.querySelector("#mat-metalness-value")!.textContent =
    material.metalness.toFixed(2);

  document.querySelector<HTMLInputElement>("#mat-opacity")!.value =
    String(material.opacity);
  document.querySelector("#mat-opacity-value")!.textContent =
    material.opacity.toFixed(2);

  document.querySelector<HTMLInputElement>("#mat-wireframe")!.checked =
    material.wireframe;

  document.querySelector<HTMLInputElement>("#mat-emissive")!.value =
    "#" + material.emissive.getHexString();
}

function updateSelectedMaterials(
  update: (material: THREE.MeshStandardMaterial) => void
): void {
  for (const material of getSelectedMaterials()) {
    update(material);
    material.needsUpdate = true;
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

  updateMaterialInspector();
}

function deleteSelected(): void {
  if (!selected) return;

  const target = selected;
  selectObject(null);
  scene.remove(target);

  target.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;

    object.geometry.dispose();

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    materials.forEach(material => material.dispose());
  });

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
  renderAssetLibrary();
  document.querySelector<HTMLDialogElement>("#asset-dialog")!.showModal();
});

document.querySelector<HTMLButtonElement>("#close-assets")!.addEventListener("click", () => {
  document.querySelector<HTMLDialogElement>("#asset-dialog")!.close();
});

document.querySelector<HTMLInputElement>("#asset-search")!.addEventListener("input", renderAssetLibrary);
document.querySelector<HTMLSelectElement>("#asset-category")!.addEventListener("change", renderAssetLibrary);
document.querySelector<HTMLInputElement>("#object-name")!.addEventListener("change", event => {
  if (!selected) return;
  const value = (event.currentTarget as HTMLInputElement).value.trim();
  if (value) selected.name = value;
  renderObjectList();
});

/* KBVERSE MATERIAL EVENTS FIX */
const matColor = document.querySelector<HTMLInputElement>("#mat-color")!;
const matHex = document.querySelector<HTMLInputElement>("#mat-hex")!;
const matRoughness = document.querySelector<HTMLInputElement>("#mat-roughness")!;
const matMetalness = document.querySelector<HTMLInputElement>("#mat-metalness")!;
const matOpacity = document.querySelector<HTMLInputElement>("#mat-opacity")!;
const matEmissive = document.querySelector<HTMLInputElement>("#mat-emissive")!;
const matWireframe = document.querySelector<HTMLInputElement>("#mat-wireframe")!;

function applyMaterialColor(value: string): void {
    updateSelectedMaterials(material => material.color.set(value));
    matColor.value = value;
    matHex.value = value.toUpperCase();
}

matColor.addEventListener("input", () => {
    applyMaterialColor(matColor.value);
});

matHex.addEventListener("input", () => {
    const value = matHex.value.trim();
    if (!/^#?[0-9a-fA-F]{6}$/.test(value)) return;
    applyMaterialColor(value.startsWith("#") ? value : `#${value}`);
});

document.querySelectorAll<HTMLButtonElement>("[data-material-color]")
    .forEach(button => {
        button.addEventListener("click", () => {
            const color = button.dataset.materialColor;
            if (color) applyMaterialColor(color);
        });
    });

matRoughness.addEventListener("input", () => {
    const value = Number(matRoughness.value);
    updateSelectedMaterials(material => material.roughness = value);
    document.querySelector("#mat-roughness-value")!.textContent = value.toFixed(2);
});

matMetalness.addEventListener("input", () => {
    const value = Number(matMetalness.value);
    updateSelectedMaterials(material => material.metalness = value);
    document.querySelector("#mat-metalness-value")!.textContent = value.toFixed(2);
});

matOpacity.addEventListener("input", () => {
    const value = Number(matOpacity.value);
    updateSelectedMaterials(material => {
        material.opacity = value;
        material.transparent = value < 1;
    });
    document.querySelector("#mat-opacity-value")!.textContent = value.toFixed(2);
});

matEmissive.addEventListener("input", () => {
    updateSelectedMaterials(material => material.emissive.set(matEmissive.value));
});

matWireframe.addEventListener("change", () => {
    updateSelectedMaterials(material => material.wireframe = matWireframe.checked);
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
  const hits = raycaster.intersectObjects(editableObjects, true);

  let target: THREE.Object3D | null =
    hits.length ? hits[0].object : null;

  while (target && !editableObjects.includes(target as THREE.Group)) {
    target = target.parent;
  }

  selectObject(target as THREE.Group | null);
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




// KBVERSE WORLD SAVE SYSTEM
let worldName = "Untitled World";

function saveWorld(): void {
    const payload = {
        app: "KBVERSE",
        version: 1,
        name: worldName.trim() || "Untitled World",
        savedAt: new Date().toISOString(),
        objects: editableObjects.map((object) => object.toJSON())
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kbverse-world.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    status.textContent = `Saved ${editableObjects.length} objects`;
}

function loadWorldFile(file: File): void {
    const reader = new FileReader();

    reader.onload = () => {
        try {
            const payload = JSON.parse(String(reader.result)) as {
                app?: string;
                version?: number;
                name?: string;
                objects?: unknown[];
            };

            if (!Array.isArray(payload.objects)) {
                throw new Error("File không có danh sách objects hợp lệ.");
            }
            worldName = typeof payload.name === "string" && payload.name.trim()
                ? payload.name.trim().slice(0, 48)
                : "Untitled World";

            const worldNameInput = document.querySelector<HTMLInputElement>("#world-name");
            if (worldNameInput) worldNameInput.value = worldName;
            document.title = `${worldName} | KBVERSE`;

            const loader = new THREE.ObjectLoader();

            for (const oldObject of editableObjects) {
                scene.remove(oldObject);
                oldObject.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.geometry.dispose();
                        const materials = Array.isArray(child.material)
                            ? child.material
                            : [child.material];
                        for (const material of materials) material.dispose();
                    }
                });
            }

            editableObjects.splice(0, editableObjects.length);

            for (const objectData of payload.objects) {
                const loadedObject = loader.parse(objectData as object);
                let group: THREE.Group;

                if (loadedObject instanceof THREE.Group) {
                    group = loadedObject;
                } else {
                    group = new THREE.Group();
                    group.add(loadedObject);
                }

                scene.add(group);
                editableObjects.push(group);
            }

            selectObject(null);
            renderObjectList();
            updateInspector();
            nextObjectId = editableObjects.length + 1;
            status.textContent = `Loaded ${editableObjects.length} objects`;
        } catch (error) {
            console.error("KBVERSE world load failed:", error);
            status.textContent = "Could not load world file";
            alert(error instanceof Error ? error.message : "File world không hợp lệ.");
        }
    };

    reader.onerror = () => {
        status.textContent = "Could not read world file";
    };

    reader.readAsText(file);
}

function installWorldSaveControls(): void {
    const panel = document.createElement("div");
    panel.id = "kbverse-world-controls";

    Object.assign(panel.style, {
        position: "absolute",
        top: "12px",
        left: "12px",
        zIndex: "20",
        display: "flex",
        gap: "8px",
        padding: "8px",
        borderRadius: "10px",
        background: "rgba(15, 18, 32, 0.92)",
        border: "1px solid #343b55",
        backdropFilter: "blur(10px)"
    });

    const makeButton = (label: string): HTMLButtonElement => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;

        Object.assign(button.style, {
            padding: "8px 12px",
            border: "1px solid #46506e",
            borderRadius: "7px",
            background: "#222a42",
            color: "#f4f6ff",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "600"
        });

        button.addEventListener("mouseenter", () => {
            button.style.background = "#354366";
        });

        button.addEventListener("mouseleave", () => {
            button.style.background = "#222a42";
        });

        return button;
    };

    const saveButton = makeButton("Save World");
    const loadButton = makeButton("Load World");
    const fileInput = document.createElement("input");

    fileInput.type = "file";
    fileInput.accept = ".json,application/json";
    fileInput.style.display = "none";

    saveButton.addEventListener("click", saveWorld);
    loadButton.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        if (file) loadWorldFile(file);
        fileInput.value = "";
    });

    panel.append(saveButton, loadButton, fileInput);
    container.appendChild(panel);
}

installWorldSaveControls();

const worldNameInput = document.querySelector<HTMLInputElement>("#world-name")!;

worldNameInput.addEventListener("input", () => {
    worldName = worldNameInput.value.slice(0, 48).trim() || "Untitled World";
    document.title = `${worldName} | KBVERSE`;
});

worldNameInput.addEventListener("change", () => {
    worldNameInput.value = worldName;
});


// KBVERSE GLB IMPORT EXPORT
function installGltfControls(): void {
    const panel = document.getElementById("kbverse-world-controls");

    if (!panel) {
        console.error("KBVERSE world controls not found.");
        return;
    }

    const createButton = (label: string): HTMLButtonElement => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;

        Object.assign(button.style, {
            padding: "8px 12px",
            border: "1px solid #46506e",
            borderRadius: "7px",
            background: "#222a42",
            color: "#f4f6ff",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "600"
        });

        button.addEventListener("mouseenter", () => {
            button.style.background = "#354366";
        });

        button.addEventListener("mouseleave", () => {
            button.style.background = "#222a42";
        });

        return button;
    };

    const importButton = createButton("Import GLB");
    const exportButton = createButton("Export GLB");
    const fileInput = document.createElement("input");

    fileInput.type = "file";
    fileInput.accept = ".glb,model/gltf-binary";
    fileInput.style.display = "none";

    importButton.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", () => {
        const file = fileInput.files?.[0];

        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {
            if (!(reader.result instanceof ArrayBuffer)) {
                status.textContent = "Invalid GLB file";
                return;
            }

            const loader = new GLTFLoader();

            loader.parse(
                reader.result,
                "",
                (gltf) => {
                    const group = new THREE.Group();
                    group.name = `Imported Model ${nextObjectId++}`;
                    group.add(gltf.scene);

                    scene.add(group);
                    editableObjects.push(group);

                    selectObject(group);
                    renderObjectList();
                    updateInspector();

                    status.textContent = `Imported ${file.name}`;
                },
                (error) => {
                    console.error("GLB import failed:", error);
                    status.textContent = "GLB import failed";
                }
            );
        };

        reader.onerror = () => {
            status.textContent = "Could not read GLB file";
        };

        reader.readAsArrayBuffer(file);
        fileInput.value = "";
    });

    exportButton.addEventListener("click", async () => {
        try {
            const exportRoot = new THREE.Group();
            exportRoot.name = "KBVERSE World";

            for (const object of editableObjects) {
                exportRoot.add(object.clone(true));
            }

            const exporter = new GLTFExporter();

            const result = await exporter.parseAsync(exportRoot, {
                binary: true,
                onlyVisible: true
            });

            if (!(result instanceof ArrayBuffer)) {
                throw new Error("Exporter did not return binary GLB data.");
            }

            const blob = new Blob([result], {
                type: "model/gltf-binary"
            });

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = "kbverse-world.glb";

            document.body.appendChild(link);
            link.click();
            link.remove();

            URL.revokeObjectURL(url);

            status.textContent = `Exported ${editableObjects.length} objects`;
        } catch (error) {
            console.error("GLB export failed:", error);
            status.textContent = "GLB export failed";
        }
    });

    panel.append(importButton, exportButton, fileInput);
}

installGltfControls();

