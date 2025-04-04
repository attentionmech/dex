import { Color3, Vector3 } from "@babylonjs/core";

// Configuration

export const CONFIG = {
  BACKGROUND_COLOR: new Color3(0.1, 0.1, 0.1),
  CAMERA_ALPHA: Math.PI / 4,
  CAMERA_BETA: Math.PI / 3,
  CAMERA_RADIUS: 4000,
  CAMERA_TARGET: new Vector3(0, 0, 0),
  DISK_MIN_SIZE: 100,
  DISK_MAX_SIZE: 800,
  DISK_THICKNESS: 50,
  GLOW_INTENSITY: 0.3,
  COLOR_EMISSIVE_MULTIPLIERS: 4,
  DISK_SPACING_MULTIPLIER: 1.7,
  STARTING_Y_POSITION: 0,
  TOOLTIP_OFFSET_X: 10,
  TOOLTIP_OFFSET_Y: 10,
  PANEL_WIDTH: "200px",
  PANEL_HEIGHT: "100px",
  PANEL_RIGHT_OFFSET: -40,
  PANEL_TOP_OFFSET: 40,
  START_POSITION: new Vector3(0, 0, 0), // Default starting position as Vector3 (x, y, z)
  MODEL_DIRECTION: new Vector3(1,0, 0),  // Default direction as Vector3 (x-axis)};
  MOVE_SPEED: 5
}
