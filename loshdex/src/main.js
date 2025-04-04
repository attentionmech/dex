import {
  Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder,
  StandardMaterial, Color3, GlowLayer
} from "@babylonjs/core";

import "@babylonjs/loaders";

const canvas = document.getElementById("renderCanvas");
const engine = new Engine(canvas, true);
const scene = new Scene(engine);
scene.clearColor = new Color3(0, 0, 0); // Pitch black background

// Camera setup
let camera = new ArcRotateCamera("Camera", Math.PI / 3, Math.PI / 3, 100, Vector3.Zero() , scene);
camera.attachControl(canvas, true);

// Lighting
const light1 = new HemisphericLight("light1", new Vector3(1, 1, 0), scene);
const light2 = new HemisphericLight("light2", new Vector3(-1, -1, 0), scene);

// Glow effect
const glow = new GlowLayer("glow", scene);
glow.intensity = 0.8; // Adjust for stronger glow

// Adjustable gap
let gapMultiplier = 2.2; // You can change this value to control spacing

// Fetch model data
let modelData = {};
async function loadModelData() {
  try {
    const response = await fetch("/model_info.json");
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    modelData = await response.json();
    console.log("Loaded model data:", modelData);
    setupUI();
  } catch (error) {
    console.error("Error loading JSON:", error);
  }
}

// Extract clean layer name and assign unique colors
function cleanLayerName(name) {
  return name.replace(/\.\d+\./g, ".");
}

const layerColorMap = {};
function getLayerColor(name) {
  if (!layerColorMap[name]) {
    const hue = Object.keys(layerColorMap).length * 40 % 360; // Cycle through hues
    layerColorMap[name] = Color3.FromHSV(hue / 360, hue/180, hue/90); // Fully saturated and bright
  }
  return layerColorMap[name];
}

// Generate Model Disks
function generateModelDisks(layers) {
  const sizes = layers.map(l => l.numel);
  const minSize = 1, maxSize = 4;
  const min = Math.min(...sizes.map(Math.log));
  const max = Math.max(...sizes.map(Math.log));

  let z = 0;
  let meshes = [];
  
  layers.forEach((layer, i) => {
    const cleanName = cleanLayerName(layer.name);
    const size = minSize + ((Math.log(layer.numel) - min) / (max - min)) * (maxSize - minSize);
    
    const mat = new StandardMaterial(`mat_${i}`, scene);
    mat.diffuseColor = getLayerColor(cleanName);
    mat.emissiveColor = mat.diffuseColor.scale(1.5); // Make cubes glow
    console.log(`Layer: ${cleanName}, Color:`, mat.diffuseColor);
    
    const disk = MeshBuilder.CreateBox(`disk_${i}`, { width: size, height: size, depth: 4 }, scene); // Thin depth
    disk.position = new Vector3(0, z, 0);
    disk.material = mat;
    meshes.push(disk);
    
    z += size * gapMultiplier; // Controlled gap
  });
  
  return meshes;
}

// Scene management
let currentMeshes = [];
function clearScene() {
  currentMeshes.forEach(m => m.dispose());
  currentMeshes = [];
}

function renderModel(name) {
  if (!modelData[name]) return;
  clearScene();
  currentMeshes = generateModelDisks(modelData[name]);
}

// UI Setup
function setupUI() {
  const modelSelect = document.getElementById("modelSelect");
  modelSelect.innerHTML = "";

  Object.keys(modelData).forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    modelSelect.appendChild(opt);
  });

  modelSelect.addEventListener("change", () => renderModel(modelSelect.value));

  if (Object.keys(modelData).length > 0) {
    renderModel(Object.keys(modelData)[0]);
  }
}

// Initialize everything
loadModelData();
engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());
