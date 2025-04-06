import { Scene, HemisphericLight, Vector3, GlowLayer } from "@babylonjs/core";
import { AdvancedDynamicTexture, Rectangle, TextBlock, ScrollViewer } from "@babylonjs/gui";
import { CONFIG } from "../commons/Configs";

class UIMaker {
  constructor(engine) {
    this.engine = engine;
    this.scene = this.createScene();
    this.lights = this.setupLights();
    this.glow = this.setupGlow();
    this.uiComponents = this.setupInfoPanel();
  }

  // Scene Setup
  createScene() {
    const scene = new Scene(this.engine);
    scene.clearColor = CONFIG.BACKGROUND_COLOR;
    return scene;
  }

  // Lighting Setup
  setupLights() {
    const upperLight = new HemisphericLight("upperLight", new Vector3(1000, 1000, 0), this.scene);
    const lowerLight = new HemisphericLight("lowerLight", new Vector3(-1000, -1000, 0), this.scene);
    return [upperLight, lowerLight];
  }

  // Glow Effect Setup
  setupGlow() {
    const glow = new GlowLayer("glowEffect", this.scene);
    glow.intensity = CONFIG.GLOW_INTENSITY;
    return glow;
  }

  // GUI Setup for Info Panel
  // GUI Setup for Info Panel
setupInfoPanel() {
  const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI("UI");

  const infoPanel = new Rectangle();
  infoPanel.width = CONFIG.PANEL_WIDTH;
  infoPanel.height = CONFIG.PANEL_HEIGHT;
  infoPanel.color = "#FFFFFF";
  infoPanel.thickness = 2;
  infoPanel.background = "rgba(0, 0, 0, 0.5)";
  infoPanel.horizontalAlignment = Rectangle.ALIGN_RIGHT;
  infoPanel.verticalAlignment = Rectangle.ALIGN_TOP;
  infoPanel.left = -CONFIG.PANEL_RIGHT_OFFSET;
  infoPanel.top = CONFIG.PANEL_TOP_OFFSET;
  infoPanel.isVisible = true;

  // Create ScrollViewer
  const scrollViewer = new ScrollViewer();
  scrollViewer.width = 1.0; // Full width of infoPanel
  scrollViewer.height = 1.0; // Full height of infoPanel
  scrollViewer.thickness = 0;
  scrollViewer.barColor = "gray";
  scrollViewer.color = "white";
  scrollViewer.background = "transparent";
  scrollViewer.verticalAlignment = Rectangle.ALIGN_TOP;
  scrollViewer.horizontalAlignment = Rectangle.ALIGN_LEFT;

  // TextBlock that goes inside scrollViewer
  const panelText = new TextBlock();
  panelText.text = "loshdex";
  panelText.color = "white";
  panelText.fontSize = 16;
  panelText.textWrapping = true;
  panelText.textHorizontalAlignment = TextBlock.HORIZONTAL_ALIGNMENT_LEFT;
  panelText.paddingLeft = "10px";
  panelText.paddingRight = "10px";
  panelText.paddingTop = "10px";
  panelText.resizeToFit = true; // IMPORTANT: this enables scroll to work

  scrollViewer.addControl(panelText);
  infoPanel.addControl(scrollViewer);
  advancedTexture.addControl(infoPanel);

  return { advancedTexture, infoPanel, panelText };
}


  // Scene Management
  clearScene(disks) {
    disks.forEach(disk => disk.dispose());
    return [];
  }

  // UI Setup
  setupUI(modelData, renderFn) {
    const modelSelector = document.getElementById("modelSelect");
    modelSelector.innerHTML = "";
    Object.keys(modelData.modelLayerData).forEach(modelName => {
      const option = document.createElement("option");
      option.value = modelName;
      option.textContent = modelName;
      modelSelector.appendChild(option);
    });
    modelSelector.addEventListener("change-model", () => renderFn(modelSelector.value));
    if (Object.keys(modelData).length > 0) renderFn(Object.keys(modelData)[0]);
  }
}

export { UIMaker };