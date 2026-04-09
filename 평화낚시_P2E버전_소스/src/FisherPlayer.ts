import Phaser from "phaser";
import * as utils from "./utils";

type Direction = "front" | "back" | "side";
type FishingState = "idle" | "casting" | "waiting" | "pulling";

export class FisherPlayer extends Phaser.GameObjects.Sprite {
  // Character attributes
  public direction: Direction;
  public fishingState: FishingState;

  // Animation control
  public currentAnimation: string = "";

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "fisherman_idle_front_frame1");

    // Add to scene
    scene.add.existing(this);

    // Initialize character attributes
    this.direction = "front";
    this.fishingState = "idle";

    // Use utility function to initialize sprite's size, scale, etc.
    const standardHeight = 128;
    utils.initScale(this, { x: 0.5, y: 1.0 }, undefined, standardHeight);
  }

  // Play animation and reset origin and offset
  playAnimation(animKey: string) {
    if (this.currentAnimation !== animKey) {
      this.currentAnimation = animKey;
      this.play(animKey, true);
      // Convert direction to utils format for resetOriginAndOffset
      const utilsDirection = this.direction === "front" ? "down" : 
                           this.direction === "back" ? "up" : "right";
      utils.resetOriginAndOffset(this, utilsDirection as "left" | "right" | "up" | "down");
    }
  }

  // Set character direction and update animation
  setDirection(direction: Direction) {
    this.direction = direction;
    this.updateAnimation();
  }

  // Set fishing state and update animation
  setFishingState(state: FishingState) {
    this.fishingState = state;
    this.updateAnimation();
  }

  // Update animation based on current state and direction
  private updateAnimation() {
    let animKey = "";

    switch (this.fishingState) {
      case "idle":
        animKey = `fisherman_idle_${this.direction}_anim`;
        break;
      case "casting":
        animKey = "fisherman_cast_side_anim";
        break;
      case "waiting":
        // Use gentle waiting animation with subtle movement
        animKey = "fisherman_waiting_side_anim";
        break;
      case "pulling":
        animKey = "fisherman_pull_side_anim";
        break;
    }

    this.playAnimation(animKey);
  }
}