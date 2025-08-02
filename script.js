// === 遊戲的狀態變數區 ===
let flippedCards = [];                            // 儲存當前翻開的卡牌
let currentTeam = "blue";                         // 初始隊伍為藍隊
let score = { blue: 0, red: 0 };                  // 分數記錄，藍隊與紅隊各自歸零
let matchedPairs = 0;                             // 已配對成功的卡牌組數
let totalPairs = 0;                               // 遊戲總配對數（根據難度而定）
let timerInterval;                                // 定時器變數，用於紀錄時間
let startTime;                                    // 開始時間，用來計算經過秒數

// === 卡牌資料區（含圖片與說明）===
const cardData = [                                // 定義卡牌資料陣列，每張卡牌都有圖片與說明
  { img: "reservoir.png", info: "水庫是蓄水的大水池，可以把雨季的水存起來，讓我們在乾旱時也有水可用。" },
  { img: "river.png", info: "河川是大自然的水路，雨水流進河裡後會被引導到水庫或水處理廠供人使用。" },
  { img: "groundwater.png", info: "地下水是藏在地表以下、土壤或岩石孔隙和裂隙中的水寶藏，可以鑽井適度抽起來使用。" },
  { img: "desalination.png", info: "海水經過機器處理，把鹽分去除後就變成可以使用的淡水，是穩定的備援水源，幫助缺水地區解渴。" },
  { img: "pond.png", info: "埤塘是農田旁的蓄水池，過去用來灌溉農田，現在也可以當作備用水源。" },
  { img: "infiltration.png", info: "伏流水是藏在河床下方砂礫裡的水，水質清澈、溫度穩定，是穩定的備援水源。" },
  { img: "reclaimed.png", info: "我們用過的水經過淨化後還能再利用，像是灌溉、公園澆花或工業冷卻水。" },
  { img: "rainwater.png", info: "建築物可裝設雨水回收系統，把屋頂接到的雨水存起來，用於清洗或澆水。" }
];

// === 遊戲開始函式 ===
function startGame(pairCount) {
  const board = document.getElementById("gameBoard");   // 取得遊戲區塊
  board.innerHTML = "";                                 // 清空遊戲板
  flippedCards = [];                                    // 清除已翻開卡牌記錄
  matchedPairs = 0;                                     // 重置配對成功數
  score = { blue: 0, red: 0 };                          // 分數歸零
  currentTeam = "blue";                                 // 初始為藍隊
  document.getElementById("scoreBlue").textContent = 0; // 顯示分數歸零
  document.getElementById("scoreRed").textContent = 0;
  updateTeamUI();                                       // 更新目前隊伍提示

  totalPairs = pairCount;                               // 記錄配對數
  const selected = cardData.slice(0, pairCount);        // 擷取前 N 對卡牌
  const fullDeck = [...selected, ...selected].sort(() => 0.5 - Math.random()); // 兩組混合打亂

  fullDeck.forEach(data => {                            // 建立每張卡牌元素
    const card = document.createElement("div");         // 建立卡牌容器
    card.className = "card";                            // 設定卡牌樣式類別
    card.dataset.img = data.img;                        // 儲存圖片路徑
    card.dataset.info = data.info;                      // 儲存提示資訊
    card.innerHTML = `<img src="img/back.png" /><div class="checkmark">✔</div>`; // 預設卡背與勾勾
    card.addEventListener("click", () => flipCard(card)); // 綁定翻牌事件
    board.appendChild(card);                            // 加入至遊戲版面
  });

  clearInterval(timerInterval);                         // 清除計時器（若有）
  startTime = Date.now();                               // 紀錄開始時間
  timerInterval = setInterval(updateTimer, 1000);       // 每秒更新時間
}

// === 翻牌邏輯 ===
function flipCard(card) {
  if (card.classList.contains("flipped") || flippedCards.length === 2) return; // 忽略已翻或兩張時

  card.querySelector("img").src = `img/${card.dataset.img}`; // 顯示卡牌正面圖片
  card.classList.add("flipped");                             // 標記為已翻
  flippedCards.push(card);                                   // 加入翻牌記錄

  if (flippedCards.length === 2) {                           // 已翻兩張時
    const [first, second] = flippedCards;                    // 解構兩張卡牌
    if (first.dataset.img === second.dataset.img && first !== second) { // 改為用圖片名稱判斷是否配對
      first.classList.add("matched");                        // 標記為配對成功
      second.classList.add("matched");
      showPopup("", first.dataset.info, first.dataset.img);  // 顯示說明視窗（名稱空白）
      score[currentTeam]++;                                  // 加隊伍分數
      document.getElementById(`score${capitalize(currentTeam)}`).textContent = score[currentTeam]; // 更新畫面分數
      matchedPairs++;                                        // 成功配對加一
      flippedCards = [];                                     // 清空翻牌記錄

      if (matchedPairs === totalPairs) {                     // 判斷是否全部完成
        clearInterval(timerInterval);                        // 停止計時
        alert("遊戲結束！");                                 // 顯示結束訊息
      }
    } else {
      setTimeout(() => {                                     // 沒配對成功時，延遲反翻
        first.querySelector("img").src = "img/back.png";
        second.querySelector("img").src = "img/back.png";
        first.classList.remove("flipped");
        second.classList.remove("flipped");
        flippedCards = [];
        toggleTeam();                                        // 換隊
      }, 1000);
    }
  }
}

// === 換隊邏輯 ===
function toggleTeam() {
  currentTeam = currentTeam === "blue" ? "red" : "blue"; // 藍與紅互換
  updateTeamUI();                                        // 更新畫面提示
}

// === 更新隊伍顯示區塊的樣式與文字 ===
function updateTeamUI() {
  const teamStatus = document.getElementById("teamStatus"); // 取得顯示區塊
  teamStatus.classList.remove("blue-turn", "red-turn");     // 移除舊樣式
  teamStatus.classList.add(`${currentTeam}-turn`);          // 加上當前隊伍樣式
  document.getElementById("currentTeam").textContent = currentTeam === "blue" ? "藍隊" : "紅隊"; // 更新文字
}

// === 將隊名首字母大寫（藍隊分數藍 -> Blue）===
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);    // 將首字轉大寫
}

// === 計時器更新 ===
function updateTimer() {
  const now = Date.now();                               // 現在時間
  const elapsed = Math.floor((now - startTime) / 1000); // 計算經過秒數
  document.getElementById("timer").textContent = elapsed; // 更新畫面秒數
}

// === 顯示配對成功的彈窗說明 ===
function showPopup(title, info, img) {
  const popup = document.getElementById("popup");       // 取得彈窗區塊
  const content = document.getElementById("popup-content"); // 取得內容區塊
  content.innerHTML = `
    <img src="img/${img}" alt="" />
    <p>${info}</p>
    <button onclick="closePopup()">我已閱讀，下一步</button>
  `;                                                   // 移除未定義的名稱顯示
  popup.classList.remove("hidden");                     // 顯示彈窗
}

// === 關閉彈窗 ===
function closePopup() {
  document.getElementById("popup").classList.add("hidden"); // 加上隱藏樣式
}
