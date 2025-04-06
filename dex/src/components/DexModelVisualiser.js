import {
  StandardMaterial,
  MeshBuilder,
  Vector3,
  ActionManager,
  ExecuteCodeAction,
  DynamicTexture,
  Plane,
  Color3,
  Mesh,
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
    this.modelConfigData = null;

    // Add keyboard event listener
    this.setupKeyboardControls();
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

  formatModelConfig(configData) {
    const wrapAt = 60;

    const wrapText = (text, width) => {
      const words = text.split(" ");
      const lines = [];
      let currentLine = "";

      words.forEach((word) => {
        if ((currentLine + word).length > width) {
          lines.push(currentLine.trim());
          currentLine = "";
        }
        currentLine += word + " ";
      });

      if (currentLine) lines.push(currentLine.trim());

      return lines.join("\n");
    };

    return Object.entries(configData)
      .map(([key, val]) => {
        let valueStr =
          typeof val === "object" ? JSON.stringify(val, null, 2) : String(val);
        const wrappedValue = wrapText(`${key}: ${valueStr}`, wrapAt);
        return wrappedValue;
      })
      .join("\n-----------------------------\n");
  }

  formatLayerData(layer) {
    const wrapAt = 40;

    const wrapText = (text, width) => {
      const words = text.split(" ");
      const lines = [];
      let currentLine = "";

      words.forEach((word) => {
        if ((currentLine + word).length > width) {
          lines.push(currentLine.trim());
          currentLine = "";
        }
        currentLine += word + " ";
      });

      if (currentLine) lines.push(currentLine.trim());

      return lines.join("\n");
    };

    return Object.entries(layer)
      .filter(
        ([key]) =>
          !["id", "file_path", "is_shared", "param_name", "level"].includes(
            key,
          ),
      )
      .map(([key, val]) => {
        let valueStr =
          typeof val === "object" ? JSON.stringify(val, null, 2) : String(val);
        const wrappedValue = wrapText(`${key}: ${valueStr}`, wrapAt);
        return wrappedValue;
      })
      .join("\n------------------------------\n");
  }

  createDisks(modelData) {
    this.layerColorAssignments = {};

    const layerData = modelData.modelLayerData;
    const configData = modelData.modelConfigData;

    // Store layer data in scene metadata for later access
    this.scene.metadata = this.scene.metadata || {};
    this.scene.metadata.modelLayerData = layerData;

    this.modelConfigData = configData;

    const layerSizes = layerData.map((layer) => layer.numel);
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
        this.scene,
      );
      material.diffuseColor = this.assignLayerColor(layerCleanName);
      material.emissiveColor = material.diffuseColor.scale(
        CONFIG.COLOR_EMISSIVE_MULTIPLIERS,
      );

      const absDir = new Vector3(
        Math.abs(direction.x),
        Math.abs(direction.y),
        Math.abs(direction.z),
      );
      const boxOptions = {
        width: absDir.x > 0.5 ? CONFIG.DISK_THICKNESS : tileSize,
        height: absDir.y > 0.5 ? CONFIG.DISK_THICKNESS : tileSize,
        depth: absDir.z > 0.5 ? CONFIG.DISK_THICKNESS : tileSize,
      };

      const disk = MeshBuilder.CreateBox(
        `disk_layer_${index}`,
        boxOptions,
        this.scene,
      );
      disk.position = currentPosition.clone();
      currentPosition.addInPlace(
        direction.scale(CONFIG.DISK_THICKNESS * CONFIG.DISK_SPACING_MULTIPLIER),
      );

      disk.material = material;
      disk.actionManager = new ActionManager(this.scene);

      disk.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
          if (disk.material) {
            disk.material.emissiveColor = new Color3(1, 1, 1);
          }
          disk.scaling = new Vector3(1.3, 1.3, 1.3);
          const hoverBox = document.getElementById("hoverLayerBox");
          hoverBox.innerText = layer.name;
          hoverBox.style.display = "block";
        }),
      );

      disk.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
          if (disk.material) {
            disk.material.emissiveColor = disk.material.diffuseColor.scale(
              CONFIG.COLOR_EMISSIVE_MULTIPLIERS,
            );
          }
          disk.scaling = new Vector3(1, 1, 1);

          const hoverBox = document.getElementById("hoverLayerBox");
          hoverBox.style.display = "none";
        }),
      );

      disk.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
          this.highlightDisk(disk, this.disks);
          this.uiComponents.panelText.text = this.formatLayerData(layer);
        }),
      );

      disk.parent = this.modelRoot;
      this.disks.push(disk);
    });

    this.scene.onPointerDown = (evt, pickInfo) => {
      if (
        pickInfo.hit &&
        this.selectedDisk &&
        this.modelRoot.getChildren().includes(pickInfo.pickedMesh)
      ) {
        return;
      }

      this.selectedDisk = null;
      this.uiComponents.panelText.text = this.formatModelConfig(
        this.modelConfigData,
      );

      this.disks.forEach((disk) => {
        const mat = disk.material;
        if (mat) {
          mat.alpha = 1;
          mat.emissiveColor = mat.diffuseColor.scale(
            CONFIG.COLOR_EMISSIVE_MULTIPLIERS,
          );
        }
      });
    };

    const extent =
      CONFIG.DISK_THICKNESS * CONFIG.DISK_SPACING_MULTIPLIER * layerData.length;
    const target = CONFIG.START_POSITION.clone().add(
      direction.scale(extent / 2),
    );

    // Show model config initially
    this.uiComponents.panelText.text = this.formatModelConfig(configData);

    return { disks: this.disks, target, extent };
  }

  clearDisks(disks) {
    disks.forEach((disk) => disk.dispose());
    return [];
  }

  highlightDisk(selectedDisk, allDisks) {
    this.selectedDisk = selectedDisk;

    allDisks.forEach((disk) => {
      const mat = disk.material;
      if (!mat) return;

      if (disk === selectedDisk) {
        mat.alpha = 1;
        mat.emissiveColor = mat.diffuseColor.scale(
          CONFIG.COLOR_EMISSIVE_MULTIPLIERS,
        );
      } else {
        mat.alpha = 0.2;
        mat.emissiveColor = new Color3(0, 0, 0);
      }
    });
  }

  moveModelRoot(displacement) {
    this.modelRoot.position.addInPlace(displacement);
    this.disks.forEach((disk) => {
      disk.position = disk.position.add(displacement);
    });
  }

  setupKeyboardControls() {
    window.addEventListener("keydown", (event) => {
      const moveSpeed = CONFIG.MOVE_SPEED * 10; // Adjust this value to control movement speed

      // If no disk is selected, move the entire model left/right
      if (!this.selectedDisk) {
        switch (event.key) {
          case "ArrowLeft":
            this.moveModelRoot(new Vector3(+moveSpeed, 0, 0));
            break;
          case "ArrowRight":
            this.moveModelRoot(new Vector3(-moveSpeed, 0, 0));
            break;
        }
      }
      // If a disk is selected, move selection between disks
      else {
        const currentIndex = this.disks.indexOf(this.selectedDisk);

        switch (event.key) {
          case "ArrowLeft":
            if (currentIndex > 0) {
              const newDisk = this.disks[currentIndex - 1];
              this.highlightDisk(newDisk, this.disks);
              // Update panel text with new selected layer data
              const layerData =
                this.scene.metadata.modelLayerData[currentIndex - 1];
              this.uiComponents.panelText.text =
                this.formatLayerData(layerData);
            }
            break;
          case "ArrowRight":
            if (currentIndex < this.disks.length - 1) {
              const newDisk = this.disks[currentIndex + 1];
              this.highlightDisk(newDisk, this.disks);
              // Update panel text with new selected layer data
              const layerData =
                this.scene.metadata.modelLayerData[currentIndex + 1];
              this.uiComponents.panelText.text =
                this.formatLayerData(layerData);
            }
            break;
        }
      }
    });
  }
}
