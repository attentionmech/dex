import {
  StandardMaterial,
  MeshBuilder,
  Vector3,
  ActionManager,
  ExecuteCodeAction,
  DynamicTexture,
  Plane,
  Color3,
  Mesh
} from "@babylonjs/core";

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

  assignLayerColor(layerName) {
    if (!this.layerColorAssignments[layerName]) {
      const colorNames = Object.keys(RAINBOW_COLORS);
      const colorCount = Object.keys(this.layerColorAssignments).length;
      this.layerColorAssignments[layerName] =
        colorCount >= colorNames.length - 1
          ? RAINBOW_COLORS["Gray"]
          : RAINBOW_COLORS[colorNames[colorCount]];
    }
    return this.layerColorAssignments[layerName];
  }

  createDisks(layerData) {
    const layerSizes = layerData.map(layer => layer.numel);
    const ff = Math.log;

    const logMinSize = Math.min(...layerSizes.map(ff));
    const logMaxSize = Math.max(...layerSizes.map(ff));

    let currentPosition = CONFIG.START_POSITION.clone();
    const direction = CONFIG.MODEL_DIRECTION.clone().normalize();
    this.disks = [];

    layerData.forEach((layer, index) => {
      const layerCleanName = this.getCleanLayerName(layer.name);
      const tileSize =
        CONFIG.DISK_MIN_SIZE +
        ((ff(layer.numel) - logMinSize) / (logMaxSize - logMinSize)) *
          (CONFIG.DISK_MAX_SIZE - CONFIG.DISK_MIN_SIZE);

      const material = new StandardMaterial(
        `material_layer_${index}`,
        this.scene
      );
      material.diffuseColor = this.assignLayerColor(layerCleanName);
      material.emissiveColor = material.diffuseColor.scale(
        CONFIG.COLOR_EMISSIVE_MULTIPLIERS
      );

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

      const disk = MeshBuilder.CreateBox(
        `disk_layer_${index}`,
        boxOptions,
        this.scene
      );
      disk.position = currentPosition.clone();
      currentPosition.addInPlace(
        direction.scale(CONFIG.DISK_THICKNESS * CONFIG.DISK_SPACING_MULTIPLIER)
      );

      disk.material = material;
      disk.actionManager = new ActionManager(this.scene);

      // Hover: only visual feedback
      disk.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
          if (disk.material) {
            disk.material.emissiveColor = new Color3(1, 1, 1); // bright white
          }
          disk.scaling = new Vector3(1.3, 1.3, 1.3);
        })
      );

      // Unhover: reset visuals
      disk.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
          if (disk.material) {
            disk.material.emissiveColor = disk.material.diffuseColor.scale(
              CONFIG.COLOR_EMISSIVE_MULTIPLIERS
            );
          }
          disk.scaling = new Vector3(1, 1, 1);
        })
      );

      // On click: highlight + update panel
      disk.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
          this.highlightDisk(disk, this.disks);
          this.uiComponents.panelText.text = `Name: ${layer.name}\nShape: ${JSON.stringify(
            layer.shape
          )}\nParams: ${layer.numel.toLocaleString()}`;
        })
      );

      disk.parent = this.modelRoot;
      this.disks.push(disk);
    });

    // Click outside: clear selection
    this.scene.onPointerDown = (evt, pickInfo) => {
      if (
        pickInfo.hit &&
        this.selectedDisk &&
        this.modelRoot.getChildren().includes(pickInfo.pickedMesh)
      ) {
        return;
      }

      this.selectedDisk = null;
      this.uiComponents.panelText.text = "loshdex";

      this.disks.forEach(disk => {
        const mat = disk.material;
        if (mat) {
          mat.alpha = 1;
          mat.emissiveColor = mat.diffuseColor.scale(
            CONFIG.COLOR_EMISSIVE_MULTIPLIERS
          );
        }
      });
    };

    const extent =
      CONFIG.DISK_THICKNESS *
      CONFIG.DISK_SPACING_MULTIPLIER *
      layerData.length;
    const target = CONFIG.START_POSITION.clone().add(
      direction.scale(extent / 2)
    );

    return { disks: this.disks, target, extent };
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
        mat.emissiveColor = mat.diffuseColor.scale(
          CONFIG.COLOR_EMISSIVE_MULTIPLIERS
        );
      } else {
        mat.alpha = 0.2;
        mat.emissiveColor = new Color3(0, 0, 0);
      }
    });
  }

  moveModelRoot(displacement) {
    this.modelRoot.position.addInPlace(displacement);
    this.disks.forEach(disk => {
      disk.position = disk.position.add(displacement);
    });
  }
}
