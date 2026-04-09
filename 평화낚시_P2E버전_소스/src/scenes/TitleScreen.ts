import Phaser from 'phaser';
import * as utils from '../utils';

export class TitleScreen extends Phaser.Scene {
  // UI elements
  uiContainer!: Phaser.GameObjects.DOMElement;
  
  // Input controls - HTML event handlers
  keydownHandler?: (event: KeyboardEvent) => void;
  clickHandler?: (event: Event) => void;
  
  // Audio removed for better user experience
  
  // State flags
  isStarting: boolean = false;

  constructor() {
    super({
      key: "TitleScreen",
    });
    this.isStarting = false;
  }

  init(): void {
    // Reset start flag
    this.isStarting = false;
  }

  create(): void {
    // Create DOM UI (includes background)
    this.createDOMUI();

    // Set up input controls
    this.setupInputs();
    
    // Listen for scene shutdown to cleanup event listeners
    this.events.once('shutdown', () => {
      this.cleanupEventListeners();
    });
  }

  createDOMUI(): void {
    
    // Generate SVG Data URL for clickable container
    let uiHTML = `
      <div id="title-screen-container" class="fixed top-0 left-0 w-full h-full pointer-events-none z-[1000] font-retro flex flex-col justify-between items-center" style="image-rendering: pixelated; background-image: url('https://cdn-game-mcp.gambo.ai/ff6a54bb-d70b-4dde-9168-6a5c20e0349d/images/lake_background.png'); background-size: cover; background-position: center; background-repeat: no-repeat;">
        <!-- Main Content Container -->
        <div class="flex flex-col items-center space-y-10 justify-between pt-12 pb-20 w-full text-center pointer-events-auto h-full">
          
          <!-- Game Title Image Container -->
          <div id="game-title-container" class="flex-shrink-0 flex items-center justify-center">
            <img id="game-title-image" 
                 src="https://cdn-game-mcp.gambo.ai/fca8c02c-201a-4f77-988d-d4d06db6db61/images/fishing_game_title.png" 
                 alt="Fishing Game" 
                 class="max-h-[460px] mx-20 object-contain pointer-events-none"
                 style="filter: drop-shadow(4px 4px 8px rgba(0,0,0,0.8));" />
          </div>

          <!-- Press Enter Text -->
          <div id="press-enter-text" class="text-white font-bold pointer-events-none flex-shrink-0" style="
            font-size: 48px;
            text-shadow: 5px 5px 0px #000000;
            animation: titleBlink 1s ease-in-out infinite alternate;
          ">PRESS ENTER</div>

          <!-- JSM 2025 Text -->
          <div id="jsm-2025-text" class="text-white font-bold pointer-events-none flex-shrink-0 mt-8" style="
            font-size: 32px;
            text-shadow: 3px 3px 0px #000000;
            opacity: 0.8;
          ">JSM 2025</div>

        </div>

        <!-- Custom Animations and Styles -->
        <style>
          @keyframes titleBlink {
            from { opacity: 0.3; }
            to { opacity: 1; }
          }
        </style>
      </div>
    `;

    // Add DOM element to the scene
    this.uiContainer = utils.initUIDom(this, uiHTML);
  }

  setupInputs(): void {
    // Add HTML event listeners for keyboard and mouse events
    const handleStart = (event: Event) => {
      event.preventDefault();
      this.startGame();
    };

    // Listen for Enter and Space key events on the document
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Enter' || event.code === 'Space') {
        event.preventDefault();
        this.startGame();
      }
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    
    // Add click event to the UI container
    if (this.uiContainer && this.uiContainer.node) {
      this.uiContainer.node.addEventListener('click', handleStart);
    }

    // Store event listeners for cleanup
    this.keydownHandler = handleKeyDown;
    this.clickHandler = handleStart;
  }

  // Background music removed for better user experience

  startGame(): void {
    // Prevent multiple triggers
    if (this.isStarting) return;
    this.isStarting = true;

    // Clean up event listeners
    this.cleanupEventListeners();

    // Add transition effect
    this.cameras.main.fadeOut(500, 0, 0, 0);
    
    // Start fishing game scene after delay
    this.time.delayedCall(500, () => {
      this.scene.start("FishingGameScene");
    });
  }

  cleanupEventListeners(): void {
    // Remove HTML event listeners
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
    }
    
    if (this.clickHandler && this.uiContainer && this.uiContainer.node) {
      this.uiContainer.node.removeEventListener('click', this.clickHandler);
    }
  }

  update(): void {
    // Title screen doesn't need special update logic
  }
}
