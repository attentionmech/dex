import { Engine } from "@babylonjs/core";
import "@babylonjs/loaders";
import { CameraManager } from "../components/CameraManager";
import { SceneManager } from "../components/SceneManager";
import { ModelManager } from "../components/ModelManager";

class AppManager {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.engine = new Engine(this.canvas, true);
    this.sceneManager = new SceneManager(this.engine);
    this.cameraManager = new CameraManager(this.sceneManager.scene, this.canvas);
    this.modelManager = new ModelManager(
      this.sceneManager.scene,
      this.cameraManager,
      this.sceneManager.uiComponents.panelText
    );
  }

  // Initialize the application
  async initialize() {
    await this.modelManager.loadModelData();
    this.sceneManager.setupUI(this.modelManager.modelData, (modelName) =>
      this.modelManager.renderModel(modelName)
    );
    this.startRenderLoop();
    this.setupResizeHandler();
  }

  // Start the render loop
  startRenderLoop() {
    this.engine.runRenderLoop(() => this.sceneManager.scene.render());
  }

  // Setup resize event listener
  setupResizeHandler() {
    window.addEventListener("resize", () => this.engine.resize());
  }
}

export { AppManager };