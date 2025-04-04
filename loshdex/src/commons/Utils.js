import {Vector3} from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";


function drawRedLineThroughModel(model, scene) {
    // Define line points in local space, centered on model
    const linePoints = [
      new Vector3(-5, 0, 0),  // From left of model
      new Vector3(5, 0, 0)    // To right of model
    ];
  
    const redLine = MeshBuilder.CreateLines("redLine", {
      points: linePoints
    }, scene);
  
    redLine.color = new Color3(1, 0, 0); // Red
  
    // Attach the line to the model so it moves with it
    redLine.parent = model;
  }


// export

  