import { Engine } from "@babylonjs/core";
import "@babylonjs/loaders";
import { CameraManager } from "../components/CameraManager";
import {  UIMaker } from "../components/UIMaker";
import { SceneManager } from "../components/SceneManager";
import { DexModelVisualizer } from "../components/DexModelVisualiser";

class AppManager {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.engine = new Engine(this.canvas, true);
    this.uiMaker = new UIMaker(this.engine);
    this.dexModelVisualizer = new DexModelVisualizer(this.uiMaker.scene, this.uiMaker.uiComponents); // Create here
    this.cameraManager = new CameraManager(this.uiMaker.scene, this.canvas,this.dexModelVisualizer);
    this.sceneManager = new SceneManager(
      this.uiMaker.scene,
      this.cameraManager,
      this.uiMaker.uiComponents, // for hooks
      this.dexModelVisualizer
    );
  }

  // Initialize the application
  async initialize() {
    await this.sceneManager.loadModelData();
    this.uiMaker.setupUI(this.sceneManager.modelData, (modelName) =>
      this.sceneManager.renderModel(modelName)
    );
    this.startRenderLoop();
    this.setupResizeHandler();
    this.setupPanelHandler();
  }


  setupPanelHandler(){
  
  }

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