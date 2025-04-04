import { StandardMaterial, MeshBuilder, Vector3, ActionManager, ExecuteCodeAction, DynamicTexture, Plane, Color3, Mesh } from "@babylonjs/core";

import { CONFIG } from "../commons/Configs";
import { RAINBOW_COLORS } from "../commons/Constants";


export class DexModelVisualizer {
  constructor(scene, uiComponents) {
    this.scene = scene;
    this.uiComponents = uiComponents;
    this.layerColorAssignments = {};
  }

  getCleanLayerName(originalName) {
    return originalName.replace(/\.\d+\./g, ".");
  }

  createLabelPlane(text, scene) {
    const dynamicTexture = new DynamicTexture("labelTexture", { width: 1024, height: 128 }, scene, false);
    dynamicTexture.hasAlpha = true;
  
    dynamicTexture.drawText(text, null, 80, "bold 100px Arial", "white", "black", true);
  
    const labelMaterial = new StandardMaterial("labelMaterial", scene);
    labelMaterial.diffuseTexture = dynamicTexture;
    labelMaterial.emissiveColor = new Color3(1, 1, 1);
    labelMaterial.backFaceCulling = false;
  
    const plane = MeshBuilder.CreatePlane("labelPlane", { width: 200, height: 50 }, scene);
    plane.material = labelMaterial;
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
  
    return plane;
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

      //LABELS
      const labelPlane = this.createLabelPlane(layerCleanName, this.scene);

      // Position label above the disk
      labelPlane.position = disk.position.clone();
      if (CONFIG.MODEL_DIRECTION === 'horizontal') {
        labelPlane.position.y += tileSize / 2 + 30;
      } else {
        labelPlane.position.y += CONFIG.DISK_THICKNESS / 2 + 30;
      }

      // Make label follow the disk
      labelPlane.parent = disk;



      disk.material = material;
      disk.actionManager = new ActionManager(this.scene);
      disk.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
          this.uiComponents.panelText.text = `Name: ${layer.name}\nShape: ${JSON.stringify(layer.shape)}\nParams: ${layer.numel.toLocaleString()}`;
        })
      );
      disk.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
          this.uiComponents.panelText.text = "loshdex";
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

  clearDisks(disks) {
    disks.forEach(disk => disk.dispose());
    return [];
  }
}
