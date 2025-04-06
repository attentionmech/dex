import { Color3, Vector3 } from "@babylonjs/core";

// Configuration

export const CONFIG = {
  BACKGROUND_COLOR: new Color3(0.1, 0.1, 0.1),
  CAMERA_ALPHA: Math.PI / 4,
  CAMERA_BETA: Math.PI / 3,
  CAMERA_RADIUS: 100,
  CAMERA_TARGET: new Vector3(0, 0, 0),
  DISK_MIN_SIZE: 100,
  DISK_MAX_SIZE: 2000,
  DISK_THICKNESS: 40,
  LAYER_MINOR_OFFSET: 5, // or tweak to taste

  // GLOW_INTENSITY: 0,
  COLOR_EMISSIVE_MULTIPLIERS: 0.1,
  DISK_SPACING_MULTIPLIER: 2,
  STARTING_Y_POSITION: 0,
  TOOLTIP_OFFSET_X: 10,
  TOOLTIP_OFFSET_Y: 10,
  PANEL_WIDTH: "400px",
  PANEL_HEIGHT: "600px",
  PANEL_RIGHT_OFFSET: -40,
  PANEL_TOP_OFFSET: 100,
  START_POSITION: new Vector3(0, 0, 0), // Default starting position as Vector3 (x, y, z)
  MODEL_DIRECTION: new Vector3(-1,0, 0),  // Default direction as Vector3 (x-axis)};
  MOVE_SPEED: 60,

  DEFAULT_MODEL: "meta-llama/Llama-4-Maverick-17B-128E-Instruct",
}
