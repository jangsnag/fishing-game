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
  public successCount: number = 0;
  public failCount: number = 0;
  public fishCollection: { [key: string]: number } = {};

  // P2E
  public inventory: { [key: string]: number } = {};
  public equipment: any[] = [];
  public equippedItem: any = null;
  public wallet: number = 0;
  public coinPrice: number = 100;
  public coinHistory: number[] = [100, 100];
  public nftMarket: any[] = [];
  public gameLog: string[] = [];

  // 장착 능력치 (실제 적용)
  public bonusSpeed: number = 0;   // 낚시속도 보너스 (waitTime 감소%)
  public bonusLuck: number = 0;    // 획득률 보너스 (successRate 증가%)

  // 사운드
  public castSound?: Phaser.Sound.BaseSound;
  public biteSound?: Phaser.Sound.BaseSound;
  public successSound?: Phaser.Sound.BaseSound;
  public failSound?: Phaser.Sound.BaseSound;

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
    this.fishingSettings = { ...gameConfig.fishingSettings.value };

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
    this.fishData.forEach((f: any) => { this.fishCollection[f.key] = 0; });
  }

  initializeInventory() {
    this.materialData.forEach((m: any) => { this.inventory[m.key] = 0; });
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
    this.player = new FisherPlayer(
      this, gameConfig.gameWidth.value * 0.25, gameConfig.gameHeight.value * 0.5
    );
    this.player.setDirection("side");
  }

  initializeSounds() {
    try { this.castSound = this.sound.add("fishing_cast", { volume: 0.3 }); } catch(e) {}
    try { this.biteSound = this.sound.add("fishing_bite", { volume: 0.3 }); } catch(e) {}
    try { this.successSound = this.sound.add("fishing_success", { volume: 0.5 }); } catch(e) {}
    try { this.failSound = this.sound.add("fishing_bite", { volume: 0.15, rate: 0.4 }); } catch(e) {}
  }

  // 장비 장착 - 능력치 실제 적용
  equipItem(eq: any) {
    this.equippedItem = eq;
    this.bonusSpeed = eq ? (eq.stats["낚시속도"] || 0) : 0;
    this.bonusLuck  = eq ? (eq.stats["획득률"] || 0) : 0;
    this.addToLog(`⚔️ [${eq ? eq.name : "없음"}] 장착! 속도+${this.bonusSpeed}% 획득률+${this.bonusLuck}%`);
    this.events.emit("updateEquipped", this.equippedItem);
  }

  // 실제 적용된 대기시간 계산
  getWaitTime(): number {
    const base = Phaser.Math.Between(this.fishingSettings.waitTimeMin, this.fishingSettings.waitTimeMax);
    const speedMult = 1 - Math.min(this.bonusSpeed / 100, 0.8); // 최대 80% 감소
    return Math.round(base * speedMult);
  }

  // 실제 적용된 성공률 계산
  getSuccessRate(): number {
    return Math.min(this.fishingSettings.successRate + this.bonusLuck / 100, 0.98);
  }

  startCoinPriceFluctuation() {
    this.time.addEvent({
      delay: 10000, loop: true,
      callback: () => {
        const change = Phaser.Math.Between(-20, 25);
        this.coinPrice = Math.max(10, Math.min(1000, this.coinPrice + change));
        this.coinHistory.push(this.coinPrice);
        if (this.coinHistory.length > 20) this.coinHistory.shift();
        this.events.emit("updateCoinPrice", { price: this.coinPrice, history: [...this.coinHistory] });
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
    this.updateStatusText(`입질 기다리는 중... (속도+${this.bonusSpeed}%)`);
    this.stateTimer = this.time.delayedCall(this.getWaitTime(), () => this.startBiteState());
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
    const isSuccess = Math.random() < this.getSuccessRate();
    if (isSuccess) {
      this.successTries++;
      this.successCount++;
      this.handleSuccessfulCatch();
    } else {
      this.failCount++;
      this.handleFailedCatch();
    }
    this.updateStatistics();
    this.startFinishingState();
  }

  handleSuccessfulCatch() {
    if (gameConfig.soundEnabled.value && this.successSound) this.successSound.play();
    const rand = Math.random();
    const s = this.fishingSettings as any;

    if (rand < s.coinRate) {
      const coin = Phaser.Utils.Array.GetRandom(this.coinData);
      this.wallet += coin.amount;
      this.addToLog(`✅ 성공! ${coin.icon} ${coin.name} +${coin.amount}코인`);
      this.events.emit("showResultCard", { item: { ...coin, type: "coin" }, itemType: "코인" });
      this.events.emit("updateWallet", this.wallet);
    } else if (rand < s.coinRate + s.materialRate) {
      const mat = Phaser.Utils.Array.GetRandom(this.materialData);
      this.inventory[mat.key] = (this.inventory[mat.key] || 0) + 1;
      this.addToLog(`✅ 성공! ${mat.icon} ${mat.name} 획득 (${this.inventory[mat.key]}개)`);
      this.events.emit("showResultCard", { item: { ...mat, type: "material" }, itemType: "재료" });
      this.events.emit("updateInventory", this.inventory);
    } else {
      const isFish = Math.random() < this.fishingSettings.fishRate;
      if (isFish) {
        const fish = Phaser.Utils.Array.GetRandom(this.fishData);
        this.fishCollection[fish.key]++;
        this.addToLog(`✅ 성공! 🐟 ${fish.name} 낚음!`);
        this.events.emit("showResultCard", { item: { ...fish, type: "fish" }, itemType: "물고기" });
      } else {
        const junk = Phaser.Utils.Array.GetRandom(this.junkData);
        this.addToLog(`✅ 성공! 🗑️ ${junk.name} 건짐`);
        this.events.emit("showResultCard", { item: { ...junk, type: "junk" }, itemType: "잡템" });
      }
    }
  }

  handleFailedCatch() {
    if (gameConfig.soundEnabled.value && this.failSound) this.failSound.play();
    this.addToLog("❌ 실패! 놓쳤다...");
    this.events.emit("showFailEffect");
  }

  craftEquipment(recipe: any): boolean {
    for (const [k, v] of Object.entries(recipe.materials)) {
      if ((this.inventory[k] || 0) < (v as number)) return false;
    }
    for (const [k, v] of Object.entries(recipe.materials)) {
      this.inventory[k] -= (v as number);
    }
    const bonus = 1 + Math.random() * 0.3;
    const eq = {
      ...recipe,
      id: Date.now(),
      stats: Object.fromEntries(Object.entries(recipe.stats).map(([k, v]) => [k, Math.round((v as number) * bonus)])),
      craftedAt: new Date().toLocaleString(),
      onMarket: false,
      equipped: false,
      marketPrice: Math.round(recipe.basePrice * bonus)
    };
    this.equipment.push(eq);
    this.addToLog(`⚒️ 제작 완료! ${recipe.icon} ${recipe.name} (보너스 ${Math.round((bonus-1)*100)}%)`);
    this.events.emit("updateEquipment", this.equipment);
    this.events.emit("updateInventory", this.inventory);
    return true;
  }

  listOnMarket(eqId: number, price: number) {
    const eq = this.equipment.find((e: any) => e.id === eqId);
    if (!eq || eq.onMarket) return;
    if (eq.equipped) { this.equipItem(null); }
    eq.onMarket = true;
    eq.marketPrice = price;
    this.nftMarket.push(eq);
    this.addToLog(`🏪 마켓 등록: ${eq.icon} ${eq.name} ${price.toLocaleString()}코인`);
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
    this.addToLog(`💸 판매 완료! ${eq.icon} ${eq.name} +${eq.marketPrice}코인`);
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
    this.events.emit("updateStatistics", { successCount: this.successCount, failCount: this.failCount, successRate });
  }

  addToLog(message: string) {
    this.gameLog.unshift(message);
    if (this.gameLog.length > 30) this.gameLog.pop();
    this.events.emit("updateGameLog", this.gameLog);
  }

  getFishCollection() { return this.fishCollection; }
  getFishData() { return this.fishData; }
  getMaterialData() { return this.materialData; }
  getEquipmentRecipes() { return (gameConfig as any).equipmentRecipes.value; }
}
