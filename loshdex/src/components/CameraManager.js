import { ArcRotateCamera } from "@babylonjs/core";
import { CONFIG } from "../commons/Configs";

// CameraManager Class for predefined camera modes
export class CameraManager {
  constructor(scene, canvas) {
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
    this.setMode("interactive"); // Initial mode
  }

  setMode(mode, target = CONFIG.CAMERA_TARGET, extent = 1600) {
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
}
