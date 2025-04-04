import {
  Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder,
  StandardMaterial, Color3, GlowLayer
} from "@babylonjs/core";

import "@babylonjs/loaders";

// Configuration Parameters (Adjust these values)
const CONFIG = {
  // Scene
  BACKGROUND_COLOR: new Color3(0.1, 0.1, 0.1),  // Pitch black
  
  // Camera
  CAMERA_ALPHA: Math.PI / 3,
  CAMERA_BETA: Math.PI / 3,
  CAMERA_RADIUS: 400,
  CAMERA_TARGET: new Vector3(0,300,0),// how to change this
  
  // Lighting
  LIGHT1_POSITION: new Vector3(1, 1, 0),
  LIGHT2_POSITION: new Vector3(-1, -1, 0),
  
  // Disk Appearance
  DISK_MIN_SIZE: 1,
  DISK_MAX_SIZE: 4,
  DISK_DEPTH: 20,
  GLOW_INTENSITY: 0.3,
  COLOR_EMISSIVE_MULTIPLIERS: 20,
  
  // Positioning
  DISK_SPACING_MULTIPLIER: 1.5,
  STARTING_Y_POSITION: 200
};

// DOM Elements
const renderCanvas = document.getElementById("renderCanvas");

// Scene Setup
const renderingEngine = new Engine(renderCanvas, true);
const currentScene = new Scene(renderingEngine);
currentScene.clearColor = CONFIG.BACKGROUND_COLOR;

// Camera
const mainCamera = new ArcRotateCamera(
  "mainCamera", 
  CONFIG.CAMERA_ALPHA, 
  CONFIG.CAMERA_BETA, 
  CONFIG.CAMERA_RADIUS, 
  CONFIG.CAMERA_TARGET, 
  currentScene
);
mainCamera.attachControl(renderCanvas, true);

// Lighting
const upperLight = new HemisphericLight("upperLight", CONFIG.LIGHT1_POSITION, currentScene);
const lowerLight = new HemisphericLight("lowerLight", CONFIG.LIGHT2_POSITION, currentScene);

// Effects
const glowEffect = new GlowLayer("glowEffect", currentScene);
glowEffect.intensity = CONFIG.GLOW_INTENSITY;

// Data
let modelInformation = {};

// Load model data
async function loadModelInformation() {
  try {
    const response = await fetch("/model_info.json");
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    modelInformation = await response.json();
    console.log("Loaded model information:", modelInformation);
    initializeUserInterface();
  } catch (error) {
    console.error("Error loading JSON:", error);
  }
}

// Color Management
const layerColorAssignments = {};
function getCleanLayerName(originalName) {
  return originalName.replace(/\.\d+\./g, ".");
}

function assignLayerColor(layerName) {
  if (!layerColorAssignments[layerName]) {
    const colorCount = Object.keys(layerColorAssignments).length;
    const hue = colorCount * 40 % 360;
    layerColorAssignments[layerName] = Color3.FromHSV(hue / 360, hue/180, hue/90);
  }
  return layerColorAssignments[layerName];
}

// Disk Generation
function createModelDisks(layerData) {
  const layerSizes = layerData.map(layer => layer.numel);
  const logMinSize = Math.min(...layerSizes.map(Math.log));
  const logMaxSize = Math.max(...layerSizes.map(Math.log));
  
  let currentYPosition = CONFIG.STARTING_Y_POSITION;
  const diskMeshes = [];
  
  layerData.forEach((layer, index) => {
    const layerCleanName = getCleanLayerName(layer.name);
    const diskSize = CONFIG.DISK_MIN_SIZE + 
      ((Math.log(layer.numel) - logMinSize) / (logMaxSize - logMinSize)) * 
      (CONFIG.DISK_MAX_SIZE - CONFIG.DISK_MIN_SIZE);
    
    const diskMaterial = new StandardMaterial(`material_layer_${index}`, currentScene);
    diskMaterial.diffuseColor = assignLayerColor(layerCleanName);
    diskMaterial.emissiveColor = diskMaterial.diffuseColor.scale(CONFIG.COLOR_EMISSIVE_MULTIPLIERS);
    
    console.log(`Layer: ${layerCleanName}, Color:`, diskMaterial.diffuseColor);
    
    const diskMesh = MeshBuilder.CreateBox(
      `disk_layer_${index}`, 
      { width: diskSize, height: diskSize, depth: CONFIG.DISK_DEPTH }, 
      currentScene
    );
    
    // Position control - only changes Y coordinate
    diskMesh.position = new Vector3(0, currentYPosition, 0);
    diskMesh.material = diskMaterial;
    diskMeshes.push(diskMesh);
    
    currentYPosition += diskSize * CONFIG.DISK_SPACING_MULTIPLIER;
  });
  
  return diskMeshes;
}

// Scene Management
let activeDiskMeshes = [];
function clearCurrentScene() {
  activeDiskMeshes.forEach(mesh => mesh.dispose());
  activeDiskMeshes = [];
}

function renderModelVisualization(modelName) {
  if (!modelInformation[modelName]) return;
  clearCurrentScene();
  activeDiskMeshes = createModelDisks(modelInformation[modelName]);
}

// UI
function initializeUserInterface() {
  const modelSelector = document.getElementById("modelSelect");
  modelSelector.innerHTML = "";

  Object.keys(modelInformation).forEach(modelName => {
    const option = document.createElement("option");
    option.value = modelName;
    option.textContent = modelName;
    modelSelector.appendChild(option);
  });

  modelSelector.addEventListener("change", () => renderModelVisualization(modelSelector.value));

  if (Object.keys(modelInformation).length > 0) {
    renderModelVisualization(Object.keys(modelInformation)[0]);
  }
}

// Initialization
loadModelInformation();
renderingEngine.runRenderLoop(() => currentScene.render());
window.addEventListener("resize", () => renderingEngine.resize());