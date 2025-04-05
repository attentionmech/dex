import { StandardMaterial, MeshBuilder, Vector3, ActionManager, ExecuteCodeAction, Color3, TransformNode, Animation } from "@babylonjs/core";

import { CONFIG } from "../commons/Configs";
import { RAINBOW_COLORS } from "../commons/Constants";

export class DexModelVisualizer {
  constructor(scene, uiComponents) {
    this.scene = scene;
    this.uiComponents = uiComponents;
    this.layerColorAssignments = {};
    this.modelRoot = new TransformNode("modelRoot", this.scene);
    this.selectedDisk = null;
    this.disks = [];
  }

  // Extract layer number from name (h.25.attn.c_proj.weight -> 25)
  getLayerNumber(name) {
    const match = name.match(/h\.(\d+)\./);
    return match ? parseInt(match[1]) : -1;
  }

  // Get clean component name without layer number (h.25.attn.c_proj.weight -> h.attn.c_proj.weight)
  getCleanLayerName(originalName) {
    return originalName.replace(/\.\d+\./g, ".");
  }

  // Get component type (attn, mlp, ln)
  getComponentType(name) {
    return this.getCleanLayerName(name)
  }

  assignLayerColor(layerName) {
    // Use the clean layer name for color assignment, as in original code
    const cleanName = this.getCleanLayerName(layerName);
    
    if (!this.layerColorAssignments[cleanName]) {
      const colorNames = Object.keys(RAINBOW_COLORS);
      const colorCount = Object.keys(this.layerColorAssignments).length;
      this.layerColorAssignments[cleanName] =
        colorCount >= colorNames.length - 1
          ? RAINBOW_COLORS['Gray']
          : RAINBOW_COLORS[colorNames[colorCount]];
    }
    return this.layerColorAssignments[cleanName];
  }

  createDisks(layerData) {
    // Group tensors by layer number
    const layerGroups = {};
    
    layerData.forEach(layer => {
      const layerNumber = this.getLayerNumber(layer.name);
      if (layerNumber >= 0) {
        if (!layerGroups[layerNumber]) {
          layerGroups[layerNumber] = [];
        }
        layerGroups[layerNumber].push(layer);
      } else {
        // Handle layers without numbers (like embeddings or final layers)
        if (!layerGroups['misc']) {
          layerGroups['misc'] = [];
        }
        layerGroups['misc'].push(layer);
      }
    });
    
    // Calculate sizing factors
    const allSizes = layerData.map(layer => layer.numel);
    const ff = Math.log;
    const logMinSize = Math.min(...allSizes.map(ff));
    const logMaxSize = Math.max(...allSizes.map(ff));
    
    // Setup positioning
    let currentPosition = CONFIG.START_POSITION.clone();
    const direction = CONFIG.MODEL_DIRECTION.clone().normalize();
    this.disks = [];
    
    // Process each layer group in order
    const layerNumbers = Object.keys(layerGroups)
                              .filter(num => num !== 'misc')
                              .map(num => parseInt(num))
                              .sort((a, b) => a - b);
    
    // First process numbered layers
    layerNumbers.forEach(layerNum => {
      const layerComponents = layerGroups[layerNum];
      this.createLayerGroup(layerComponents, layerNum, currentPosition, direction, logMinSize, logMaxSize);
      
      // Move position for next layer group
      currentPosition.addInPlace(direction.scale(CONFIG.DISK_THICKNESS * CONFIG.DISK_SPACING_MULTIPLIER * 2));
    });
    
    // Then process misc layers if any
    if (layerGroups['misc']) {
      this.createLayerGroup(layerGroups['misc'], 'misc', currentPosition, direction, logMinSize, logMaxSize);
    }
    
    // Set up click handler for background
    this.scene.onPointerDown = (evt, pickInfo) => {
      if (pickInfo.hit && this.selectedDisk && this.modelRoot.getChildren().includes(pickInfo.pickedMesh)) {
        return;
      }
    
      this.selectedDisk = null;
      this.disks.forEach(disk => {
        const mat = disk.material;
        if (mat) {
          mat.alpha = 0.7;
          mat.emissiveColor = mat.diffuseColor.scale(CONFIG.COLOR_EMISSIVE_MULTIPLIERS);
        }
      });
    };
    
    // Calculate extent and target for camera
    const extent = CONFIG.DISK_THICKNESS * CONFIG.DISK_SPACING_MULTIPLIER * (layerNumbers.length * 2 + (layerGroups['misc'] ? 1 : 0));
    const target = CONFIG.START_POSITION.clone().add(direction.scale(extent / 2));
  
    const disks = this.disks;
    return { disks, target, extent };
  }

  createLayerGroup(components, layerNum, basePosition, direction, logMinSize, logMaxSize) {
    // Create a group node for this layer
    const layerGroup = new TransformNode(`layer_${layerNum}_group`, this.scene);
    layerGroup.parent = this.modelRoot;
    
    // Sort components by type for consistent ordering
    components.sort((a, b) => {
      const typeA = this.getComponentType(a.name);
      const typeB = this.getComponentType(b.name);
      return typeA.localeCompare(typeB);
    });
    
    const ff = Math.log;
    const circumference = Math.PI * CONFIG.DISK_MAX_SIZE * 2; // Use circumference to position components in a circle
    const angleStep = (2 * Math.PI) / components.length;
    
    // Create disks for each component in this layer, arranged in a circle
    components.forEach((component, idx) => {
      // Calculate size based on number of parameters
      const tileSize = CONFIG.DISK_MIN_SIZE +
        ((ff(component.numel) - logMinSize) / (logMaxSize - logMinSize)) *
        (CONFIG.DISK_MAX_SIZE - CONFIG.DISK_MIN_SIZE);
      
      // Create material with color based on cleaned component name (original strategy)
      const material = new StandardMaterial(`material_${component.name}`, this.scene);
      material.diffuseColor = this.assignLayerColor(component.name);
      material.emissiveColor = material.diffuseColor.scale(CONFIG.COLOR_EMISSIVE_MULTIPLIERS);
      
      // Calculate position in a circle around the layer center
      const angle = idx * angleStep;
      const radius = CONFIG.DISK_MAX_SIZE * 1.2; // Distance from center
      
      // Get perpendicular vectors to direction for positioning in a circle
      const up = new Vector3(0, 1, 0);
      const right = Vector3.Cross(direction, up).normalize();
      if (right.length() < 0.1) {
        // If direction is close to up, use a different vector
        right.copyFrom(new Vector3(1, 0, 0));
      }
      up.copyFrom(Vector3.Cross(right, direction).normalize());
      
      // Position offset from layer center
      const offsetX = Math.cos(angle) * radius;
      const offsetY = Math.sin(angle) * radius;
      const offset = right.scale(offsetX).add(up.scale(offsetY));
      
      // Create disk for this component
      const diskPos = basePosition.clone().add(offset);
      
      // Determine box dimensions based on direction
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
      
      const disk = MeshBuilder.CreateBox(`disk_${component.name}`, boxOptions, this.scene);
      disk.position = diskPos;
      disk.material = material;
      disk.parent = layerGroup;
      
      // Store component data with the mesh
      disk.componentData = component;
      
      // Add interaction handlers
      disk.actionManager = new ActionManager(this.scene);
      disk.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
          this.uiComponents.panelText.text = `Name: ${component.name}\nShape: ${JSON.stringify(component.shape)}\nParams: ${component.numel.toLocaleString()}\nType: ${this.getComponentType(component.name)}\nLayer: ${layerNum}`;
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
      
      this.disks.push(disk);
    });
    
    // Add a label for the layer
    this.createLayerLabel(layerNum, basePosition, direction);
  }
  
  createLayerLabel(layerNum, position, direction) {
    // This is a placeholder - in a real implementation you would create
    // a text label using DynamicTexture or GUI to show the layer number
    console.log(`Created label for layer ${layerNum} at position ${position}`);
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
    
    // Show detailed info for selected disk
    if (selectedDisk.componentData) {
      const component = selectedDisk.componentData;
      this.uiComponents.panelText.text = `Selected: ${component.name}\n` +
        `Shape: ${JSON.stringify(component.shape)}\n` +
        `Parameters: ${component.numel.toLocaleString()}\n` +
        `Type: ${this.getComponentType(component.name)}\n` +
        `Layer: ${this.getLayerNumber(component.name)}`;
    }
  }
  
  moveModelRoot(displacement) {
    this.modelRoot.position.addInPlace(displacement);
    console.log("Moved model root to:", this.modelRoot.position);
  }
}