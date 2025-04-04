import { DexModelManager } from "./DexModelManager";




// Updated SceneManager class
export class SceneManager {
  constructor(scene, cameraManager, uiComponents, dexModelVisualizer) {
    this.scene = scene;
    this.cameraManager = cameraManager;

    this.uiComponents = uiComponents;
    this.dexModelManager = new DexModelManager(scene, uiComponents, dexModelVisualizer); // Create Model instance
    
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

  renderModel(modelName) {
    if (!this.modelData[modelName]) return;
    
    this.dexModelManager.clear();

    const { target, extent } = this.dexModelManager.create(this.modelData[modelName]);
    
    this.cameraManager.updateTargetAndRadius(target, extent);
    this.cameraManager.setMode("interactive");
  }
}