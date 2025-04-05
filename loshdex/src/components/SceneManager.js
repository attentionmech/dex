import { DexModelManager } from "./DexModelManager";
import { tableFromIPC } from "apache-arrow";

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
      const response = await fetch("/model_info.arrow");
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
  
      const arrayBuffer = await response.arrayBuffer();
      
      // Assuming tableFromIPC is from the Apache Arrow JS library
      const table = tableFromIPC(arrayBuffer);  // Parses the Arrow IPC format
      var rows = [];
  
      for (const row of table) {
          rows.push(row.toJSON())          
      }

      rows.sort((a, b) => Number(a.id) - Number(b.id));
      
      this.modelData = rows.reduce((acc, row) => {
        if (!row.model_name) {
          console.error("Row does not contain model_name:", row);
        }
        const modelName = row.model_name;
        if (!acc[modelName]) {
          acc[modelName] = [];
        }
        row["name"] = row["param_name"];
        row["numel"] = Number(row["numel"]);
        row["shape"] = row["shape"].split(",").map(Number) ;
        acc[modelName].push(row);
        return acc;
      }
      , {});


      return this.modelData;
    } catch (error) {
      console.error("Error loading Arrow file:", error);
      this.modelData = [];
      return [];
    }
  }



renderModel(modelName) {
  if (!this.modelData[modelName]) return;

  this.dexModelManager.clear();

  const { target, extent } = this.dexModelManager.create(this.modelData[modelName]);

  this.cameraManager.updateTargetAndRadius(target, extent);
  this.cameraManager.setMode("default");
}
}