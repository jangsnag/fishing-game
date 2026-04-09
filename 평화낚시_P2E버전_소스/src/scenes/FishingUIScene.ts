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
    try { this.clickSound = this.sound.add("ui_click", { volume: 0.3 }); } catch(e) {}
    this.createUI();
    this.setupEventListeners();
  }

  createUI() {
    const html = `
<div id="fishing-ui" class="fixed top-0 left-0 w-full h-full pointer-events-none z-[1000] font-retro flex flex-col" style="image-rendering:pixelated;">

  <!-- 상단: 상태 텍스트 -->
  <div class="flex-none pt-4 px-4">
    <div class="flex justify-between items-center gap-2">
      <div id="status-text" class="game-pixel-container-blue-600 px-5 py-3 text-white font-bold text-3xl flex-1 text-center" style="text-shadow:3px 3px 0 #000;">대기 중...</div>
      <button id="settings-button" class="game-pixel-container-clickable-purple-500 px-4 py-3 text-white font-bold text-2xl pointer-events-auto">⚙️</button>
    </div>
  </div>

  <div class="flex-1"></div>

  <!-- 하단 UI -->
  <div class="flex-none px-4 pb-4 space-y-3">

    <!-- 버튼 5개 -->
    <div class="grid grid-cols-5 gap-2">
      <button id="collection-button" class="game-pixel-container-clickable-blue-500 py-3 text-white font-bold text-xl pointer-events-auto text-center">도감</button>
      <button id="inventory-button" class="game-pixel-container-clickable-orange-500 py-3 text-white font-bold text-xl pointer-events-auto text-center">인벤</button>
      <button id="auto-button" class="game-pixel-container-clickable-green-500 py-3 text-white font-bold text-xl pointer-events-auto text-center">자동<br>꺼짐</button>
      <button id="craft-button" class="game-pixel-container-clickable-yellow-500 py-3 text-white font-bold text-xl pointer-events-auto text-center">제작</button>
      <button id="market-button" class="game-pixel-container-clickable-purple-500 py-3 text-white font-bold text-xl pointer-events-auto text-center">마켓</button>
    </div>

    <!-- 코인 지갑 + 시세 그래프 -->
    <div class="game-pixel-container-gray-800 p-3">
      <div class="flex justify-between items-center mb-2">
        <span class="text-yellow-300 font-bold text-2xl">💰 <span id="wallet-amount">0</span> 코인</span>
        <span class="text-green-300 font-bold text-xl">시세: <span id="coin-price">100</span>원</span>
      </div>
      <canvas id="price-chart" width="680" height="55" style="width:100%;height:55px;image-rendering:pixelated;display:block;"></canvas>
    </div>

    <!-- 장착 장비 -->
    <div class="game-pixel-container-gray-700 p-3">
      <div class="flex justify-between items-center text-xl">
        <span class="text-gray-300 font-bold">⚔️ 장착:</span>
        <span id="equipped-info" class="text-white font-bold">없음</span>
        <span id="equipped-stats" class="text-blue-300 text-lg"></span>
      </div>
    </div>

    <!-- 통계 -->
    <div class="game-pixel-container-gray-700 p-3">
      <div class="flex justify-between text-2xl font-bold">
        <span class="text-green-400">✅ <span id="success-count">0</span></span>
        <span class="text-red-400">❌ <span id="fail-count">0</span></span>
        <span class="text-yellow-300">성공률: <span id="success-rate">0</span>%</span>
      </div>
    </div>

    <!-- 낚시 기록 -->
    <div class="game-pixel-container-gray-700 p-3" style="height:130px;">
      <div class="text-center text-gray-300 font-bold text-xl mb-2">📋 낚시 기록</div>
      <div id="game-log" class="text-xl pointer-events-auto" style="overflow-y:scroll;height:80px;scrollbar-width:thin;scrollbar-color:#9CA3AF #4B5563;"></div>
    </div>
  </div>

  <!-- 획득 결과 팝업 - 화면 상단 25% 위치 -->
  <div id="result-card-modal" class="fixed left-0 w-full pointer-events-none z-[1002]" style="top:15%;display:none;">
    <div class="flex justify-center">
      <div id="result-card" class="w-96 p-6 text-center rounded-2xl border-4 shadow-2xl" style="background:rgba(30,30,60,0.97);border-color:#888;">
        <div id="result-icon" class="text-6xl mb-3"></div>
        <div id="result-title" class="text-3xl font-bold text-white mb-1" style="text-shadow:2px 2px 0 #000;"></div>
        <div id="result-subtitle" class="text-xl text-gray-300 mb-3"></div>
        <div class="flex justify-between text-lg px-2">
          <span id="result-rarity" class="font-bold"></span>
          <span id="result-bonus" class="text-yellow-300 font-bold"></span>
        </div>
      </div>
    </div>
  </div>

  <!-- 실패 팝업 - 화면 상단 25% 위치, 깜빡임 없음 -->
  <div id="fail-card-modal" class="fixed left-0 w-full pointer-events-none z-[1002]" style="top:15%;display:none;">
    <div class="flex justify-center">
      <div class="w-72 p-5 text-center rounded-2xl border-4" style="background:rgba(80,20,20,0.95);border-color:#ef4444;">
        <div class="text-5xl mb-2">💨</div>
        <div class="text-3xl font-bold text-red-400 mb-1" style="text-shadow:2px 2px 0 #000;">실패!</div>
        <div class="text-xl text-gray-300">놓쳤다...</div>
      </div>
    </div>
  </div>

  <!-- 도감 모달 -->
  <div id="collection-modal" class="fixed top-0 left-0 w-full h-full bg-black bg-opacity-80 z-[1003] hidden items-center justify-center pointer-events-auto">
    <div class="game-pixel-container-blue-700 p-5 w-10/12 max-w-lg max-h-[80vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold text-white">🐟 물고기 도감</h2>
        <button id="close-collection" class="game-pixel-container-clickable-red-500 px-4 py-2 text-white font-bold text-xl">✕</button>
      </div>
      <div id="fish-collection" class="space-y-2"></div>
    </div>
  </div>

  <!-- 인벤토리 모달 -->
  <div id="inventory-modal" class="fixed top-0 left-0 w-full h-full bg-black bg-opacity-80 z-[1003] hidden items-center justify-center pointer-events-auto">
    <div class="game-pixel-container-orange-700 p-5 w-10/12 max-w-lg max-h-[80vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold text-white">🎒 재료 인벤토리</h2>
        <button id="close-inventory" class="game-pixel-container-clickable-red-500 px-4 py-2 text-white font-bold text-xl">✕</button>
      </div>
      <div id="inventory-list" class="space-y-2"></div>
    </div>
  </div>

  <!-- 제작 모달 -->
  <div id="craft-modal" class="fixed top-0 left-0 w-full h-full bg-black bg-opacity-80 z-[1003] hidden items-center justify-center pointer-events-auto">
    <div class="game-pixel-container-yellow-700 p-5 w-10/12 max-w-lg max-h-[85vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold text-white">⚒️ 장비 제작</h2>
        <button id="close-craft" class="game-pixel-container-clickable-red-500 px-4 py-2 text-white font-bold text-xl">✕</button>
      </div>
      <div id="craft-list" class="space-y-3"></div>
    </div>
  </div>

  <!-- 마켓 모달 -->
  <div id="market-modal" class="fixed top-0 left-0 w-full h-full bg-black bg-opacity-80 z-[1003] hidden items-center justify-center pointer-events-auto">
    <div class="game-pixel-container-purple-700 p-5 w-10/12 max-w-lg max-h-[85vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold text-white">🏪 NFT 마켓</h2>
        <button id="close-market" class="game-pixel-container-clickable-red-500 px-4 py-2 text-white font-bold text-xl">✕</button>
      </div>
      <div class="mb-4">
        <div class="text-xl text-yellow-300 font-bold mb-2">📦 보유 장비 (탭하면 장착)</div>
        <div id="my-equipment" class="space-y-2"></div>
      </div>
      <div class="border-t border-gray-500 pt-3">
        <div class="text-xl text-purple-300 font-bold mb-2">🛒 판매 중</div>
        <div id="market-list" class="space-y-2 mb-3"></div>
        <button id="simulate-buy" class="w-full game-pixel-container-clickable-green-500 py-3 text-white font-bold text-xl pointer-events-auto">🎲 NPC 구매 시뮬레이션</button>
      </div>
    </div>
  </div>

  <!-- 설정 모달 -->
  <div id="settings-modal" class="fixed top-0 left-0 w-full h-full bg-black bg-opacity-80 z-[1003] hidden items-center justify-center pointer-events-auto">
    <div class="game-pixel-container-purple-700 p-5 w-10/12 max-w-xs">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold text-white">⚙️ 설정</h2>
        <button id="close-settings" class="game-pixel-container-clickable-red-500 px-4 py-2 text-white font-bold text-xl">✕</button>
      </div>
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <span class="text-white text-xl">효과음</span>
          <button id="sound-toggle" class="game-pixel-container-clickable-green-500 px-5 py-2 text-white font-bold text-xl">ON</button>
        </div>
        <div class="pt-2 text-center">
          <button id="title-button" class="game-pixel-container-clickable-yellow-500 px-6 py-3 text-white font-bold text-xl">타이틀로</button>
        </div>
      </div>
    </div>
  </div>

</div>
<style>
#game-log::-webkit-scrollbar { width:8px; }
#game-log::-webkit-scrollbar-track { background:#4B5563; }
#game-log::-webkit-scrollbar-thumb { background:#9CA3AF; border-radius:4px; }
</style>`;
    this.uiContainer = utils.initUIDom(this, html);
  }

  setupEventListeners() {
    const gs = this.gameScene as any;
    const btn = (id: string, fn: () => void) => document.getElementById(id)?.addEventListener("click", () => { this.playClick(); fn(); });

    btn("auto-button", () => this.toggleAutoFishing());
    btn("collection-button", () => { this.showModal("collection-modal"); this.updateFishCollection(); });
    btn("inventory-button", () => { this.showModal("inventory-modal"); this.updateInventoryUI(); });
    btn("craft-button", () => { this.showModal("craft-modal"); this.updateCraftUI(); });
    btn("market-button", () => { this.showModal("market-modal"); this.updateMarketUI(); });
    btn("settings-button", () => this.showModal("settings-modal"));
    btn("close-collection", () => this.hideModal("collection-modal"));
    btn("close-inventory", () => this.hideModal("inventory-modal"));
    btn("close-craft", () => this.hideModal("craft-modal"));
    btn("close-market", () => this.hideModal("market-modal"));
    btn("close-settings", () => this.hideModal("settings-modal"));
    btn("simulate-buy", () => { gs.simulateMarketBuy(); this.updateMarketUI(); });
    btn("title-button", () => { this.scene.stop(this.gameSceneKey); this.scene.stop(); this.scene.start("TitleScreen"); });
    btn("sound-toggle", () => {
      (gameConfig.soundEnabled as any).value = !(gameConfig.soundEnabled as any).value;
      const el = document.getElementById("sound-toggle");
      if (el) el.textContent = (gameConfig.soundEnabled as any).value ? "ON" : "OFF";
    });

    // 게임 이벤트
    this.gameScene.events.on("updateStatusText", (t: string) => {
      const el = document.getElementById("status-text"); if (el) el.textContent = t;
    });
    this.gameScene.events.on("updateStatistics", (d: any) => {
      const sc = document.getElementById("success-count"); if (sc) sc.textContent = d.successCount;
      const fc = document.getElementById("fail-count"); if (fc) fc.textContent = d.failCount;
      const sr = document.getElementById("success-rate"); if (sr) sr.textContent = d.successRate;
    });
    this.gameScene.events.on("updateGameLog", (log: string[]) => this.updateGameLog(log));
    this.gameScene.events.on("showResultCard", (data: any) => this.showResultCard(data));
    this.gameScene.events.on("showFailEffect", () => this.showFailCard());
    this.gameScene.events.on("updateWallet", (v: number) => {
      const el = document.getElementById("wallet-amount"); if (el) el.textContent = v.toLocaleString();
    });
    this.gameScene.events.on("updateCoinPrice", (data: any) => {
      const el = document.getElementById("coin-price"); if (el) el.textContent = data.price.toLocaleString();
      this.drawPriceChart(data.history);
    });
    this.gameScene.events.on("updateInventory", () => {
      if (!document.getElementById("inventory-modal")?.classList.contains("hidden")) this.updateInventoryUI();
    });
    this.gameScene.events.on("updateEquipment", () => {
      if (!document.getElementById("market-modal")?.classList.contains("hidden")) this.updateMarketUI();
    });
    this.gameScene.events.on("updateEquipped", (eq: any) => {
      const info = document.getElementById("equipped-info");
      const stats = document.getElementById("equipped-stats");
      if (info) info.textContent = eq ? `${eq.icon} ${eq.name}` : "없음";
      if (stats) stats.textContent = eq ? `속도+${eq.stats["낚시속도"]||0}% 획득률+${eq.stats["획득률"]||0}%` : "";
    });

    setTimeout(() => {
      const el = document.getElementById("game-log");
      if (el) el.addEventListener("wheel", (e) => { e.preventDefault(); el.scrollTop += e.deltaY; }, { passive: false });
    }, 200);
  }

  // 코인 시세 그래프
  drawPriceChart(history: number[]) {
    const canvas = document.getElementById("price-chart") as HTMLCanvasElement;
    if (!canvas || !history || history.length < 2) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width; const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(0, 0, W, H);
    const min = Math.min(...history) * 0.9;
    const max = Math.max(...history) * 1.1;
    const range = max - min || 1;
    ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 1;
    for (let i = 0; i <= 2; i++) { const y = (H/2)*i; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    const step = W / (history.length - 1);
    ctx.beginPath();
    history.forEach((v, i) => {
      const x = i * step; const y = H - ((v - min) / range) * H;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    const last = history[history.length-1]; const prev = history[history.length-2];
    const isUp = last >= prev;
    ctx.strokeStyle = isUp ? "#22c55e" : "#ef4444";
    ctx.lineWidth = 3; ctx.stroke();
    const lx = (history.length-1)*step; const ly = H-((last-min)/range)*H;
    ctx.beginPath(); ctx.arc(lx, ly, 5, 0, Math.PI*2);
    ctx.fillStyle = isUp ? "#22c55e" : "#ef4444"; ctx.fill();
  }

  // 실패 팝업 (깜빡임 없음)
  showFailCard() {
    const modal = document.getElementById("fail-card-modal");
    if (!modal) return;
    modal.style.display = "block";
    this.time.delayedCall(1200, () => { if (modal) modal.style.display = "none"; });
  }

  // 획득 팝업
  showResultCard(data: any) {
    const { item, itemType } = data;
    const modal = document.getElementById("result-card-modal");
    const rc = document.getElementById("result-card");
    if (!modal || !rc) return;
    const rColor: any = { common:"#9CA3AF", uncommon:"#22c55e", rare:"#3b82f6", epic:"#a855f7", legend:"#f59e0b", junk:"#6b7280" };
    const rText: any = { common:"일반", uncommon:"고급", rare:"레어", epic:"에픽", legend:"전설", junk:"잡템" };
    const bgColor: any = { common:"rgba(40,40,70,0.97)", uncommon:"rgba(20,60,30,0.97)", rare:"rgba(20,40,90,0.97)", epic:"rgba(60,20,80,0.97)", legend:"rgba(80,60,10,0.97)", junk:"rgba(50,50,50,0.97)" };
    const iconMap: any = { fish:"🐟", material:item.icon||"📦", coin:item.icon||"🪙", junk:"🗑️" };
    rc.style.background = bgColor[item.rarity]||bgColor.common;
    rc.style.borderColor = rColor[item.rarity]||"#888";
    const icon = document.getElementById("result-icon"); if (icon) icon.textContent = iconMap[item.type]||"❓";
    const title = document.getElementById("result-title"); if (title) { title.textContent = item.name; title.style.color="#fff"; }
    const sub = document.getElementById("result-subtitle"); if (sub) sub.textContent = itemType;
    const rar = document.getElementById("result-rarity"); if (rar) { rar.textContent = `등급: ${rText[item.rarity]||item.rarity}`; rar.style.color = rColor[item.rarity]||"#fff"; }
    const bon = document.getElementById("result-bonus"); if (bon) bon.textContent = item.type==="coin" ? `+${item.amount}코인` : item.sellPrice ? `${item.sellPrice}코인` : "";
    modal.style.display = "block";
    this.time.delayedCall(2000, () => { if (modal) modal.style.display = "none"; });
  }

  toggleAutoFishing() {
    const btn = document.getElementById("auto-button");
    const gs = this.gameScene as any;
    if (gs.isAutoFishing) {
      gs.stopAutoFishing();
      if (btn) { btn.innerHTML = "자동<br>꺼짐"; btn.className = btn.className.replace("green-500","red-500"); }
    } else {
      gs.startAutoFishing();
      if (btn) { btn.innerHTML = "자동<br>켜짐"; btn.className = btn.className.replace("red-500","green-500"); }
    }
  }

  updateFishCollection() {
    const el = document.getElementById("fish-collection"); if (!el) return;
    const gs = this.gameScene as any;
    const rc: any = { common:"text-gray-300", uncommon:"text-green-400", rare:"text-blue-400", epic:"text-purple-400", legend:"text-yellow-400" };
    el.innerHTML = gs.getFishData().map((f: any) => {
      const cnt = gs.getFishCollection()[f.key]||0;
      return `<div class="flex justify-between items-center p-3 game-pixel-container-gray-600">
        <span class="${rc[f.rarity]||'text-gray-300'} text-xl font-bold">${cnt>0?f.name:"???"}</span>
        <span class="text-white text-xl">x${cnt}</span>
      </div>`;
    }).join("");
  }

  updateInventoryUI() {
    const el = document.getElementById("inventory-list"); if (!el) return;
    const gs = this.gameScene as any;
    const rc: any = { common:"text-gray-300", uncommon:"text-green-400", rare:"text-blue-400", epic:"text-purple-400", legend:"text-yellow-400" };
    el.innerHTML = gs.getMaterialData().map((m: any) => {
      const cnt = gs.inventory[m.key]||0;
      return `<div class="flex justify-between items-center p-3 game-pixel-container-gray-600">
        <span class="${rc[m.rarity]} text-xl font-bold">${m.icon} ${m.name}</span>
        <span class="text-white text-2xl font-bold">x${cnt}</span>
      </div>`;
    }).join("");
  }

  updateCraftUI() {
    const el = document.getElementById("craft-list"); if (!el) return;
    const gs = this.gameScene as any;
    const recipes = gs.getEquipmentRecipes();
    const inv = gs.inventory;
    const mats = gs.getMaterialData();
    const matMap: any = {}; mats.forEach((m: any) => { matMap[m.key] = m; });
    const rc: any = { uncommon:"text-green-400", rare:"text-blue-400", epic:"text-purple-400", legend:"text-yellow-400" };

    el.innerHTML = recipes.map((r: any) => {
      const canCraft = Object.entries(r.materials).every(([k, v]) => (inv[k]||0) >= (v as number));
      const matList = Object.entries(r.materials).map(([k, v]) => {
        const m = matMap[k]; const have = inv[k]||0; const ok = have>=(v as number);
        return `<span class="${ok?"text-green-400":"text-red-400"} text-lg">${m?.icon||""} ${m?.name||k} ${have}/${v}</span>`;
      }).join("  ");
      const stats = Object.entries(r.stats).map(([k,v])=>`${k} +${v}%`).join("  ");
      return `<div class="game-pixel-container-gray-600 p-3">
        <div class="flex justify-between mb-1">
          <span class="${rc[r.rarity]||'text-white'} text-xl font-bold">${r.icon} ${r.name}</span>
          <span class="text-yellow-300 text-lg">${r.basePrice.toLocaleString()}코인</span>
        </div>
        <div class="text-blue-300 text-xl font-bold mb-2">⚡ ${stats}</div>
        <div class="text-lg mb-3 leading-loose">${matList}</div>
        <button data-recipe="${r.key}" class="craft-btn w-full py-3 text-xl font-bold pointer-events-auto ${canCraft?"game-pixel-container-clickable-yellow-500 text-white":"game-pixel-container-gray-500 text-gray-400"}">
          ${canCraft?"⚒️ 제작하기":"재료 부족"}
        </button>
      </div>`;
    }).join("");

    el.querySelectorAll(".craft-btn").forEach((b: any) => {
      b.addEventListener("click", () => {
        const r = recipes.find((x: any) => x.key === b.dataset.recipe);
        if (!r) return;
        if (gs.craftEquipment(r)) {
          this.updateCraftUI();
          this.updateInventoryUI();
          // 제작 완료 알림
          const latest = gs.equipment[gs.equipment.length-1];
          if (latest) {
            this.showResultCard({ item: { ...latest, type: "fish", rarity: latest.rarity }, itemType: "장비 제작 완료!" });
          }
        } else {
          alert("재료가 부족합니다!");
        }
      });
    });
  }

  updateMarketUI() {
    const gs = this.gameScene as any;
    const rc: any = { uncommon:"text-green-400", rare:"text-blue-400", epic:"text-purple-400", legend:"text-yellow-400" };

    const eqEl = document.getElementById("my-equipment");
    if (eqEl) {
      const myEq = gs.equipment.filter((e: any) => !e.onMarket);
      if (!myEq.length) { eqEl.innerHTML = '<div class="text-gray-400 text-xl p-2">보유 장비 없음</div>'; }
      else {
        eqEl.innerHTML = myEq.map((e: any) => {
          const stats = Object.entries(e.stats).map(([k,v])=>`${k}+${v}%`).join(" ");
          const isEquipped = gs.equippedItem?.id === e.id;
          return `<div class="game-pixel-container-gray-600 p-3 ${isEquipped?"border-2 border-yellow-400":""}">
            <div class="flex justify-between mb-1">
              <span class="${rc[e.rarity]||'text-white'} text-xl font-bold">${e.icon} ${e.name} ${isEquipped?"✅":""}</span>
              <span class="text-yellow-300 text-lg">${e.marketPrice.toLocaleString()}코인</span>
            </div>
            <div class="text-blue-300 text-lg mb-2">⚡ ${stats}</div>
            <div class="flex gap-2">
              <button data-equip="${e.id}" class="equip-btn flex-1 py-2 text-lg font-bold pointer-events-auto ${isEquipped?"game-pixel-container-clickable-red-500":"game-pixel-container-clickable-green-500"} text-white">
                ${isEquipped?"🔴 해제":"⚔️ 장착"}
              </button>
              <button data-eq="${e.id}" class="list-btn flex-1 py-2 text-lg font-bold game-pixel-container-clickable-purple-500 text-white pointer-events-auto">🏪 등록</button>
            </div>
          </div>`;
        }).join("");

        eqEl.querySelectorAll(".equip-btn").forEach((b: any) => {
          b.addEventListener("click", () => {
            const eq = gs.equipment.find((e: any) => e.id === parseInt(b.dataset.equip));
            if (!eq) return;
            if (gs.equippedItem?.id === eq.id) gs.equipItem(null);
            else gs.equipItem(eq);
            this.updateMarketUI();
          });
        });
        eqEl.querySelectorAll(".list-btn").forEach((b: any) => {
          b.addEventListener("click", () => {
            const eq = gs.equipment.find((e: any) => e.id === parseInt(b.dataset.eq));
            if (!eq) return;
            const price = parseInt(prompt(`등록 가격 (추천: ${eq.marketPrice})`, eq.marketPrice.toString())||"0");
            if (price > 0) { gs.listOnMarket(eq.id, price); this.updateMarketUI(); }
          });
        });
      }
    }

    const mkEl = document.getElementById("market-list");
    if (mkEl) {
      if (!gs.nftMarket.length) { mkEl.innerHTML = '<div class="text-gray-400 text-xl p-2">등록된 장비 없음</div>'; }
      else {
        mkEl.innerHTML = gs.nftMarket.map((e: any) => {
          const stats = Object.entries(e.stats).map(([k,v])=>`${k}+${v}%`).join(" ");
          return `<div class="game-pixel-container-gray-600 p-3">
            <div class="flex justify-between mb-1">
              <span class="${rc[e.rarity]||'text-white'} text-xl font-bold">${e.icon} ${e.name}</span>
              <span class="text-green-400 text-xl font-bold">${e.marketPrice.toLocaleString()}코인</span>
            </div>
            <div class="text-blue-300 text-lg">⚡ ${stats}</div>
          </div>`;
        }).join("");
      }
    }
  }

  updateGameLog(log: string[]) {
    const el = document.getElementById("game-log"); if (!el) return;
    if (!log.length) { el.innerHTML = '<div class="text-gray-400 text-xl">낚시를 시작해보세요!</div>'; return; }
    el.innerHTML = log.map(entry => {
      let color = "text-gray-300";
      if (entry.includes("✅")) color = "text-green-400";
      else if (entry.includes("❌")) color = "text-red-400";
      else if (entry.includes("코인")) color = "text-yellow-300";
      else if (entry.includes("재료")) color = "text-orange-300";
      else if (entry.includes("제작")) color = "text-green-300";
      else if (entry.includes("마켓")||entry.includes("판매")||entry.includes("장착")) color = "text-purple-300";
      return `<div class="${color} text-xl mb-1">${entry}</div>`;
    }).join("");
    setTimeout(() => { el.scrollTop = 0; }, 30);
  }

  showModal(id: string) { const m = document.getElementById(id); if (m) { m.classList.remove("hidden"); m.classList.add("flex"); } }
  hideModal(id: string) { const m = document.getElementById(id); if (m) { m.classList.add("hidden"); m.classList.remove("flex"); } }
  playClick() { if ((gameConfig.soundEnabled as any).value && this.clickSound) this.clickSound.play(); }
}
