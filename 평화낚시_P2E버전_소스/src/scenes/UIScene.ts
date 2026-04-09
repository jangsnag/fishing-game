import Phaser from "phaser"

export default class UIScene extends Phaser.Scene {
  private currentGameSceneKey: string | null;
  private uiContainer: Phaser.GameObjects.DOMElement | null;

  constructor() {
    super({
      key: "UIScene",
    });
    this.currentGameSceneKey = null;
    this.uiContainer = null;
  }
  
  init(data: { gameSceneKey?: string }) {
    // Receive current game scene key
    this.currentGameSceneKey = data.gameSceneKey || null;
  }
}