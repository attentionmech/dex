import { StandardMaterial, MeshBuilder, Vector3, ActionManager, ExecuteCodeAction, DynamicTexture, Plane, Color3, Mesh } from "@babylonjs/core";

import { CONFIG } from "../commons/Configs";
import { RAINBOW_COLORS } from "../commons/Constants";
import { TransformNode, Animation } from "@babylonjs/core";


export class DexModelVisualizer {
  constructor(scene, uiComponents) {
    this.scene = scene;
    this.uiComponents = uiComponents;
    this.layerColorAssignments = {};
    this.modelRoot = new TransformNode("modelRoot", this.scene);
    this.selectedDisk = null;

    this.disks = [];

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
    labelMaterial.alpha = 0.8; // Adjust alpha value for transparency


    const plane = MeshBuilder.CreatePlane("labelPlane", { width: 200, height: 50 }, scene);
    plane.material = labelMaterial;
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    plane.renderingGroupId = 2; // Adjust to a higher value for rendering above other objects

    // const glowLayer = new GlowLayer("glow", this.scene);
    // glowLayer.addExcludedMesh(plane);


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
    let currentPosition = CONFIG.START_POSITION.clone();
    const direction = CONFIG.MODEL_DIRECTION.clone().normalize();
    this.disks = [];
  
    layerData.forEach((layer, index) => {
      const layerCleanName = this.getCleanLayerName(layer.name);
      const tileSize = CONFIG.DISK_MIN_SIZE +
        ((Math.log(layer.numel) - logMinSize) / (logMaxSize - logMinSize)) *
        (CONFIG.DISK_MAX_SIZE - CONFIG.DISK_MIN_SIZE);
  
      const material = new StandardMaterial(`material_layer_${index}`, this.scene);
      material.diffuseColor = this.assignLayerColor(layerCleanName);
      material.emissiveColor = material.diffuseColor.scale(CONFIG.COLOR_EMISSIVE_MULTIPLIERS);
  
      const absDir = new Vector3(
        Math.abs(direction.x),
        Math.abs(direction.y),
        Math.abs(direction.z)
      );
      const boxOptions = {
        width: absDir.x > 0.5 ? CONFIG.DISK_THICKNESS : tileSize,
        height: absDir.y > 0.5 ? CONFIG.DISK_THICKNESS : tileSize,
        depth: absDir.z > 0.5 ? CONFIG.DISK_THICKNESS : tileSize
      };
  
      const disk = MeshBuilder.CreateBox(`disk_layer_${index}`, boxOptions, this.scene);
      disk.position = currentPosition.clone();
      
      currentPosition.addInPlace(direction.scale(CONFIG.DISK_THICKNESS * CONFIG.DISK_SPACING_MULTIPLIER));
  
      const labelPlane = this.createLabelPlane(layerCleanName, this.scene);
      labelPlane.position = disk.position.clone();
      
      const upVector = direction.clone().cross(new Vector3(0, 1, 0)).length() < 0.1 
        ? new Vector3(1, 0, 0) 
        : new Vector3(0, 1, 0);
      const labelOffset = upVector.scale(tileSize / 2 + 30);
      labelPlane.position.addInPlace(labelOffset);
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
      
      disk.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
          this.highlightDisk(disk, this.disks);
        })
      );
      
      disk.parent = this.modelRoot;
      this.disks.push(disk);
    });
  
    this.scene.onPointerDown = (evt, pickInfo) => {
      if (pickInfo.hit && this.selectedDisk && this.modelRoot.getChildren().includes(pickInfo.pickedMesh)) {
        return;
      }
    
      this.selectedDisk = null;
      this.disks.forEach(disk => {
        const mat = disk.material;
        if (mat) {
          mat.alpha = 1;
          mat.emissiveColor = mat.diffuseColor.scale(CONFIG.COLOR_EMISSIVE_MULTIPLIERS);
        }
      });
    };
    
    // Updated extent and target calculation
    const extent = CONFIG.DISK_THICKNESS * CONFIG.DISK_SPACING_MULTIPLIER * layerData.length;
    const target = CONFIG.START_POSITION.clone()
      .add(direction.scale(extent / 2));
  
    const disks = this.disks;
    return { disks, target, extent };
  }

  clearDisks(disks) {
    disks.forEach(disk => disk.dispose());
    return [];
  }

  highlightDisk(selectedDisk, allDisks) {
    this.selectedDisk = selectedDisk;
  
    allDisks.forEach(disk => {
      const mat = disk.material;
      if (!mat) return;
  
      if (disk === selectedDisk) {
        mat.alpha = 1;
        mat.emissiveColor = mat.diffuseColor.scale(CONFIG.COLOR_EMISSIVE_MULTIPLIERS);
      } else {
        mat.alpha = 0.2;
        mat.emissiveColor = new Color3(0, 0, 0);
      }
    });
  }
  
  
  
  // unused
  focusOnDisk(disk) {
    const targetPosition = disk.getAbsolutePosition().negate(); // Reverse it to bring to (0,0,0)
  
    // Only move along X or Y depending on model direction
    const current = this.modelRoot.position.clone();
    const target = current.clone();
  
    if (CONFIG.MODEL_DIRECTION === "horizontal") {
      target.x = targetPosition.x;
    } else {
      target.y = targetPosition.y;
    }
  
    const animation = new Animation(
      "modelShift",
      "position",
      60,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );
  
    animation.setKeys([
      { frame: 0, value: current },
      { frame: 15, value: target }
    ]);
  
    this.modelRoot.animations = [];
    this.modelRoot.animations.push(animation);
    this.scene.beginAnimation(this.modelRoot, 0, 30, false);
  }
  
  moveModelRoot(displacement) {
    const newPosition = this.modelRoot.position.clone().add(displacement);
    this.modelRoot.position = newPosition;
  }


}
