import { DexModelManager } from "./DexModelManager";
import { tableFromIPC } from "apache-arrow";
import pako from "pako";

export class SceneManager {
  constructor(scene, cameraManager, uiComponents, dexModelVisualizer) {
    this.scene = scene;
    this.cameraManager = cameraManager;
    this.uiComponents = uiComponents;
    this.dexModelManager = new DexModelManager(
      scene,
      uiComponents,
      dexModelVisualizer,
    );

    this.modelLayerData = {};
    this.modelConfigData = {};
    this.modelData = {};
  }

  async loadModelData() {
    const loadingEl = document.getElementById("loading-overlay");
    loadingEl.style.display = "flex";

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const arrowParam = urlParams.get("arrow");
      const configParam = urlParams.get("config");

      console.log(arrowParam);

      console.log(configParam);

      if (arrowParam && configParam) {
        // Load from query params
        const arrowJSON = this.decompressAndParse(arrowParam);
        const configJSON = this.decompressAndParse(configParam);
        this.parseArrowDataFromJSON(arrowJSON);
        this.parseConfigFromObject(configJSON);
      } else {
        // Fallback to loading from files
        const [arrowBuffer, jsonlText] = await Promise.all([
          this.fetchFile("/dex/model_info.arrow", "arrayBuffer"),
          this.fetchFile("/dex/config_list.jsonl", "text"),
        ]);
        this.parseArrowData(arrowBuffer);
        this.parseConfigJSONL(jsonlText);
      }

      const modelData = {
        modelLayerData: this.modelLayerData,
        modelConfigData: this.modelConfigData,
      };
      this.modelData = modelData;
      return modelData;
    } catch (error) {
      console.error("Error loading model data:", error);
      this.modelLayerData = {};
      this.modelConfigData = {};
      return { modelData: {}, modelConfigData: {} };
    } finally {
      loadingEl.style.display = "none";
    }
  }

  decompressAndParse(b64string) {
    try {
      // Replace URL-safe characters with standard base64 characters
      const standardB64 = b64string.replace(/-/g, '+').replace(/_/g, '/');
      
      // Add padding if needed
      const paddedB64 = standardB64.padEnd(
        standardB64.length + (4 - (standardB64.length % 4 || 4)) % 4, 
        '='
      );
      
      const binaryStr = atob(paddedB64);
      const compressed = Uint8Array.from(binaryStr, c => c.charCodeAt(0));
      const decompressed = pako.inflate(compressed, { to: 'string' });
      return JSON.parse(decompressed);
    } catch (err) {
      console.error("Failed to decompress and parse:", err);
      throw err;
    }
  }
  

  fetchFile(path, type = "text") {
    return fetch(path).then(res => {
      if (!res.ok) throw new Error(`Failed to fetch ${path}`);
      return type === "arrayBuffer" ? res.arrayBuffer() : res.text();
    });
  }

  parseArrowData(arrayBuffer) {
    const table = tableFromIPC(arrayBuffer);
    const rows = [];
    for (const row of table) rows.push(row.toJSON());
    this.modelLayerData = this.organizeRowsByModel(rows);
  }

  parseArrowDataFromJSON(rows) {
    this.modelLayerData = this.organizeRowsByModel(rows);
  }

  organizeRowsByModel(rows) {
    rows.sort((a, b) => Number(a.id) - Number(b.id));
    return rows.reduce((acc, row) => {
      const modelName = row.model_name;
      if (!modelName) return acc;
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
        if (config.model_name) this.modelConfigData[config.model_name] = config;
      } catch (e) {
        console.error("Failed to parse JSONL line:", e, line);
      }
    }
  }

  parseConfigFromObject(configList) {
    this.modelConfigData = {};
    for (const config of configList) {
      if (config.model_name) this.modelConfigData[config.model_name] = config;
    }
  }

  renderModel(modelName) {
    if (!this.modelLayerData[modelName]) return;
    this.dexModelManager.clear();
    console.log("Rendering model:", modelName);
    const { target, extent } = this.dexModelManager.create({
      modelLayerData: this.modelLayerData[modelName],
      modelConfigData: this.modelConfigData[modelName],
    });
    this.cameraManager.updateTargetAndRadius(target, extent);
    this.cameraManager.setMode("default");
  }
}
