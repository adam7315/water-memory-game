// === 遊戲狀態 ===
let flippedCards = [];
let currentTeam = "blue";
let score = { blue: 0, red: 0 };
let matchedPairs = 0;
let totalPairs = 0;
let timerInterval;
let startTime;
let isProcessing = false; // 翻牌動畫進行中時禁止點擊

// === 卡牌資料 ===
const cardData = [
  { img: "reservoir.png",    info: "水庫是蓄水的大水池，可以把雨季的水存起來，讓我們在乾旱時也有水可用。" },
  { img: "river.png",        info: "河川是大自然的水路，雨水流進河裡後會被引導到水庫或水處理廠供人使用。" },
  { img: "groundwater.png",  info: "地下水是藏在地表以下、土壤或岩石孔隙和裂隙中的水寶藏，可以鑽井適度抽起來使用。" },
  { img: "desalination.png", info: "海水經過機器處理，把鹽分去除後就變成可以使用的淡水，是穩定的備援水源，幫助缺水地區解渴。" },
  { img: "pond.png",         info: "埤塘是農田旁的蓄水池，過去用來灌溉農田，現在也可以當作備用水源。" },
  { img: "infiltration.png", info: "伏流水是藏在河床下方砂礫裡的水，水質清澈、溫度穩定，是穩定的備援水源。" },
  { img: "reclaimed.png",    info: "我們用過的水經過淨化後還能再利用，像是灌溉、公園澆花或工業冷卻水。" },
  { img: "rainwater.png",    info: "建築物可裝設雨水回收系統，把屋頂接到的雨水存起來，用於清洗或澆水。" }
];

// ─────────────────────────────────────────────
// 音效系統（Web Audio API，不需外部音檔）
// ─────────────────────────────────────────────
let audioCtx = null;
let audioReady = false;
let bgmMuted = false;
let bgmActive = false;
let bgmNoteIndex = 0;
let bgmTimeout = null;

// 瀏覽器要求：AudioContext 必須在使用者點擊後才能播放
// 在第一次點擊時建立並解鎖，後續所有音效才能正常運作
function unlockAudio() {
  if (audioReady) return;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  audioCtx.resume().then(() => { audioReady = true; });
}
document.addEventListener('click',      unlockAudio, { once: true });
document.addEventListener('touchstart', unlockAudio, { once: true });

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// 基礎音調工具：建立一個短音並自動消音
function playTone(freq, duration, type, volume, startDelay) {
  if (bgmMuted) return;
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  const t = ctx.currentTime + (startDelay || 0);
  gain.gain.setValueAtTime(volume || 0.18, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.01);
}

// 翻牌音：高到低的短促 whoosh
function playFlipSound() {
  if (bgmMuted) return;
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(520, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.11);
}

// 配對成功：C大調上行琶音
function playMatchSound() {
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    playTone(freq, 0.38, 'sine', 0.18, i * 0.11);
  });
}

// 配對失敗：低沉下行音
function playNoMatchSound() {
  if (bgmMuted) return;
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.28);
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.29);
}

// 遊戲完成：歡呼旋律
function playVictorySound() {
  [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51].forEach((freq, i) => {
    playTone(freq, 0.5, 'sine', 0.2, i * 0.17);
  });
}

// ─────────────────────────────────────────────
// 背景音樂（依完成進度自動切換氛圍）
// calm（0–49%）→ building（50–74%）→ tense（75–100%）
// ─────────────────────────────────────────────
const bgmPhases = {
  calm: {
    // C大調琶音，輕快平靜
    notes: [261.63, 329.63, 392.00, 523.25, 392.00, 329.63],
    tempo: 480, type: 'sine', volume: 0.038
  },
  building: {
    // 加入更多音符，節奏加快
    notes: [261.63, 329.63, 392.00, 523.25, 659.25, 523.25, 392.00, 261.63],
    tempo: 300, type: 'sine', volume: 0.045
  },
  tense: {
    // A小調，快速，製造緊張感
    notes: [220.00, 261.63, 293.66, 349.23, 293.66, 261.63],
    tempo: 165, type: 'triangle', volume: 0.04
  }
};

function getBGMPhase() {
  if (!totalPairs) return 'calm';
  const pct = matchedPairs / totalPairs;
  if (pct >= 0.75) return 'tense';
  if (pct >= 0.50) return 'building';
  return 'calm';
}

function scheduleBGMNote() {
  if (!bgmActive || bgmMuted) return;
  const phase = getBGMPhase();
  const pat = bgmPhases[phase];
  const freq = pat.notes[bgmNoteIndex % pat.notes.length];
  bgmNoteIndex++;

  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = pat.type;
  osc.frequency.value = freq;
  const noteDur = (pat.tempo / 1000) * 0.72;
  gain.gain.setValueAtTime(pat.volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + noteDur);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + noteDur + 0.01);

  bgmTimeout = setTimeout(scheduleBGMNote, pat.tempo);
}

function startBGM() {
  stopBGM();
  bgmActive = true;
  bgmNoteIndex = 0;
  scheduleBGMNote();
}

function stopBGM() {
  bgmActive = false;
  if (bgmTimeout) clearTimeout(bgmTimeout);
  bgmTimeout = null;
}

function toggleMute() {
  bgmMuted = !bgmMuted;
  document.getElementById('muteBtn').textContent = bgmMuted ? '🔇' : '🔊';
  if (!bgmMuted && bgmActive) scheduleBGMNote();
}

// ─────────────────────────────────────────────
// 紙屑動畫（遊戲結束時觸發）
// ─────────────────────────────────────────────
let confettiParticles = [];
let confettiRaf = null;

function startConfetti() {
  const canvas = document.getElementById('confetti');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  confettiParticles = Array.from({ length: 220 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * 180,
    vx: (Math.random() - 0.5) * 5.5,
    vy: Math.random() * 2.5 + 0.8,
    color: `hsl(${Math.random() * 360}, 90%, 62%)`,
    w: Math.random() * 11 + 4,
    h: Math.random() * 5 + 3,
    rot: Math.random() * 360,
    rotV: (Math.random() - 0.5) * 9,
  }));

  if (confettiRaf) cancelAnimationFrame(confettiRaf);
  animateConfetti();
}

function animateConfetti() {
  const canvas = document.getElementById('confetti');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let alive = false;
  confettiParticles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.06; // 重力
    p.rot += p.rotV;
    if (p.y < canvas.height + 30) alive = true;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot * Math.PI / 180);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  });

  if (alive) {
    confettiRaf = requestAnimationFrame(animateConfetti);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

// ─────────────────────────────────────────────
// 遊戲主流程
// ─────────────────────────────────────────────
function startGame(pairCount) {
  // 重置紙屑
  stopBGM();
  if (confettiRaf) { cancelAnimationFrame(confettiRaf); confettiRaf = null; }
  const canvas = document.getElementById('confetti');
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

  // 重置狀態
  const board = document.getElementById("gameBoard");
  board.innerHTML = "";
  flippedCards = [];
  matchedPairs = 0;
  isProcessing = false;
  score = { blue: 0, red: 0 };
  currentTeam = "blue";
  totalPairs = pairCount;

  document.getElementById("scoreBlue").textContent = 0;
  document.getElementById("scoreRed").textContent = 0;
  document.getElementById("popup").classList.add("hidden");
  updateTeamUI();

  // 建立牌組並打亂
  const selected = cardData.slice(0, pairCount);
  const fullDeck = [...selected, ...selected].sort(() => 0.5 - Math.random());

  fullDeck.forEach(data => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.img = data.img;
    card.dataset.info = data.info;
    // 卡背與卡面預先建立（卡面圖片預載入）
    card.innerHTML = `
      <div class="card-inner">
        <div class="card-back"><img src="img/back.png" alt="卡背" /></div>
        <div class="card-front"><img src="img/${data.img}" alt="卡面" /></div>
      </div>
      <div class="checkmark">✔</div>
    `;
    card.addEventListener("click", () => flipCard(card));
    board.appendChild(card);
  });

  // 計時器
  clearInterval(timerInterval);
  startTime = Date.now();
  timerInterval = setInterval(updateTimer, 1000);

  // 啟動背景音樂（須在使用者點擊後執行，瀏覽器才允許播放）
  startBGM();
}

// === 翻牌邏輯 ===
function flipCard(card) {
  if (isProcessing) return;
  if (card.classList.contains("flipped") || card.classList.contains("matched")) return;

  playFlipSound();
  card.classList.add("flipped");
  flippedCards.push(card);

  if (flippedCards.length < 2) return;

  // 翻了兩張，開始判斷
  isProcessing = true;
  const [first, second] = flippedCards;

  if (first.dataset.img === second.dataset.img && first !== second) {
    // ✅ 配對成功
    setTimeout(() => {
      first.classList.add("matched");
      second.classList.add("matched");
      playMatchSound();
      score[currentTeam]++;
      document.getElementById(`score${capitalize(currentTeam)}`).textContent = score[currentTeam];
      matchedPairs++;
      flippedCards = [];
      isProcessing = false;

      showPopup(first.dataset.info, first.dataset.img);

      if (matchedPairs === totalPairs) {
        clearInterval(timerInterval);
        stopBGM();
        setTimeout(() => {
          playVictorySound();
          startConfetti();
          showVictory();
        }, 700);
      }
    }, 300);

  } else {
    // ❌ 配對失敗：搖晃後蓋回、換隊
    setTimeout(() => {
      first.classList.add("shake");
      second.classList.add("shake");
      playNoMatchSound();
      setTimeout(() => {
        first.classList.remove("flipped", "shake");
        second.classList.remove("flipped", "shake");
        flippedCards = [];
        isProcessing = false;
        toggleTeam();
      }, 500);
    }, 550);
  }
}

// === 換隊 ===
function toggleTeam() {
  currentTeam = currentTeam === "blue" ? "red" : "blue";
  updateTeamUI();
}

function updateTeamUI() {
  const el = document.getElementById("teamStatus");
  el.classList.remove("blue-turn", "red-turn");
  void el.offsetWidth; // 強制重排，讓 pulse 動畫重新觸發
  el.classList.add(`${currentTeam}-turn`);
  document.getElementById("currentTeam").textContent = currentTeam === "blue" ? "藍隊" : "紅隊";
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// === 計時器 ===
function updateTimer() {
  document.getElementById("timer").textContent = Math.floor((Date.now() - startTime) / 1000);
}

// === 配對成功彈窗 ===
function showPopup(info, img) {
  const content = document.getElementById("popup-content");
  content.innerHTML = `
    <div class="popup-match-badge">✔ 配對成功！</div>
    <img src="img/${img}" alt="" />
    <p>${info}</p>
    <button onclick="closePopup()">我已閱讀，繼續</button>
  `;
  document.getElementById("popup").classList.remove("hidden");
}

function closePopup() {
  document.getElementById("popup").classList.add("hidden");
}

// === 遊戲結束畫面 ===
function showVictory() {
  const elapsed = document.getElementById("timer").textContent;
  const b = score.blue, r = score.red;
  const winner = b > r ? "🔵 藍隊勝利！" : r > b ? "🔴 紅隊勝利！" : "🤝 平手！";

  const content = document.getElementById("popup-content");
  content.innerHTML = `
    <div class="victory-title">🎉 遊戲結束！</div>
    <div class="victory-winner">${winner}</div>
    <div class="victory-scores">
      <span class="blue-score">藍隊 ${b} 分</span>
      <span class="red-score">紅隊 ${r} 分</span>
    </div>
    <div class="victory-time">共花 ${elapsed} 秒</div>
    <button onclick="closePopup()">再玩一次</button>
  `;
  document.getElementById("popup").classList.remove("hidden");
}
