import { Engine } from "@babylonjs/core";
import "@babylonjs/loaders";
import { CameraManager } from "../components/CameraManager";
import { UIMaker } from "../components/UIMaker";
import { SceneManager } from "../components/SceneManager";
import { DexModelVisualizer } from "../components/DexModelVisualiser";
import { CONFIG } from "../commons/Configs";

class AppManager {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.engine = new Engine(this.canvas, true);
    this.uiMaker = new UIMaker(this.engine);
    this.dexModelVisualizer = new DexModelVisualizer(
      this.uiMaker.scene,
      this.uiMaker.uiComponents,
    ); // Create here
    this.cameraManager = new CameraManager(
      this.uiMaker.scene,
      this.canvas,
      this.dexModelVisualizer,
    );
    this.sceneManager = new SceneManager(
      this.uiMaker.scene,
      this.cameraManager,
      this.uiMaker.uiComponents, // for hooks
      this.dexModelVisualizer,
    );
  }

  // Initialize the application
  async initialize() {
    const modelData = await this.sceneManager.loadModelData(); // Get the resolved modelData
    this.uiMaker.setupUI(modelData, (modelName) =>
      this.sceneManager.renderModel(modelName),
    );
    this.startRenderLoop();
    this.setupResizeHandler();
    this.setupPanelHandler();

    if (
      modelData?.modelLayerData &&
      Object.keys(modelData.modelLayerData).length > 0
    ) {
      if (
        CONFIG.DEFAULT_MODEL &&
        modelData.modelLayerData.hasOwnProperty(CONFIG.DEFAULT_MODEL)
      ) {
        this.sceneManager.renderModel(CONFIG.DEFAULT_MODEL);
        const modelSelector = document.getElementById("modelSelect");
        if (modelSelector) {
          modelSelector.value = CONFIG.DEFAULT_MODEL; // Optionally set the dropdown
        }
      } else {
        // If DEFAULT_MODEL is not set or invalid, render the first model
        const firstModelName = Object.keys(modelData.modelLayerData)[0];
        this.sceneManager.renderModel(firstModelName);
      }
    }
  }

  setupPanelHandler() {}

  // Start the render loop
  startRenderLoop() {
    this.engine.runRenderLoop(() => this.uiMaker.scene.render());
  }

  // Setup resize event listener
  setupResizeHandler() {
    window.addEventListener("resize", () => this.engine.resize());
  }
}

export { AppManager };
