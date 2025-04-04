import { ArcRotateCamera, Vector3 } from "@babylonjs/core";
import { CONFIG } from "../commons/Configs";

export class CameraManager {
  constructor(scene, canvas, dexModelVisualizer) {
    this.camera = new ArcRotateCamera(
      "mainCamera",
      CONFIG.CAMERA_ALPHA,
      CONFIG.CAMERA_BETA,
      CONFIG.CAMERA_RADIUS,
      CONFIG.CAMERA_TARGET,
      scene
    );
    this.camera.minZ = 1;
    this.camera.maxZ = 200000;
    this.canvas = canvas;
    this.scene = scene;
    this.dexModelVisualizer = dexModelVisualizer; // Reference to DexModelVisualizer
    this.isDragging = false;
    this.lastMouseX = null;
    this.currentMode = "interactive";
    this.setMode("interactive"); // Initial mode
    this.setupDragHandler();
  }

  setMode(mode, target = CONFIG.CAMERA_TARGET, extent = 1600) {
    this.currentMode = mode;
    this.camera.target = target;
    switch (mode) {
      case "default":
        this.camera.alpha = CONFIG.CAMERA_ALPHA;
        this.camera.beta = CONFIG.CAMERA_BETA;
        this.camera.radius = extent * 3;
        this.camera.detachControl();
        break;
      case "side":
        this.camera.alpha = Math.PI / 2;
        this.camera.beta = Math.PI / 2;
        this.camera.radius = extent * 1.2;
        this.camera.detachControl();
        break;
      case "top":
        this.camera.alpha = 0;
        this.camera.beta = 0;
        this.camera.radius = extent * 1.5;
        this.camera.detachControl();
        break;
      case "interactive":
        this.camera.alpha = CONFIG.CAMERA_ALPHA;
        this.camera.beta = CONFIG.CAMERA_BETA;
        this.camera.radius = extent * 1.5;
        this.camera.attachControl(this.canvas, true);
        break;
      default:
        console.warn("Unknown camera mode:", mode);
    }
  }

  updateTargetAndRadius(target, extent) {
    this.camera.target = target;
    this.camera.radius = extent * 1.5;
  }

  setupDragHandler() {
    this.scene.onPointerDown = (evt) => {
      if (this.currentMode !== "interactive" && evt.button === 0) { // Left mouse button
        this.isDragging = true;
        this.lastMouseX = evt.clientX;
      }
    };

    this.scene.onPointerMove = (evt) => {
      if (this.isDragging && this.currentMode !== "interactive") {
        const currentMouseX = evt.clientX;
        const deltaX = currentMouseX - this.lastMouseX;
        this.moveModel(deltaX);
        this.lastMouseX = currentMouseX;
      }
    };

    this.scene.onPointerUp = () => {
      this.isDragging = false;
      this.lastMouseX = null;
    };
  }

  moveModel(deltaX) {
    const direction = CONFIG.MODEL_DIRECTION.clone().normalize();
    const moveSpeed = 5; // Adjust this sensitivity as needed
    const displacement = direction.scale(deltaX * moveSpeed);
    this.dexModelVisualizer.moveModelRoot(displacement);
  }
}