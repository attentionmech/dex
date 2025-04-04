import { AppManager } from "./AppManager";

// Main Initialization
function initialize() {
  const appManager = new AppManager("renderCanvas");
  appManager.initialize();
}

initialize();