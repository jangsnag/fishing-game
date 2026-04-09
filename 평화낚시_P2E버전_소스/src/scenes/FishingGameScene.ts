import Phaser from "phaser";
import * as utils from "../utils";
import * as gameConfig from "../gameConfig.json";

type FishingState = "idle" | "casting" | "waiting" | "pulling" | "finishing";

export class FishingGameScene extends Phaser.Scene {
  public woodenDock!: Phaser.GameObjects.Image;
  public background!: Phaser.GameObjects.Image;
  public fishingState: FishingState = "idle";
  public isAutoFishing: boolean = false;
  public stateTimer?: Phaser.Time.TimerEvent;

  // 새 스프라이트
  private charSprite!: Phaser.GameObjects.Sprite;
  private catchEffect!: Phaser.GameObjects.Sprite;
  private idleWaterSprite!: Phaser.GameObjects.Sprite;
  private goldenFishSprite!: Phaser.GameObjects.Sprite;
  private floatingFish: Phaser.GameObjects.Sprite[] = [];
  private rippleGraphics!: Phaser.GameObjects.Graphics;

  // 통계
  public totalTries: number = 0;
  public successTries: number = 0;
  public fishCount: number = 0;
  public junkCount: number = 0;
  public fishCollection: { [key: string]: number } = {};

  // P2E
  public inventory: { [key: string]: number } = {};
  public equipment: any[] = [];
  public wallet: number = 0;
  public coinPrice: number = 100;
  public nftMarket: any[] = [];
  public coinHistory: number[] = [100];

  public gameLog: string[] = [];
  public castSound?: Phaser.Sound.BaseSound;
  public biteSound?: Phaser.Sound.BaseSound;
  public successSound?: Phaser.Sound.BaseSound;

  private fishData: any;
  private junkData: any;
  private materialData: any;
  private coinData: any;
  private fishingSettings: any;

  constructor() { super({ key: "FishingGameScene" }); }

  create(): void {
    this.fishData = gameConfig.fishData.value.fish;
    this.junkData = gameConfig.fishData.value.junk;
    this.materialData = (gameConfig.fishData.value as any).materials;
    this.coinData = (gameConfig.fishData.value as any).coins;
    this.fishingSettings = gameConfig.fishingSettings.value;

    this.initializeFishCollection();
    this.initializeInventory();
    this.createBackground();
    this.createDock();
    this.createWaterEffects();
    this.createCharacter();
    this.createFloatingFish();
    this.initializeSounds();
    this.startCoinPriceFluctuation();

    this.scene.launch("FishingUIScene", { gameSceneKey: this.scene.key });
  }

  update(time: number): void {
    // 물결 애니메이션
    if (this.rippleGraphics) {
      const alpha = 0.3 + Math.sin(time * 0.002) * 0.2;
      this.rippleGraphics.setAlpha(alpha);
    }
  }

  initializeFishCollection() {
    this.fishData.forEach((f: any) => { this.fishCollection[f.key] = 0; });
  }

  initializeInventory() {
    this.materialData.forEach((m: any) => { this.inventory[m.key] = 0; });
  }

  createBackground() {
    // 새 배경 사용
    try {
      this.background = this.add.image(
        gameConfig.gameWidth.value / 2, gameConfig.gameHeight.value * 0.38, 'bg_new'
      );
      const scaleX = gameConfig.gameWidth.value / this.background.width;
      const scaleY = (gameConfig.gameHeight.value * 0.65) / this.background.height;
      this.background.setScale(Math.max(scaleX, scaleY));
    } catch(e) {
      this.background = this.add.image(
        gameConfig.gameWidth.value / 2, gameConfig.gameHeight.value * 0.4, "lake_background"
      );
      utils.initScale(this.background, { x: 0.5, y: 0.5 }, gameConfig.gameWidth.value, gameConfig.gameHeight.value);
    }
  }

  createDock() {
    this.woodenDock = this.add.image(
      gameConfig.gameWidth.value * 0.25, gameConfig.gameHeight.value * 0.55, "wooden_dock"
    );
    utils.initScale(this.woodenDock, { x: 0.5, y: 0.5 }, undefined, 200);
  }

  createWaterEffects() {
    const W = gameConfig.gameWidth.value;
    const H = gameConfig.gameHeight.value;

    // 물결 효과
    this.rippleGraphics = this.add.graphics();
    this.rippleGraphics.lineStyle(2, 0x4FC3F7, 0.4);
    for (let i = 0; i < 5; i++) {
      const y = H * 0.52 + i * 18;
      this.rippleGraphics.strokeEllipse(W * 0.5, y, W * 0.6 - i * 30, 15);
    }
    this.rippleGraphics.setDepth(1);

    // 대기 물 애니메이션 스프라이트
    try {
      this.idleWaterSprite = this.add.sprite(W * 0.55, H * 0.5, 'idle_water');
      this.idleWaterSprite.setScale(1.5).setAlpha(0.8).setDepth(2);
      this.idleWaterSprite.play('anim_idle_water');
      this.idleWaterSprite.setVisible(false);
    } catch(e) {}
  }

  createCharacter() {
    const W = gameConfig.gameWidth.value;
    const H = gameConfig.gameHeight.value;

    try {
      // 새 캐릭터 스프라이트
      this.charSprite = this.add.sprite(W * 0.22, H * 0.48, 'char_idle');
      this.charSprite.setScale(2.5).setDepth(5).setFlipX(true);
      this.charSprite.play('anim_char_idle');

      // 캐치 이펙트 스프라이트
      this.catchEffect = this.add.sprite(W * 0.55, H * 0.48, 'catch_sheet');
      this.catchEffect.setScale(2).setDepth(6).setVisible(false);
    } catch(e) {
      console.log("캐릭터 스프라이트 로드 실패", e);
    }
  }

  createFloatingFish() {
    const W = gameConfig.gameWidth.value;
    const H = gameConfig.gameHeight.value;

    // 배경에 헤엄치는 물고기들
    try {
      for (let i = 0; i < 3; i++) {
        const fish = this.add.sprite(
          W * (0.3 + i * 0.2), H * (0.44 + Math.random() * 0.08),
          'fish_sprite'
        );
        fish.setScale(0.8 + Math.random() * 0.4).setAlpha(0.6).setDepth(3);
        this.floatingFish.push(fish);

        // 헤엄치는 트윈
        this.tweens.add({
          targets: fish,
          x: fish.x + Phaser.Math.Between(-80, 80),
          y: fish.y + Phaser.Math.Between(-20, 20),
          alpha: { from: 0.4, to: 0.8 },
          duration: Phaser.Math.Between(2000, 4000),
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
          delay: i * 500
        });
      }

      // 황금 물고기 (가끔 등장)
      this.goldenFishSprite = this.add.sprite(W * 0.7, H * 0.46, 'golden_fish');
      this.goldenFishSprite.setScale(2).setDepth(4).setVisible(false);
      this.goldenFishSprite.play('anim_golden_fish');
    } catch(e) {}
  }

  initializeSounds() {
    this.castSound = this.sound.add("fishing_cast", { volume: 0.3 });
    this.biteSound = this.sound.add("fishing_bite", { volume: 0.3 });
    this.successSound = this.sound.add("fishing_success", { volume: 0.3 });
  }

  startCoinPriceFluctuation() {
    this.time.addEvent({
      delay: 10000, loop: true,
      callback: () => {
        const change = Phaser.Math.Between(-15, 20);
        this.coinPrice = Math.max(10, this.coinPrice + change);
        this.coinHistory.push(this.coinPrice);
        if (this.coinHistory.length > 20) this.coinHistory.shift();
        this.events.emit("updateCoinPrice", { price: this.coinPrice, history: this.coinHistory });
      }
    });
  }

  startAutoFishing() {
    if (this.isAutoFishing) return;
    this.isAutoFishing = true;
    this.startCastingState();
  }

  stopAutoFishing() {
    this.isAutoFishing = false;
    this.clearStateTimer();
    this.fishingState = "idle";
    this.updateStatusText("대기 중...");
    this.setCharAnim('idle');
    if (this.idleWaterSprite) this.idleWaterSprite.setVisible(false);
  }

  setCharAnim(state: 'idle' | 'reel' | 'cast') {
    if (!this.charSprite) return;
    try {
      if (state === 'idle') this.charSprite.play('anim_char_idle');
      else if (state === 'reel') this.charSprite.play('anim_char_reel');
      else if (state === 'cast') this.charSprite.play('anim_cast');
    } catch(e) {}
  }

  startCastingState() {
    if (!this.isAutoFishing) return;
    this.fishingState = "casting";
    this.setCharAnim('cast');
    this.updateStatusText("낚시줄 던지는 중...");
    if (gameConfig.soundEnabled.value && this.castSound) this.castSound.play();

    // 캐스팅 파티클
    this.showCastEffect();

    this.stateTimer = this.time.delayedCall(this.fishingSettings.castingTime, () => this.startWaitingState());
  }

  showCastEffect() {
    const W = gameConfig.gameWidth.value; const H = gameConfig.gameHeight.value;
    const particles = this.add.particles(W * 0.5, H * 0.5, undefined, {
      speed: { min: 30, max: 80 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: [0x4FC3F7, 0x81D4FA, 0xFFFFFF],
      lifespan: 600,
      quantity: 8,
      duration: 300
    });
    this.time.delayedCall(800, () => { try { particles.destroy(); } catch(e) {} });

    // 물결 효과
    if (this.idleWaterSprite) {
      this.idleWaterSprite.setVisible(true);
      this.tweens.add({
        targets: this.idleWaterSprite,
        scaleX: { from: 0.5, to: 2 },
        scaleY: { from: 0.5, to: 2 },
        alpha: { from: 1, to: 0 },
        duration: 1000,
        ease: 'Power2',
        onComplete: () => { if (this.idleWaterSprite) { this.idleWaterSprite.setScale(1.5).setAlpha(0.8); } }
      });
    }
  }

  startWaitingState() {
    if (!this.isAutoFishing) return;
    this.fishingState = "waiting";
    this.setCharAnim('idle');
    this.updateStatusText("입질 기다리는 중...");
    if (this.idleWaterSprite) this.idleWaterSprite.setVisible(true);
    const waitTime = Phaser.Math.Between(this.fishingSettings.waitTimeMin, this.fishingSettings.waitTimeMax);
    this.stateTimer = this.time.delayedCall(waitTime, () => this.startBiteState());
  }

  startBiteState() {
    if (!this.isAutoFishing) return;
    this.fishingState = "pulling";
    this.setCharAnim('reel');
    this.updateStatusText("입질! 손맛 오는 중...");
    if (gameConfig.soundEnabled.value && this.biteSound) this.biteSound.play();

    // 화면 흔들기
    this.cameras.main.shake(300, 0.005);

    this.stateTimer = this.time.delayedCall(this.fishingSettings.biteTime, () => this.processFishingResult());
  }

  processFishingResult() {
    this.totalTries++;
    const isSuccess = Math.random() < this.fishingSettings.successRate;
    if (isSuccess) { this.successTries++; this.handleSuccessfulCatch(); }
    else { this.handleFailedCatch(); }
    this.updateStatistics();
    this.startFinishingState();
  }

  handleSuccessfulCatch() {
    const rand = Math.random();
    const settings = this.fishingSettings as any;
    if (gameConfig.soundEnabled.value && this.successSound) this.successSound.play();

    // 성공 이펙트
    this.showCatchEffect();

    if (rand < settings.coinRate) {
      const coin = Phaser.Utils.Array.GetRandom(this.coinData);
      this.wallet += coin.amount;
      this.addToLog(`${coin.icon} [코인] ${coin.name} +${coin.amount} (지갑: ${this.wallet})`);
      this.events.emit("showResultCard", { item: { ...coin, type: "coin" }, itemType: "코인" });
      this.events.emit("updateWallet", this.wallet);
    } else if (rand < settings.coinRate + settings.materialRate) {
      const mat = Phaser.Utils.Array.GetRandom(this.materialData);
      this.inventory[mat.key] = (this.inventory[mat.key] || 0) + 1;
      this.addToLog(`${mat.icon} [재료] ${mat.name} 획득! (${this.inventory[mat.key]}개)`);
      this.events.emit("showResultCard", { item: { ...mat, type: "material" }, itemType: "재료" });
      this.events.emit("updateInventory", this.inventory);
    } else {
      const isFish = Math.random() < this.fishingSettings.fishRate;
      if (isFish) {
        const fish = Phaser.Utils.Array.GetRandom(this.fishData);
        this.fishCount++;
        this.fishCollection[fish.key]++;
        // 황금 물고기면 특별 이펙트
        if (fish.rarity === 'legend' || fish.rarity === 'rare') this.showGoldenFishEffect();
        this.addToLog(`🐟 [물고기] ${fish.name} 획득!`);
        this.events.emit("showResultCard", { item: { ...fish, type: "fish" }, itemType: "물고기" });
      } else {
        const junk = Phaser.Utils.Array.GetRandom(this.junkData);
        this.junkCount++;
        this.addToLog(`🗑️ [잡템] ${junk.name}`);
        this.events.emit("showResultCard", { item: { ...junk, type: "junk" }, itemType: "잡템" });
      }
    }
  }

  showCatchEffect() {
    const W = gameConfig.gameWidth.value; const H = gameConfig.gameHeight.value;
    // 물튀김 이펙트
    if (this.catchEffect) {
      this.catchEffect.setVisible(true).setPosition(W * 0.5, H * 0.47);
      this.catchEffect.play('anim_catch');
      this.catchEffect.once('animationcomplete', () => {
        if (this.catchEffect) this.catchEffect.setVisible(false);
      });
    }
    // 황금 파티클
    this.add.particles(W * 0.5, H * 0.45, undefined, {
      speed: { min: 50, max: 150 },
      angle: { min: 240, max: 300 },
      scale: { start: 0.5, end: 0 },
      tint: [0xFFD700, 0xFFA500, 0xFFFFFF],
      lifespan: 800, quantity: 12, duration: 200
    });
  }

  showGoldenFishEffect() {
    if (!this.goldenFishSprite) return;
    this.goldenFishSprite.setVisible(true).setPosition(
      gameConfig.gameWidth.value * 0.5, gameConfig.gameHeight.value * 0.45
    );
    this.tweens.add({
      targets: this.goldenFishSprite,
      y: gameConfig.gameHeight.value * 0.35,
      alpha: { from: 1, to: 0 },
      scaleX: { from: 2, to: 4 }, scaleY: { from: 2, to: 4 },
      duration: 1500, ease: 'Power2',
      onComplete: () => { if (this.goldenFishSprite) this.goldenFishSprite.setVisible(false); }
    });
  }

  handleFailedCatch() {
    this.addToLog("실패! 놓쳤다.");
    this.cameras.main.flash(200, 255, 0, 0, false);
  }

  craftEquipment(recipe: any): boolean {
    for (const [k, v] of Object.entries(recipe.materials)) {
      if ((this.inventory[k] || 0) < (v as number)) return false;
    }
    for (const [k, v] of Object.entries(recipe.materials)) { this.inventory[k] -= (v as number); }
    const bonus = 1 + Math.random() * 0.3;
    const craftedEq = {
      ...recipe, id: Date.now(),
      stats: Object.fromEntries(Object.entries(recipe.stats).map(([k, v]) => [k, Math.round((v as number) * bonus)])),
      craftedAt: new Date().toLocaleString(), onMarket: false,
      marketPrice: Math.round(recipe.basePrice * bonus)
    };
    this.equipment.push(craftedEq);
    this.addToLog(`⚒️ [제작] ${recipe.icon} ${recipe.name} 완성! (보너스 ${Math.round((bonus-1)*100)}%)`);
    this.events.emit("updateEquipment", this.equipment);
    this.events.emit("updateInventory", this.inventory);
    return true;
  }

  listOnMarket(eqId: number, price: number) {
    const eq = this.equipment.find((e: any) => e.id === eqId);
    if (!eq || eq.onMarket) return;
    eq.onMarket = true; eq.marketPrice = price;
    this.nftMarket.push(eq);
    this.addToLog(`🏪 [마켓] ${eq.icon} ${eq.name} ${price.toLocaleString()} 코인에 등록!`);
    this.events.emit("updateMarket", this.nftMarket);
    this.events.emit("updateEquipment", this.equipment);
  }

  simulateMarketBuy() {
    if (this.nftMarket.length === 0) return;
    const idx = Phaser.Math.Between(0, this.nftMarket.length - 1);
    const eq = this.nftMarket[idx];
    this.wallet += eq.marketPrice;
    this.nftMarket.splice(idx, 1);
    this.equipment = this.equipment.filter((e: any) => e.id !== eq.id);
    this.addToLog(`💸 [마켓] ${eq.icon} ${eq.name} 판매! +${eq.marketPrice} 코인`);
    this.events.emit("updateMarket", this.nftMarket);
    this.events.emit("updateEquipment", this.equipment);
    this.events.emit("updateWallet", this.wallet);
  }

  startFinishingState() {
    this.fishingState = "finishing";
    this.setCharAnim('idle');
    this.updateStatusText("대기 중...");
    if (this.idleWaterSprite) this.idleWaterSprite.setVisible(false);
    this.stateTimer = this.time.delayedCall(this.fishingSettings.waitAfterFishing, () => {
      if (this.isAutoFishing) this.startCastingState();
      else this.fishingState = "idle";
    });
  }

  clearStateTimer() {
    if (this.stateTimer) { this.stateTimer.destroy(); this.stateTimer = undefined; }
  }

  updateStatusText(text: string) { this.events.emit("updateStatusText", text); }

  updateStatistics() {
    const successRate = this.totalTries > 0 ? Math.round((this.successTries / this.totalTries) * 100) : 0;
    this.events.emit("updateStatistics", { fishCount: this.fishCount, junkCount: this.junkCount, successRate });
  }

  addToLog(message: string) {
    this.gameLog.unshift(message);
    if (this.gameLog.length > 20) this.gameLog.pop();
    this.events.emit("updateGameLog", this.gameLog);
  }

  getFishCollection() { return this.fishCollection; }
  getFishData() { return this.fishData; }
  getMaterialData() { return this.materialData; }
  getEquipmentRecipes() { return (gameConfig as any).equipmentRecipes.value; }
}
