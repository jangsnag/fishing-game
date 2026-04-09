import Phaser from "phaser";
import { gameWidth, gameHeight, soundEnabled, musicEnabled } from "./gameConfig.json";
import "./styles/tailwind.css";
import { Preloader } from "./scenes/Preloader";
import { TitleScreen } from "./scenes/TitleScreen";
import { FishingGameScene } from "./scenes/FishingGameScene";
import { FishingUIScene } from "./scenes/FishingUIScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: gameWidth.value,
  height: gameHeight.value,
  backgroundColor: "#000000",
  parent: 'game-container',
  dom: {
    createContainer: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      fps: 120,
      debug: false,
      debugShowBody: false,
      debugShowStaticBody: false,
      debugShowVelocity: false,
    },
  },
  pixelArt: true,
};

const game = new Phaser.Game(config);
// Strictly add scenes in the following order: Preloader, TitleScreen, level scenes, UI-related scenes

// Preloader: Load all game resources
game.scene.add("Preloader", Preloader, true);

// TitleScreen
game.scene.add("TitleScreen", TitleScreen);

// Game scenes
game.scene.add("FishingGameScene", FishingGameScene);

// UI-related scenes
game.scene.add("FishingUIScene", FishingUIScene);