import { DexModelVisualizer } from './DexModelVisualiser.js';

export class DexModelManager {
  constructor(scene, uiComponents, dexModelVisualizer) {

    // ui components for the scene for model
    this.activeDisks = [];
    this.dexModelVisualizer = new DexModelVisualizer(scene, uiComponents);
  }

  clear(){
    return this._clearDisks()
  }

  
  create(modelData){
    return this._createDisks(modelData)
  }

  _createDisks(modelData) {
    const { disks, target, extent } = this.dexModelVisualizer.createDisks(modelData);
    this.activeDisks = disks;
    return { disks: this.activeDisks, target, extent };
  }
  
  _clearDisks() {
    this.activeDisks = this.dexModelVisualizer.clearDisks(this.activeDisks);
    return this.activeDisks;
  }


  _getActiveDisks() {
    return this.activeDisks;
  }
}
