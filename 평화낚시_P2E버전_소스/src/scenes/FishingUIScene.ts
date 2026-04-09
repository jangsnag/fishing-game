import Phaser from "phaser";
import * as utils from "../utils";
import * as gameConfig from "../gameConfig.json";

export class FishingUIScene extends Phaser.Scene {
  public uiContainer!: Phaser.GameObjects.DOMElement;
  public gameSceneKey!: string;
  public gameScene!: Phaser.Scene;
  public clickSound?: Phaser.Sound.BaseSound;

  constructor() { super({ key: "FishingUIScene" }); }
  init(data: any) { this.gameSceneKey = data.gameSceneKey; }

  create(): void {
    this.gameScene = this.scene.get(this.gameSceneKey);
    this.clickSound = this.sound.add("ui_click", { volume: 0.3 });
    this.createUI();
    this.setupEventListeners();
  }

  createUI() {
    const uiHTML = `
<div id="fishing-ui-container" class="fixed top-0 left-0 w-full h-full pointer-events-none z-[1000] font-retro flex flex-col" style="color:white;font-size:24px;image-rendering:pixelated;">
  <!-- 상태 텍스트 -->
  <div class="flex-none pt-4 pb-2">
    <div class="flex justify-center">
      <div id="status-text" class="game-pixel-container-blue-600 p-5 text-center text-white font-bold text-2xl pointer-events-none" style="text-shadow:3px 3px 0px #000;">대기 중...</div>
    </div>
  </div>
  <div class="flex-1"></div>

  <!-- 하단 UI -->
  <div class="flex-none p-6 space-y-3">
    <!-- 코인 지갑 표시 -->
    <div class="game-pixel-container-gray-700 p-2 flex justify-between items-center">
      <span class="text-yellow-300 font-bold text-lg">💰 지갑: <span id="wallet-amount">0</span> 코인</span>
      <span class="text-green-300 text-sm">시세: <span id="coin-price">100</span>원/코인</span>
    </div>

    <!-- 버튼 행 -->
    <div class="flex justify-between items-center gap-2">
      <button id="collection-button" class="game-pixel-container-clickable-blue-500 px-4 py-2 text-white font-bold pointer-events-auto hover:scale-110 transition-transform text-sm">도감</button>
      <button id="inventory-button" class="game-pixel-container-clickable-orange-500 px-4 py-2 text-white font-bold pointer-events-auto hover:scale-110 transition-transform text-sm">인벤</button>
      <button id="auto-button" class="game-pixel-container-clickable-green-500 px-6 py-3 text-white font-bold text-lg pointer-events-auto hover:scale-110 transition-transform">자동 꺼짐</button>
      <button id="craft-button" class="game-pixel-container-clickable-yellow-500 px-4 py-2 text-white font-bold pointer-events-auto hover:scale-110 transition-transform text-sm">제작</button>
      <button id="market-button" class="game-pixel-container-clickable-purple-500 px-4 py-2 text-white font-bold pointer-events-auto hover:scale-110 transition-transform text-sm">마켓</button>
    </div>

    <!-- 통계 -->
    <div class="game-pixel-container-gray-700 p-2 text-center">
      <div class="flex justify-between text-base">
        <span>물고기: <span id="fish-count">0</span></span>
        <span>잡템: <span id="junk-count">0</span></span>
        <span>성공률: <span id="success-rate">0</span>%</span>
      </div>
    </div>

    <!-- 낚시 기록 -->
    <div class="game-pixel-container-gray-700 p-3 flex flex-col" style="height:120px;">
      <div class="text-center text-gray-300 font-bold mb-2 text-lg">낚시 기록</div>
      <div id="game-log" class="flex-1 text-base pointer-events-auto" style="overflow-y:scroll;height:80px;min-height:80px;max-height:80px;">
        <div class="text-gray-400">낚시를 시작해보세요!</div>
      </div>
    </div>
  </div>

  <!-- 결과 카드 -->
  <div id="result-card-modal" class="fixed top-0 right-0 w-full h-full hidden pointer-events-auto z-[1001]" style="justify-content:flex-end;align-items:flex-start;padding-right:8%;padding-top:25%;display:none;">
    <div id="result-card" class="game-pixel-container-gray-500 p-6 w-72 text-center shadow-2xl border-4 border-gray-400" style="background-color:rgba(107,114,128,0.95);">
      <div id="result-title" class="text-2xl font-bold text-white mb-2" style="text-shadow:3px 3px 0px #000;"></div>
      <div id="result-subtitle" class="text-base text-gray-100 mb-3 font-semibold" style="text-shadow:2px 2px 0px #000;"></div>
      <div id="result-icon" class="text-5xl mb-4"></div>
      <div class="flex justify-between text-sm">
        <span id="result-rarity" class="text-gray-200 font-semibold"></span>
        <span id="result-bonus" class="text-yellow-300 font-semibold"></span>
      </div>
    </div>
  </div>

  <!-- 도감 모달 -->
  <div id="collection-modal" class="fixed top-0 left-0 w-full h-full bg-black bg-opacity-75 hidden items-center justify-center pointer-events-auto">
    <div class="game-pixel-container-blue-700 p-5 w-80 max-h-[80vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-3">
        <h2 class="text-lg font-bold text-white">🐟 물고기 도감</h2>
        <button id="close-collection" class="game-pixel-container-clickable-red-500 px-3 py-1 text-white font-bold text-sm">X</button>
      </div>
      <div id="fish-collection" class="space-y-1"></div>
    </div>
  </div>

  <!-- 인벤토리 모달 -->
  <div id="inventory-modal" class="fixed top-0 left-0 w-full h-full bg-black bg-opacity-75 hidden items-center justify-center pointer-events-auto">
    <div class="game-pixel-container-orange-700 p-5 w-80 max-h-[80vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-3">
        <h2 class="text-lg font-bold text-white">🎒 재료 인벤토리</h2>
        <button id="close-inventory" class="game-pixel-container-clickable-red-500 px-3 py-1 text-white font-bold text-sm">X</button>
      </div>
      <div id="inventory-list" class="space-y-1"></div>
    </div>
  </div>

  <!-- 제작 모달 -->
  <div id="craft-modal" class="fixed top-0 left-0 w-full h-full bg-black bg-opacity-75 hidden items-center justify-center pointer-events-auto">
    <div class="game-pixel-container-yellow-700 p-5 w-80 max-h-[85vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-3">
        <h2 class="text-lg font-bold text-white">⚒️ 장비 제작</h2>
        <button id="close-craft" class="game-pixel-container-clickable-red-500 px-3 py-1 text-white font-bold text-sm">X</button>
      </div>
      <div id="craft-list" class="space-y-3"></div>
    </div>
  </div>

  <!-- 마켓 모달 -->
  <div id="market-modal" class="fixed top-0 left-0 w-full h-full bg-black bg-opacity-75 hidden items-center justify-center pointer-events-auto">
    <div class="game-pixel-container-purple-700 p-5 w-80 max-h-[85vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-3">
        <h2 class="text-lg font-bold text-white">🏪 NFT 마켓</h2>
        <button id="close-market" class="game-pixel-container-clickable-red-500 px-3 py-1 text-white font-bold text-sm">X</button>
      </div>
      <div class="text-xs text-gray-300 mb-3">보유 장비를 등록하거나 NPC가 구매합니다</div>
      <div class="mb-3">
        <div class="text-sm text-yellow-300 font-bold mb-2">📦 보유 장비</div>
        <div id="my-equipment" class="space-y-2"></div>
      </div>
      <div class="border-t border-gray-500 pt-3">
        <div class="text-sm text-purple-300 font-bold mb-2">🛒 마켓 등록 중</div>
        <div id="market-list" class="space-y-2"></div>
        <button id="simulate-buy" class="mt-3 w-full game-pixel-container-clickable-green-500 py-2 text-white font-bold text-sm pointer-events-auto hover:scale-105 transition-transform">🎲 NPC 구매 시뮬레이션</button>
      </div>
    </div>
  </div>

  <!-- 설정 버튼 -->
  <div class="fixed top-4 right-4 pointer-events-auto">
    <button id="settings-button" class="game-pixel-container-clickable-purple-500 px-3 py-2 text-white font-bold text-sm hover:scale-110 transition-transform">⚙️</button>
  </div>

  <!-- 설정 모달 -->
  <div id="settings-modal" class="fixed top-0 left-0 w-full h-full bg-black bg-opacity-75 hidden items-center justify-center pointer-events-auto">
    <div class="game-pixel-container-purple-700 p-5 w-72">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-bold text-white">⚙️ 설정</h2>
        <button id="close-settings" class="game-pixel-container-clickable-red-500 px-3 py-1 text-white font-bold text-sm">X</button>
      </div>
      <div class="space-y-3">
        <div class="flex justify-between items-center">
          <span class="text-white text-sm">효과음</span>
          <button id="sound-toggle" class="game-pixel-container-clickable-green-500 px-3 py-1 text-white font-bold text-sm">ON</button>
        </div>
        <div class="text-center pt-2">
          <button id="title-button" class="game-pixel-container-clickable-yellow-500 px-5 py-2 text-white font-bold text-sm hover:scale-110 transition-transform">타이틀로</button>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
#game-log { overflow-y:scroll!important; scrollbar-width:thin; scrollbar-color:#9CA3AF #4B5563; }
#game-log::-webkit-scrollbar { width:8px; }
#game-log::-webkit-scrollbar-track { background:#4B5563; }
#game-log::-webkit-scrollbar-thumb { background:#9CA3AF; border-radius:4px; }
</style>`;
    this.uiContainer = utils.initUIDom(this, uiHTML);
  }

  setupEventListeners() {
    const gs = this.gameScene as any;

    // 버튼들
    document.getElementById("auto-button")?.addEventListener("click", () => { this.playClick(); this.toggleAutoFishing(); });
    document.getElementById("collection-button")?.addEventListener("click", () => { this.playClick(); this.showModal("collection-modal"); this.updateFishCollection(); });
    document.getElementById("inventory-button")?.addEventListener("click", () => { this.playClick(); this.showModal("inventory-modal"); this.updateInventoryUI(); });
    document.getElementById("craft-button")?.addEventListener("click", () => { this.playClick(); this.showModal("craft-modal"); this.updateCraftUI(); });
    document.getElementById("market-button")?.addEventListener("click", () => { this.playClick(); this.showModal("market-modal"); this.updateMarketUI(); });
    document.getElementById("settings-button")?.addEventListener("click", () => { this.playClick(); this.showModal("settings-modal"); });
    document.getElementById("close-collection")?.addEventListener("click", () => { this.playClick(); this.hideModal("collection-modal"); });
    document.getElementById("close-inventory")?.addEventListener("click", () => { this.playClick(); this.hideModal("inventory-modal"); });
    document.getElementById("close-craft")?.addEventListener("click", () => { this.playClick(); this.hideModal("craft-modal"); });
    document.getElementById("close-market")?.addEventListener("click", () => { this.playClick(); this.hideModal("market-modal"); });
    document.getElementById("close-settings")?.addEventListener("click", () => { this.playClick(); this.hideModal("settings-modal"); });
    document.getElementById("title-button")?.addEventListener("click", () => { this.playClick(); this.scene.stop(this.gameSceneKey); this.scene.stop(); this.scene.start("TitleScreen"); });
    document.getElementById("sound-toggle")?.addEventListener("click", () => { this.playClick(); (gameConfig.soundEnabled as any).value = !(gameConfig.soundEnabled as any).value; });
    document.getElementById("simulate-buy")?.addEventListener("click", () => { this.playClick(); gs.simulateMarketBuy(); this.updateMarketUI(); });

    // 게임 이벤트
    this.gameScene.events.on("updateStatusText", this.updateStatusText, this);
    this.gameScene.events.on("updateStatistics", this.updateStatistics, this);
    this.gameScene.events.on("updateGameLog", this.updateGameLog, this);
    this.gameScene.events.on("showResultCard", this.showResultCard, this);
    this.gameScene.events.on("updateWallet", (v: number) => {
      const el = document.getElementById("wallet-amount");
      if (el) el.textContent = v.toLocaleString();
    });
    this.gameScene.events.on("updateCoinPrice", (v: number) => {
      const el = document.getElementById("coin-price");
      if (el) el.textContent = v.toLocaleString();
    });
    this.gameScene.events.on("updateInventory", () => { if (document.getElementById("inventory-modal")?.classList.contains("flex")) this.updateInventoryUI(); });
    this.gameScene.events.on("updateEquipment", () => { if (document.getElementById("market-modal")?.classList.contains("flex")) this.updateMarketUI(); });
    this.gameScene.events.on("updateMarket", () => { if (document.getElementById("market-modal")?.classList.contains("flex")) this.updateMarketUI(); });

    // 게임로그 스크롤
    setTimeout(() => {
      const el = document.getElementById("game-log");
      if (!el) return;
      el.style.overflowY = "scroll";
      el.addEventListener("wheel", (e) => { e.preventDefault(); el.scrollTop += e.deltaY; }, { passive: false });
    }, 100);
  }

  showModal(id: string) {
    const m = document.getElementById(id);
    if (m) { m.classList.remove("hidden"); m.classList.add("flex"); }
  }
  hideModal(id: string) {
    const m = document.getElementById(id);
    if (m) { m.classList.add("hidden"); m.classList.remove("flex"); }
  }

  playClick() { if ((gameConfig.soundEnabled as any).value && this.clickSound) this.clickSound.play(); }

  toggleAutoFishing() {
    const btn = document.getElementById("auto-button");
    const gs = this.gameScene as any;
    if (gs.isAutoFishing) {
      gs.stopAutoFishing();
      if (btn) { btn.textContent = "자동 꺼짐"; btn.className = btn.className.replace("green-500","red-500"); }
    } else {
      gs.startAutoFishing();
      if (btn) { btn.textContent = "자동 켜짐"; btn.className = btn.className.replace("red-500","green-500"); }
    }
  }

  updateFishCollection() {
    const el = document.getElementById("fish-collection"); if (!el) return;
    const gs = this.gameScene as any;
    const fishData = gs.getFishData();
    const fishCollection = gs.getFishCollection();
    const rarityColor: any = { common:"text-gray-300", uncommon:"text-green-400", rare:"text-blue-400", epic:"text-purple-400", legend:"text-yellow-400" };
    el.innerHTML = fishData.map((f: any) => {
      const cnt = fishCollection[f.key] || 0;
      return `<div class="flex justify-between items-center p-2 game-pixel-container-gray-600">
        <span class="${rarityColor[f.rarity]||'text-gray-300'}">${cnt > 0 ? f.name : "???"}</span>
        <span class="text-gray-300 text-sm">x${cnt}</span>
      </div>`;
    }).join("");
  }

  updateInventoryUI() {
    const el = document.getElementById("inventory-list"); if (!el) return;
    const gs = this.gameScene as any;
    const mats = gs.getMaterialData();
    const inv = gs.inventory;
    const rarityColor: any = { common:"text-gray-300", uncommon:"text-green-400", rare:"text-blue-400", epic:"text-purple-400", legend:"text-yellow-400" };
    el.innerHTML = mats.map((m: any) => {
      const cnt = inv[m.key] || 0;
      return `<div class="flex justify-between items-center p-2 game-pixel-container-gray-600">
        <span class="${rarityColor[m.rarity]}">${m.icon} ${m.name}</span>
        <span class="text-white font-bold">x${cnt}</span>
      </div>`;
    }).join("");
  }

  updateCraftUI() {
    const el = document.getElementById("craft-list"); if (!el) return;
    const gs = this.gameScene as any;
    const recipes = gs.getEquipmentRecipes();
    const inv = gs.inventory;
    const mats = gs.getMaterialData();
    const matMap: any = {};
    mats.forEach((m: any) => { matMap[m.key] = m; });
    const rarityColor: any = { uncommon:"text-green-400", rare:"text-blue-400", epic:"text-purple-400", legend:"text-yellow-400" };

    el.innerHTML = recipes.map((r: any) => {
      const canCraft = Object.entries(r.materials).every(([k, v]) => (inv[k] || 0) >= (v as number));
      const matList = Object.entries(r.materials).map(([k, v]) => {
        const mat = matMap[k];
        const have = inv[k] || 0;
        const ok = have >= (v as number);
        return `<span class="${ok ? 'text-green-400' : 'text-red-400'}">${mat?.icon||''} ${mat?.name||k} ${have}/${v}</span>`;
      }).join("  ");
      const statsText = Object.entries(r.stats).map(([k, v]) => `${k}+${v}`).join(" ");
      return `<div class="game-pixel-container-gray-600 p-3">
        <div class="flex justify-between items-center mb-1">
          <span class="${rarityColor[r.rarity]||'text-white'} font-bold">${r.icon} ${r.name}</span>
          <span class="text-yellow-300 text-xs">${r.basePrice.toLocaleString()}코인</span>
        </div>
        <div class="text-xs text-blue-300 mb-2">${statsText}</div>
        <div class="text-xs mb-2">${matList}</div>
        <button data-recipe="${r.key}" class="craft-btn w-full py-1 text-sm font-bold ${canCraft ? 'game-pixel-container-clickable-yellow-500 text-white' : 'game-pixel-container-gray-500 text-gray-400'} pointer-events-auto">
          ${canCraft ? '⚒️ 제작하기' : '재료 부족'}
        </button>
      </div>`;
    }).join("");

    // 제작 버튼 이벤트
    el.querySelectorAll(".craft-btn").forEach((btn: any) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.recipe;
        const recipe = recipes.find((r: any) => r.key === key);
        if (!recipe) return;
        const ok = gs.craftEquipment(recipe);
        if (ok) { this.updateCraftUI(); this.updateInventoryUI(); }
        else { alert("재료가 부족합니다!"); }
      });
    });
  }

  updateMarketUI() {
    const gs = this.gameScene as any;
    const eqEl = document.getElementById("my-equipment");
    const mkEl = document.getElementById("market-list");
    const rarityColor: any = { uncommon:"text-green-400", rare:"text-blue-400", epic:"text-purple-400", legend:"text-yellow-400" };

    if (eqEl) {
      const myEq = gs.equipment.filter((e: any) => !e.onMarket);
      if (myEq.length === 0) { eqEl.innerHTML = '<div class="text-gray-400 text-sm">보유 장비 없음</div>'; }
      else {
        eqEl.innerHTML = myEq.map((e: any) => {
          const statsText = Object.entries(e.stats).map(([k, v]) => `${k}+${v}`).join(" ");
          return `<div class="game-pixel-container-gray-600 p-2">
            <div class="flex justify-between mb-1">
              <span class="${rarityColor[e.rarity]||'text-white'} text-sm font-bold">${e.icon} ${e.name}</span>
              <span class="text-yellow-300 text-xs">${e.marketPrice.toLocaleString()}코인</span>
            </div>
            <div class="text-xs text-blue-300 mb-2">${statsText}</div>
            <button data-eq="${e.id}" class="list-btn w-full py-1 text-xs font-bold game-pixel-container-clickable-purple-500 text-white pointer-events-auto">🏪 마켓 등록</button>
          </div>`;
        }).join("");
        eqEl.querySelectorAll(".list-btn").forEach((btn: any) => {
          btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.eq);
            const eq = gs.equipment.find((e: any) => e.id === id);
            if (!eq) return;
            const price = parseInt(prompt(`등록 가격 입력 (추천: ${eq.marketPrice})`, eq.marketPrice.toString()) || "0");
            if (price > 0) { gs.listOnMarket(id, price); this.updateMarketUI(); }
          });
        });
      }
    }

    if (mkEl) {
      if (gs.nftMarket.length === 0) { mkEl.innerHTML = '<div class="text-gray-400 text-sm">등록된 장비 없음</div>'; }
      else {
        mkEl.innerHTML = gs.nftMarket.map((e: any) => {
          const statsText = Object.entries(e.stats).map(([k, v]) => `${k}+${v}`).join(" ");
          return `<div class="game-pixel-container-gray-600 p-2">
            <div class="flex justify-between mb-1">
              <span class="${rarityColor[e.rarity]||'text-white'} text-sm font-bold">${e.icon} ${e.name}</span>
              <span class="text-green-400 text-xs font-bold">${e.marketPrice.toLocaleString()} 코인</span>
            </div>
            <div class="text-xs text-blue-300">${statsText}</div>
          </div>`;
        }).join("");
      }
    }
  }

  updateStatusText(text: string) { const el = document.getElementById("status-text"); if (el) el.textContent = text; }

  updateStatistics(data: any) {
    const fc = document.getElementById("fish-count"); if (fc) fc.textContent = data.fishCount;
    const jc = document.getElementById("junk-count"); if (jc) jc.textContent = data.junkCount;
    const sr = document.getElementById("success-rate"); if (sr) sr.textContent = data.successRate;
  }

  updateGameLog(log: string[]) {
    const el = document.getElementById("game-log"); if (!el) return;
    if (log.length === 0) { el.innerHTML = '<div class="text-gray-400 text-base">낚시를 시작해보세요!</div>'; return; }
    el.innerHTML = log.map(entry => {
      let color = "text-gray-300";
      if (entry.includes("코인")) color = "text-yellow-300";
      else if (entry.includes("재료")) color = "text-orange-300";
      else if (entry.includes("제작")) color = "text-green-400";
      else if (entry.includes("마켓")) color = "text-purple-300";
      else if (entry.includes("실패")) color = "text-red-400";
      else if (entry.includes("물고기")) color = "text-blue-300";
      return `<div class="${color} text-sm mb-1">${entry}</div>`;
    }).join("");
    setTimeout(() => { el.scrollTop = 0; }, 50);
  }

  showResultCard(data: any) {
    const { item, itemType } = data;
    const iconMap: any = { fish:"🐟", material: item.icon || "📦", coin: item.icon || "🪙", junk:"🗑️" };
    const rarityText: any = { common:"일반", uncommon:"고급", rare:"레어", epic:"에픽", legend:"전설", junk:"잡템" };
    const rarityBg: any = { common:"rgba(107,114,128,0.95)", uncommon:"rgba(39,174,96,0.9)", rare:"rgba(52,152,219,0.9)", epic:"rgba(155,89,182,0.9)", legend:"rgba(241,196,15,0.9)", junk:"rgba(107,114,128,0.8)" };

    const title = document.getElementById("result-title"); if (title) title.textContent = item.name;
    const subtitle = document.getElementById("result-subtitle"); if (subtitle) subtitle.textContent = itemType;
    const icon = document.getElementById("result-icon"); if (icon) icon.textContent = iconMap[item.type] || "❓";
    const rarity = document.getElementById("result-rarity"); if (rarity) rarity.textContent = `등급: ${rarityText[item.rarity] || item.rarity}`;
    const bonus = document.getElementById("result-bonus");
    if (bonus) {
      if (item.type === "coin") bonus.textContent = `+${item.amount} 코인`;
      else if (item.type === "material") bonus.textContent = `판매가: ${item.sellPrice}코인`;
      else bonus.textContent = item.sellPrice ? `판매가: ${item.sellPrice}코인` : "";
    }
    const card = document.getElementById("result-card");
    if (card) card.style.backgroundColor = rarityBg[item.rarity] || rarityBg.common;

    const modal = document.getElementById("result-card-modal");
    if (modal) {
      modal.style.display = "flex";
      modal.classList.remove("hidden");
      this.time.delayedCall(2000, () => {
        modal.style.display = "none";
        modal.classList.add("hidden");
      });
    }
  }
}
