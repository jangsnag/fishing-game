import Phaser from "phaser";
import { FisherPlayer } from "../FisherPlayer";
import * as utils from "../utils";
import * as gameConfig from "../gameConfig.json";

type FishingState = "idle" | "casting" | "waiting" | "pulling" | "finishing";

export class FishingGameScene extends Phaser.Scene {
  public player!: FisherPlayer;
  public woodenDock!: Phaser.GameObjects.Image;
  public background!: Phaser.GameObjects.Image;
  public fishingState: FishingState = "idle";
  public isAutoFishing: boolean = false;
  public stateTimer?: Phaser.Time.TimerEvent;

  // 통계
  public totalTries: number = 0;
  public successTries: number = 0;
  public fishCount: number = 0;
  public junkCount: number = 0;
  public fishCollection: { [key: string]: number } = {};

  // P2E 시스템
  public inventory: { [key: string]: number } = {};  // 재료 인벤토리
  public equipment: any[] = [];                        // 보유 장비
  public wallet: number = 0;                           // 보유 코인
  public coinPrice: number = 100;                      // 코인 가상 시세 (KRW)
  public nftMarket: any[] = [];                        // NFT 마켓 등록 장비

  public gameLog: string[] = [];
  public castSound?: Phaser.Sound.BaseSound;
  public biteSound?: Phaser.Sound.BaseSound;
  public successSound?: Phaser.Sound.BaseSound;

  private fishData: any;
  private junkData: any;
  private materialData: any;
  private coinData: any;
  private fishingSettings: any;
  private priceTimer?: Phaser.Time.TimerEvent;

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
    this.createPlayer();
    this.initializeSounds();
    this.startCoinPriceFluctuation();

    this.scene.launch("FishingUIScene", { gameSceneKey: this.scene.key });
  }

  update(): void {}

  initializeFishCollection() {
    this.fishData.forEach((fish: any) => { this.fishCollection[fish.key] = 0; });
  }

  initializeInventory() {
    this.materialData.forEach((mat: any) => { this.inventory[mat.key] = 0; });
  }

  // 코인 시세 랜덤 변동 (10초마다)
  startCoinPriceFluctuation() {
    this.priceTimer = this.time.addEvent({
      delay: 10000,
      loop: true,
      callback: () => {
        const change = Phaser.Math.Between(-15, 20);
        this.coinPrice = Math.max(10, this.coinPrice + change);
        this.events.emit("updateCoinPrice", this.coinPrice);
      }
    });
  }

  createBackground() {
    this.background = this.add.image(
      gameConfig.gameWidth.value / 2, gameConfig.gameHeight.value * 0.4, "lake_background"
    );
    utils.initScale(this.background, { x: 0.5, y: 0.5 }, gameConfig.gameWidth.value, gameConfig.gameHeight.value);
  }

  createDock() {
    this.woodenDock = this.add.image(
      gameConfig.gameWidth.value * 0.25, gameConfig.gameHeight.value * 0.55, "wooden_dock"
    );
    utils.initScale(this.woodenDock, { x: 0.5, y: 0.5 }, undefined, 200);
  }

  createPlayer() {
    this.player = new FisherPlayer(this, gameConfig.gameWidth.value * 0.25, gameConfig.gameHeight.value * 0.5);
    this.player.setDirection("side");
  }

  initializeSounds() {
    this.castSound = this.sound.add("fishing_cast", { volume: 0.3 });
    this.biteSound = this.sound.add("fishing_bite", { volume: 0.3 });
    this.successSound = this.sound.add("fishing_success", { volume: 0.3 });
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
    this.player.setFishingState("idle");
    this.updateStatusText("대기 중...");
  }

  startCastingState() {
    if (!this.isAutoFishing) return;
    this.fishingState = "casting";
    this.player.setFishingState("casting");
    this.updateStatusText("낚시줄 던지는 중...");
    if (gameConfig.soundEnabled.value && this.castSound) this.castSound.play();
    this.stateTimer = this.time.delayedCall(this.fishingSettings.castingTime, () => this.startWaitingState());
  }

  startWaitingState() {
    if (!this.isAutoFishing) return;
    this.fishingState = "waiting";
    this.player.setFishingState("waiting");
    this.updateStatusText("입질 기다리는 중...");
    const waitTime = Phaser.Math.Between(this.fishingSettings.waitTimeMin, this.fishingSettings.waitTimeMax);
    this.stateTimer = this.time.delayedCall(waitTime, () => this.startBiteState());
  }

  startBiteState() {
    if (!this.isAutoFishing) return;
    this.fishingState = "pulling";
    this.player.setFishingState("pulling");
    this.updateStatusText("입질! 손맛 오는 중...");
    if (gameConfig.soundEnabled.value && this.biteSound) this.biteSound.play();
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

    // 코인 획득
    if (rand < settings.coinRate) {
      const coin = Phaser.Utils.Array.GetRandom(this.coinData);
      this.wallet += coin.amount;
      this.addToLog(`${coin.icon} [코인] ${coin.name} +${coin.amount} (지갑: ${this.wallet})`);
      this.events.emit("showResultCard", { item: { ...coin, type: "coin" }, itemType: "코인" });
      this.events.emit("updateWallet", this.wallet);
    }
    // 재료 획득
    else if (rand < settings.coinRate + settings.materialRate) {
      const mat = Phaser.Utils.Array.GetRandom(this.materialData);
      this.inventory[mat.key] = (this.inventory[mat.key] || 0) + 1;
      this.addToLog(`${mat.icon} [재료] ${mat.name} 획득! (${this.inventory[mat.key]}개)`);
      this.events.emit("showResultCard", { item: { ...mat, type: "material" }, itemType: "재료" });
      this.events.emit("updateInventory", this.inventory);
    }
    // 물고기 또는 잡템
    else {
      const isFish = Math.random() < this.fishingSettings.fishRate;
      let caughtItem: any;
      if (isFish) {
        caughtItem = Phaser.Utils.Array.GetRandom(this.fishData);
        this.fishCount++;
        this.fishCollection[caughtItem.key]++;
        this.addToLog(`🐟 [물고기] ${caughtItem.name} 획득!`);
        this.events.emit("showResultCard", { item: { ...caughtItem, type: "fish" }, itemType: "물고기" });
      } else {
        caughtItem = Phaser.Utils.Array.GetRandom(this.junkData);
        this.junkCount++;
        this.addToLog(`🗑️ [잡템] ${caughtItem.name}`);
        this.events.emit("showResultCard", { item: { ...caughtItem, type: "junk" }, itemType: "잡템" });
      }
    }

    if (gameConfig.soundEnabled.value && this.successSound) this.successSound.play();
  }

  handleFailedCatch() { this.addToLog("실패! 놓쳤다."); }

  // 장비 제작
  craftEquipment(recipe: any): boolean {
    // 재료 확인
    for (const [matKey, qty] of Object.entries(recipe.materials)) {
      if ((this.inventory[matKey] || 0) < (qty as number)) return false;
    }
    // 재료 차감
    for (const [matKey, qty] of Object.entries(recipe.materials)) {
      this.inventory[matKey] -= (qty as number);
    }
    // 장비 생성 (능력치 랜덤 보너스 +0~30%)
    const bonus = 1 + Math.random() * 0.3;
    const craftedEq = {
      ...recipe,
      id: Date.now(),
      stats: Object.fromEntries(
        Object.entries(recipe.stats).map(([k, v]) => [k, Math.round((v as number) * bonus)])
      ),
      craftedAt: new Date().toLocaleString(),
      onMarket: false,
      marketPrice: Math.round(recipe.basePrice * bonus)
    };
    this.equipment.push(craftedEq);
    this.addToLog(`⚒️ [제작] ${recipe.icon} ${recipe.name} 완성! (보너스 ${Math.round((bonus-1)*100)}%)`);
    this.events.emit("updateEquipment", this.equipment);
    this.events.emit("updateInventory", this.inventory);
    return true;
  }

  // NFT 마켓 등록
  listOnMarket(eqId: number, price: number) {
    const eq = this.equipment.find((e: any) => e.id === eqId);
    if (!eq || eq.onMarket) return;
    eq.onMarket = true;
    eq.marketPrice = price;
    this.nftMarket.push(eq);
    this.addToLog(`🏪 [마켓] ${eq.icon} ${eq.name} ${price.toLocaleString()} 코인에 등록!`);
    this.events.emit("updateMarket", this.nftMarket);
    this.events.emit("updateEquipment", this.equipment);
  }

  // NFT 마켓 구매 (NPC 자동 구매 시뮬레이션)
  simulateMarketBuy() {
    if (this.nftMarket.length === 0) return;
    const idx = Phaser.Math.Between(0, this.nftMarket.length - 1);
    const eq = this.nftMarket[idx];
    this.wallet += eq.marketPrice;
    this.nftMarket.splice(idx, 1);
    this.equipment = this.equipment.filter((e: any) => e.id !== eq.id);
    this.addToLog(`💸 [마켓] ${eq.icon} ${eq.name} 판매 완료! +${eq.marketPrice} 코인`);
    this.events.emit("updateMarket", this.nftMarket);
    this.events.emit("updateEquipment", this.equipment);
    this.events.emit("updateWallet", this.wallet);
  }

  startFinishingState() {
    this.fishingState = "finishing";
    this.player.setFishingState("idle");
    this.updateStatusText("대기 중...");
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
