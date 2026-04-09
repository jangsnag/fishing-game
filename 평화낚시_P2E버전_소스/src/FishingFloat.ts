import Phaser from "phaser";
import * as utils from "./utils";

export class FishingFloat extends Phaser.GameObjects.Sprite {
  // Float state
  public isBiting: boolean = false;
  
  // Animation properties
  private baseX: number;
  private baseY: number;
  private idleAnimation?: Phaser.Tweens.Tween;
  private biteAnimation?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "fishing_float");

    // Add to scene
    scene.add.existing(this);

    // Store base position
    this.baseX = x;
    this.baseY = y;

    // Use utility function to initialize sprite's size, scale, etc.
    const standardHeight = 32;
    utils.initScale(this, { x: 0.5, y: 0.5 }, undefined, standardHeight);

    // Start idle animation
    this.startIdleAnimation();
  }

  // Start gentle idle floating animation
  startIdleAnimation() {
    this.stopAllAnimations();

    this.idleAnimation = this.scene.tweens.add({
      targets: this,
      x: { from: this.baseX - 3, to: this.baseX + 3 },
      y: { from: this.baseY - 2, to: this.baseY + 2 },
      duration: 2000,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1
    });
  }

  // Start bite animation (stronger movement + red color)
  startBiteAnimation() {
    this.stopAllAnimations();
    this.isBiting = true;

    // Set red tint for bite indication
    this.setTint(0xFF4444);

    this.biteAnimation = this.scene.tweens.add({
      targets: this,
      x: { from: this.baseX - 8, to: this.baseX + 8 },
      y: { from: this.baseY - 5, to: this.baseY + 5 },
      duration: 300,
      ease: "Power2",
      yoyo: true,
      repeat: -1
    });
  }

  // Stop bite animation and return to idle
  stopBiteAnimation() {
    this.stopAllAnimations();
    this.isBiting = false;

    // Clear red tint
    this.clearTint();

    // Return to base position and restart idle animation
    this.setPosition(this.baseX, this.baseY);
    this.startIdleAnimation();
  }

  // Stop all animations
  private stopAllAnimations() {
    if (this.idleAnimation) {
      this.idleAnimation.destroy();
      this.idleAnimation = undefined;
    }
    if (this.biteAnimation) {
      this.biteAnimation.destroy();
      this.biteAnimation = undefined;
    }
  }

  // Update base position (for when player moves)
  setBasePosition(x: number, y: number) {
    this.baseX = x;
    this.baseY = y;

    if (!this.isBiting) {
      this.setPosition(x, y);
    }
  }

  // Clean up when destroyed
  destroy() {
    this.stopAllAnimations();
    super.destroy();
  }
}