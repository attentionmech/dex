import { DexModelManager } from "./DexModelManager";
import { tableFromIPC } from "apache-arrow";

export class SceneManager {
  constructor(scene, cameraManager, uiComponents, dexModelVisualizer) {
    this.scene = scene;
    this.cameraManager = cameraManager;

    this.uiComponents = uiComponents;
    this.dexModelManager = new DexModelManager(scene, uiComponents, dexModelVisualizer);

    this.modelData = {};
    this.modelConfigData = {}; // New variable for JSONL config data
  }

  async loadModelData() {
    try {
      const [arrowBuffer, jsonlText] = await Promise.all([
        this.fetchFile("/model_info.arrow", "arrayBuffer"),
        this.fetchFile("/config_list.jsonl", "text"),
      ]);

      this.parseArrowData(arrowBuffer);
      this.parseConfigJSONL(jsonlText);


      console.log("modeldata", this.modelData);
      console.log("modelconfigdata", this.modelConfigData);

      return { modelData: this.modelData, modelConfigData: this.modelConfigData };
    } catch (error) {
      console.error("Error loading model data:", error);
      this.modelData = {};
      this.modelConfigData = {};
      return { modelData: {}, modelConfigData: {} };
    }
  }

  async fetchFile(path, type = "text") {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.status}`);
    return type === "arrayBuffer" ? await response.arrayBuffer() : await response.text();
  }

  parseArrowData(arrayBuffer) {
    const table = tableFromIPC(arrayBuffer);
    const rows = [];

    for (const row of table) {
      rows.push(row.toJSON());
    }

    rows.sort((a, b) => Number(a.id) - Number(b.id));

    this.modelData = rows.reduce((acc, row) => {
      if (!row.model_name) {
        console.error("Row does not contain model_name:", row);
        return acc;
      }

      const modelName = row.model_name;
      if (!acc[modelName]) acc[modelName] = [];

      row.name = row.param_name;
      row.numel = Number(row.numel);
      row.shape = row.shape.split(",").map(Number);

      acc[modelName].push(row);
      return acc;
    }, {});
  }

  parseConfigJSONL(jsonlText) {
    this.modelConfigData = {};
    const lines = jsonlText.trim().split("\n");

    for (const line of lines) {
      try {
        const config = JSON.parse(line);
        const modelName = config.model_name;
        if (modelName) {
          this.modelConfigData[modelName] = config;
        } else {
          console.warn("Skipping config with missing model_name:", config);
        }
      } catch (e) {
        console.error("Failed to parse JSONL line:", e, line);
      }
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
