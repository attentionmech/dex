import {
  Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder,
  StandardMaterial, Color3, GlowLayer
} from "@babylonjs/core";

import "@babylonjs/loaders";

// Configuration Parameters (Adjust these values)
// Replace your CONFIG with this
const CONFIG = {
  // BACKGROUND_COLOR: Defines the scene's background color using RGB values (0 to 1 range).
  // - 0.1, 0.1, 0.1 creates a dark gray background, providing contrast for colorful disks.
  // - Adjust this to change the overall scene ambiance (e.g., 0, 0, 0 for black, 1, 1, 1 for white).
  BACKGROUND_COLOR: new Color3(0.1, 0.1, 0.1),

  // CAMERA_ALPHA: Sets the camera's horizontal rotation angle in radians.
  // - Math.PI / 4 = 45 degrees, positions the camera to the right of the target.
  // - Controls the initial side-to-side viewpoint; increase to rotate further right, decrease for left.
  CAMERA_ALPHA: Math.PI / 4,

  // CAMERA_BETA: Sets the camera's vertical rotation angle	In radians.
  // - Math.PI / 3 = 60 degrees up from the horizon, gives a slightly elevated view.
  // - Adjust to look more down (closer to 0) or up (closer to Math.PI/2).
  CAMERA_BETA: Math.PI / 3,

  // CAMERA_RADIUS: Defines the initial distance of the camera from its target in scene units.
  // - 3500 units means the camera is far enough to see a large model.
  // - Increase for bigger models or a wider view, decrease to zoom in.
  CAMERA_RADIUS: 4000,

  // CAMERA_TARGET: Specifies the point (x, y, z) the camera looks at initially.
  // - Vector3(0, 0, 0) targets the scene's origin, centering the view initially.
  // - Later adjusted dynamically to center on the model; change this to shift the initial focus.
  CAMERA_TARGET: new Vector3(0, 0, 0),

  // LIGHT1_POSITION: Position of the first hemispheric light source in 3D space (x, y, z).
  // - Vector3(1000, 1000, 0) places it high and to the right-front, illuminating from above.
  // - Adjust coordinates to change lighting direction; affects shadows and highlights.
  // LIGHT1_POSITION: new Vector3(1000, 1000, 0),

  // LIGHT2_POSITION: Position of the second hemispheric light source in 3D space (x, y, z).
  // - Vector3(-1000, -1000, 0) places it low and to the left-back, balancing the first light.
  // - Modify to alter light distribution; two lights reduce harsh shadows.
  // LIGHT2_POSITION: new Vector3(-1000, -1000, 0),

  // DISK_MIN_SIZE: Minimum size (width/height) of a disk in scene units.
  // - 100 units sets the smallest visual representation for the smallest data layer.
  // - Increase to make all disks larger, decrease for finer detail.
  DISK_MIN_SIZE: 100,

  // DISK_MAX_SIZE: Maximum size (width/height) of a disk in scene units.
  // - 600 units sets the largest visual representation for the biggest data layer.
  // - Adjust with DISK_MIN_SIZE to control the size range; affects scaling perception.
  DISK_MAX_SIZE: 800,

  // DISK_THICKNESS: Thickness of each disk along the stacking axis in scene units.
  // - 20 units makes disks thin (X-axis for horizontal, Y-axis for vertical).
  // - Increase for thicker disks, decrease for flatter ones; impacts spacing too.
  DISK_THICKNESS: 50,

  // GLOW_INTENSITY: Strength of the glow effect applied to disks (0 to 1+ range).
  // - 0.5 gives a moderate glow, enhancing visual appeal without overpowering.
  // - Higher values (e.g., 1 or 2) intensify the glow, lower (e.g., 0) dims it.
  GLOW_INTENSITY: 0.3,

  // COLOR_EMISSIVE_MULTIPLIERS: Multiplier for the emissive color of disk materials.
  // - 8 times the diffuse color makes disks appear bright and self-lit.
  // - Increase for brighter glow, decrease for subtler lighting; tied to RAINBOW_COLORS.
  COLOR_EMISSIVE_MULTIPLIERS: 4,

  // DISK_SPACING_MULTIPLIER: Scales the gap between disks relative to DISK_THICKNESS.
  // - 1.5 means spacing is 1.5 * DISK_THICKNESS (e.g., 20 * 1.5 = 30 units apart).
  // - Increase for more separation, decrease to pack disks closer together.
  DISK_SPACING_MULTIPLIER: 1.7,

  // STARTING_Y_POSITION: Initial Y-coordinate for the first disk when stacking vertically.
  // - 0 starts at the origin; disks stack upward if MODEL_DIRECTION is 'vertical'.
  // - Change to 100 to start 100 units up, or -100 to start below origin.
  STARTING_Y_POSITION: 0,

  // STARTING_X_POSITION: Initial X-coordinate for the first disk when stacking horizontally.
  // - 0 starts at the origin; disks stack rightward if MODEL
}
// Rest of your code remains unchanged...

// Predefined list of 30 distinct rainbow colors
const RAINBOW_COLORS = {
  'Red': new Color3(1, 0, 0),
  'Orange': new Color3(1, 0.5, 0),
  'Yellow': new Color3(1, 1, 0),
  'Lime': new Color3(0.5, 1, 0),
  'Green': new Color3(0, 1, 0),
  'Emerald': new Color3(0, 1, 0.5),
  'Cyan': new Color3(0, 1, 1),
  'SkyBlue': new Color3(0, 0.5, 1),
  'Blue': new Color3(0, 0, 1),
  'Indigo': new Color3(0.5, 0, 1),
  'Violet': new Color3(1, 0, 1),
  'Magenta': new Color3(1, 0, 0.5),
  'Pink': new Color3(1, 0.5, 0.5),
  'Coral': new Color3(1, 0.5, 0.3),
  'Salmon': new Color3(1, 0.6, 0.5),
  'Gold': new Color3(1, 0.8, 0),
  'Olive': new Color3(0.5, 0.5, 0),
  'Teal': new Color3(0, 0.5, 0.5),
  'Turquoise': new Color3(0, 1, 0.8),
  'Lavender': new Color3(0.8, 0.8, 1),
  'Plum': new Color3(0.5, 0, 0.5),
  'Maroon': new Color3(0.5, 0, 0),
  'Crimson': new Color3(0.8, 0, 0.2),
  'Peach': new Color3(1, 0.8, 0.6),
  'Mint': new Color3(0.6, 1, 0.8),
  'Azure': new Color3(0.5, 0.8, 1),
  'Amber': new Color3(1, 0.7, 0.2),
  'Lilac': new Color3(0.8, 0.6, 1),
  'Rose': new Color3(1, 0.4, 0.7),
  'Gray': new Color3(0.5, 0.5, 0.5)
};

// DOM Elements
const renderCanvas = document.getElementById("renderCanvas");

// Scene Setup
const renderingEngine = new Engine(renderCanvas, true);
const currentScene = new Scene(renderingEngine);
currentScene.clearColor = CONFIG.BACKGROUND_COLOR;


// Camera setup
const mainCamera = new ArcRotateCamera(
  "mainCamera", 
  CONFIG.CAMERA_ALPHA, 
  CONFIG.CAMERA_BETA, 
  CONFIG.CAMERA_RADIUS, 
  CONFIG.CAMERA_TARGET, 
  currentScene
);
mainCamera.attachControl(renderCanvas, true);

// Add these lines to adjust clipping planes
mainCamera.minZ = 1;        // Near plane (default is 1, can lower if needed)
mainCamera.maxZ = 200000;    // Far plane (default is 10000, increase for larger scenes)

// Camera
// const mainCamera = new ArcRotateCamera(
//   "mainCamera", 
//   CONFIG.CAMERA_ALPHA, 
//   CONFIG.CAMERA_BETA, 
//   CONFIG.CAMERA_RADIUS, 
//   CONFIG.CAMERA_TARGET, 
//   currentScene
// );
// mainCamera.attachControl(renderCanvas, true);

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
    const colorNames = Object.keys(RAINBOW_COLORS);
    const colorCount = Object.keys(layerColorAssignments).length;
    layerColorAssignments[layerName] = 
      colorCount >= colorNames.length - 1 
        ? RAINBOW_COLORS['Gray']
        : RAINBOW_COLORS[colorNames[colorCount]];
  }
  return layerColorAssignments[layerName];
}

// Disk Generation
function createModelDisks(layerData) {
  const layerSizes = layerData.map(layer => layer.numel);
  const logMinSize = Math.min(...layerSizes.map(Math.log));
  const logMaxSize = Math.max(...layerSizes.map(Math.log));
  
  let currentYPosition = CONFIG.STARTING_Y_POSITION;
  let currentXPosition = CONFIG.STARTING_X_POSITION;
  const diskMeshes = [];
  
  layerData.forEach((layer, index) => {
    const layerCleanName = getCleanLayerName(layer.name);
    
    // Calculate tile size based on numel (square tiles)
    const tileSize = CONFIG.DISK_MIN_SIZE + 
      ((Math.log(layer.numel) - logMinSize) / (logMaxSize - logMinSize)) * 
      (CONFIG.DISK_MAX_SIZE - CONFIG.DISK_MIN_SIZE);
    
    const diskMaterial = new StandardMaterial(`material_layer_${index}`, currentScene);
    diskMaterial.diffuseColor = assignLayerColor(layerCleanName);
    diskMaterial.emissiveColor = diskMaterial.diffuseColor.scale(CONFIG.COLOR_EMISSIVE_MULTIPLIERS);
    
    console.log(`Layer: ${layerCleanName}, Tile Size: ${tileSize}`);
    
    // Define dimensions based on MODEL_DIRECTION
    let boxOptions;
    if (CONFIG.MODEL_DIRECTION === 'horizontal') {
      boxOptions = {
        width: CONFIG.DISK_THICKNESS, // Thickness along X-axis
        height: tileSize,             // Square dimension
        depth: tileSize               // Square dimension
      };
    } else { // vertical
      boxOptions = {
        width: tileSize,              // Square dimension
        height: CONFIG.DISK_THICKNESS,// Thickness along Y-axis
        depth: tileSize               // Square dimension
      };
    }
    
    const diskMesh = MeshBuilder.CreateBox(
      `disk_layer_${index}`, 
      boxOptions, 
      currentScene
    );
    
    // Position based on MODEL_DIRECTION
    if (CONFIG.MODEL_DIRECTION === 'horizontal') {
      diskMesh.position = new Vector3(currentXPosition, 0, 0);
      currentXPosition += CONFIG.DISK_THICKNESS * CONFIG.DISK_SPACING_MULTIPLIER;
    } else { // vertical
      diskMesh.position = new Vector3(0, currentYPosition, 0);
      currentYPosition += CONFIG.DISK_THICKNESS * CONFIG.DISK_SPACING_MULTIPLIER;
    }
    
    diskMesh.material = diskMaterial;
    diskMeshes.push(diskMesh);
  });
  
  // Adjust camera target based on direction
  if (CONFIG.MODEL_DIRECTION === 'horizontal') {
    mainCamera.target = new Vector3(currentXPosition / 2, 0, 0);
    mainCamera.radius = currentXPosition * 1.5;
  } else {
    mainCamera.target = new Vector3(0, currentYPosition / 2, 0);
    mainCamera.radius = currentYPosition * 1.5;
  }
  
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