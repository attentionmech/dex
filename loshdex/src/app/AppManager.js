import { Engine } from "@babylonjs/core";
import "@babylonjs/loaders";
import { CameraManager } from "../components/CameraManager";
import { SceneMaker } from "../components/SceneMaker";
import { SceneManager } from "../components/SceneManager";

class AppManager {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.engine = new Engine(this.canvas, true);
    this.sceneMaker = new SceneMaker(this.engine);
    this.cameraManager = new CameraManager(this.sceneMaker.scene, this.canvas);
    this.sceneManager = new SceneManager(
      this.sceneMaker.scene,
      this.cameraManager,
      this.sceneMaker.uiComponents.panelText
    );
  }

  // Initialize the application
  async initialize() {
    await this.sceneManager.loadModelData();
    this.sceneMaker.setupUI(this.sceneManager.modelData, (modelName) =>
      this.sceneManager.renderModel(modelName)
    );
    this.startRenderLoop();
    this.setupResizeHandler();
    this.setupPanelHandler();
  }


  setupPanelHandler(){
    document.getElementById("cameraSelect").addEventListener("change-camera", (e) => {
      const cameraMode = e.detail; // "default", "top", "side", etc.
      this.cameraManager.setMode(cameraMode);
    });    
  }

  // Start the render loop
  startRenderLoop() {
    this.engine.runRenderLoop(() => this.sceneMaker.scene.render());
  }

  // Setup resize event listener
  setupResizeHandler() {
    window.addEventListener("resize", () => this.engine.resize());
  }
}

export { AppManager };