import { CONFIG } from "../commons/Configs";
import { ArcRotateCamera, Vector3, PointerEventTypes } from "@babylonjs/core";



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
    this.currentMode = "default";
    this.setMode("default"); // Initial mode
    this.setupDragHandler();
  }

  setMode(mode, target = CONFIG.CAMERA_TARGET, extent = 1000) {
    this.currentMode = mode;
    this.camera.target = target;
    switch (mode) {
      case "default":
        this.camera.alpha = CONFIG.CAMERA_ALPHA;
        this.camera.beta = CONFIG.CAMERA_BETA;
        this.camera.radius = extent * 10;
        this.camera.detachControl();
        break;
      case "side":
        this.camera.alpha = Math.PI / 3;
        this.camera.beta = Math.PI / 3;
        this.camera.radius = extent * 2.2;
        this.camera.detachControl();
        break;
      case "top":
        this.camera.alpha = 0;
        this.camera.beta = 0;
        this.camera.radius = extent * 2.5;
        this.camera.detachControl();
        break;
      case "free":
        this.camera.alpha = CONFIG.CAMERA_ALPHA;
        this.camera.beta = CONFIG.CAMERA_BETA;
        this.camera.radius = extent * 2.5;
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
    this.scene.onPointerObservable.add((pointerInfo) => {
      const evt = pointerInfo.event;
      switch (pointerInfo.type) {
        case PointerEventTypes.POINTERDOWN:
          if (this.currentMode !== "free" && evt.button === 0) {
            this.isDragging = true;
            this.lastMouseX = evt.clientX;
          }
          break;
  
        case PointerEventTypes.POINTERMOVE:
          if (this.isDragging && this.currentMode !== "free") {
            const currentMouseX = evt.clientX;
            const deltaX = currentMouseX - this.lastMouseX;
            this.moveModel(deltaX);
            this.lastMouseX = currentMouseX;
          }
          break;
  
        case PointerEventTypes.POINTERUP:
          this.isDragging = false;
          this.lastMouseX = null;
          break;
      }
    });
  }
  

  moveModel(deltaX) {
    
    const direction = CONFIG.MODEL_DIRECTION.clone().normalize();
    const moveSpeed = CONFIG.MOVE_SPEED; // Adjust this sensitivity as needed
    const displacement = direction.scale(deltaX * moveSpeed);
    this.dexModelVisualizer.moveModelRoot(displacement);
  }
}