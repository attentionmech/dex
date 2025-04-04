import { StandardMaterial, MeshBuilder, Vector3, ActionManager, ExecuteCodeAction } from "@babylonjs/core";
import { CONFIG } from "../commons/Configs";
import { RAINBOW_COLORS } from "../commons/Constants";

export class SceneManager {
  constructor(scene, cameraManager, panelText) {
    this.scene = scene;
    this.cameraManager = cameraManager;
    this.panelText = panelText;
    this.layerColorAssignments = {};
    this.activeDisks = [];
    this.modelData = {};
  }

  async loadModelData() {
    try {
      const response = await fetch("/model_info.json");
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      console.log("Loaded model information:", data);
      this.modelData = data;
      return data;
    } catch (error) {
      console.error("Error loading JSON:", error);
      this.modelData = {};
      return {};
    }
  }

  getCleanLayerName(originalName) {
    return originalName.replace(/\.\d+\./g, ".");
  }

  assignLayerColor(layerName) {
    if (!this.layerColorAssignments[layerName]) {
      const colorNames = Object.keys(RAINBOW_COLORS);
      const colorCount = Object.keys(this.layerColorAssignments).length;
      this.layerColorAssignments[layerName] =
        colorCount >= colorNames.length - 1
          ? RAINBOW_COLORS['Gray']
          : RAINBOW_COLORS[colorNames[colorCount]];
    }
    return this.layerColorAssignments[layerName];
  }

  createDisks(layerData) {    

    const layerSizes = layerData.map(layer => layer.numel);
    const logMinSize = Math.min(...layerSizes.map(Math.log));
    const logMaxSize = Math.max(...layerSizes.map(Math.log));
    let currentYPosition = CONFIG.STARTING_Y_POSITION;
    let currentXPosition = 0;
    const disks = [];

    layerData.forEach((layer, index) => {
      const layerCleanName = this.getCleanLayerName(layer.name);
      const tileSize = CONFIG.DISK_MIN_SIZE +
        ((Math.log(layer.numel) - logMinSize) / (logMaxSize - logMinSize)) *
        (CONFIG.DISK_MAX_SIZE - CONFIG.DISK_MIN_SIZE);

      const material = new StandardMaterial(`material_layer_${index}`, this.scene);
      material.diffuseColor = this.assignLayerColor(layerCleanName);
      material.emissiveColor = material.diffuseColor.scale(CONFIG.COLOR_EMISSIVE_MULTIPLIERS);

      const boxOptions = CONFIG.MODEL_DIRECTION === 'horizontal'
        ? { width: CONFIG.DISK_THICKNESS, height: tileSize, depth: tileSize }
        : { width: tileSize, height: CONFIG.DISK_THICKNESS, depth: tileSize };

      const disk = MeshBuilder.CreateBox(`disk_layer_${index}`, boxOptions, this.scene);
      disk.position = CONFIG.MODEL_DIRECTION === 'horizontal'
        ? new Vector3(currentXPosition, 0, 0)
        : new Vector3(0, currentYPosition, 0);

      if (CONFIG.MODEL_DIRECTION === 'horizontal') {
        currentXPosition += CONFIG.DISK_THICKNESS * CONFIG.DISK_SPACING_MULTIPLIER;
      } else {
        currentYPosition += CONFIG.DISK_THICKNESS * CONFIG.DISK_SPACING_MULTIPLIER;
      }

      disk.material = material;
      disk.actionManager = new ActionManager(this.scene);
      disk.actionManager.registerAction(

        new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
          this.cameraManager.updateTargetAndRadius(disk.position, CONFIG.DISK_MAX_SIZE);
          this.cameraManager.setMode("default");
        })
      );
      disk.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
          this.panelText.text = `Name: ${layer.name}\nShape: ${JSON.stringify(layer.shape)}\nParams: ${layer.numel.toLocaleString()}`;
        })
      );
      disk.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
          this.panelText.text = "loshdex";
        })
      );
  

      disks.push(disk);
    });

    const extent = CONFIG.MODEL_DIRECTION === 'horizontal' ? currentXPosition : currentYPosition;
    const target = CONFIG.MODEL_DIRECTION === 'horizontal'
      ? new Vector3(currentXPosition / 2, 0, 0)
      : new Vector3(0, currentYPosition / 2, 0);

    return { disks, target, extent };
  }

  renderModel(modelName) {
    if (!this.modelData[modelName]) return;
    this.activeDisks = this.clearScene(this.activeDisks); // Now calling instance method
    const { disks, target, extent } = this.createDisks(this.modelData[modelName]);
    this.activeDisks = disks;
    this.cameraManager.updateTargetAndRadius(target, extent);
    this.cameraManager.setMode("default");
  }

  // Add clearScene as an instance method for consistency
  clearScene(disks) {
    disks.forEach(disk => disk.dispose());
    return [];
  }
}
