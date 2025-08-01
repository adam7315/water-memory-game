let flippedCards = [];
let currentTeam = "blue";
let score = { blue: 0, red: 0 };
let matchedPairs = 0;
let totalPairs = 0;
let timerInterval;
let startTime;

const cardData = [
  { name: "水庫", img: "reservoir.png", info: "水庫可以儲存雨水，穩定供應民生與農業用水。" },
  { name: "河川", img: "river.png", info: "河川是地表水的重要來源，也是許多生態的棲息地。" },
  { name: "海水淡化", img: "desalination.png", info: "海水經過機器處理，把鹽分去除後就變成可以使用的淡水，是穩定的備援水源，幫助缺水地區解渴。" },
  { name: "地下水", img: "groundwater.png", info: "地下水是藏在地表以下、土壤或岩石孔隙和裂隙中的水寶藏，可以鑽井適度抽起來使用。" },
  { name: "伏流水", img: "infiltration.png", info: "伏流水是河川下方的地下水，取水設施容易建造。" },
  { name: "埤塘", img: "pond.png", info: "埤塘可蓄水與灌溉，為早期農村重要的水資源。" },
  { name: "雨水回收", img: "rainwater.png", info: "透過設施收集雨水，可再利用於非飲用用途。" },
  { name: "再生水", img: "reclaimed.png", info: "將污水淨化再利用，是新興的替代水源方式。" }
];

function startGame(pairCount) {
  const board = document.getElementById("gameBoard");
  board.innerHTML = "";
  flippedCards = [];
  matchedPairs = 0;
  score = { blue: 0, red: 0 };
  currentTeam = "blue";
  document.getElementById("scoreBlue").textContent = 0;
  document.getElementById("scoreRed").textContent = 0;
  updateTeamUI();

  totalPairs = pairCount;
  const selected = cardData.slice(0, pairCount);
  const fullDeck = [...selected, ...selected].sort(() => 0.5 - Math.random());

  fullDeck.forEach(data => {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.name = data.name;
    card.dataset.img = data.img;
    card.dataset.info = data.info;
    card.innerHTML = `<img src="img/back.png" /><div class="checkmark">✔</div>`;
    card.addEventListener("click", () => flipCard(card));
    board.appendChild(card);
  });

  clearInterval(timerInterval);
  startTime = Date.now();
  timerInterval = setInterval(updateTimer, 1000);
}

function flipCard(card) {
  if (card.classList.contains("flipped") || flippedCards.length === 2) return;

  card.querySelector("img").src = `img/${card.dataset.img}`;
  card.classList.add("flipped");
  flippedCards.push(card);

  if (flippedCards.length === 2) {
    const [first, second] = flippedCards;
    if (first.dataset.name === second.dataset.name && first !== second) {
      first.classList.add("matched");
      second.classList.add("matched");
      showPopup(first.dataset.name, first.dataset.info, first.dataset.img);
      score[currentTeam]++;
      document.getElementById(`score${capitalize(currentTeam)}`).textContent = score[currentTeam];
      matchedPairs++;
      if (matchedPairs === totalPairs) {
        clearInterval(timerInterval);
        alert("遊戲結束！");
      }
    } else {
      setTimeout(() => {
        first.querySelector("img").src = "img/back.png";
        second.querySelector("img").src = "img/back.png";
        first.classList.remove("flipped");
        second.classList.remove("flipped");
        flippedCards = [];
        toggleTeam();
      }, 1000);
    }
  }
}

function toggleTeam() {
  currentTeam = currentTeam === "blue" ? "red" : "blue";
  updateTeamUI();
}

function updateTeamUI() {
  const teamStatus = document.getElementById("teamStatus");
  teamStatus.classList.remove("blue-turn", "red-turn");
  teamStatus.classList.add(`${currentTeam}-turn`);
  document.getElementById("currentTeam").textContent = currentTeam === "blue" ? "藍隊" : "紅隊";
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function updateTimer() {
  const now = Date.now();
  const elapsed = Math.floor((now - startTime) / 1000);
  document.getElementById("timer").textContent = elapsed;
}

function showPopup(title, info, img) {
  const popup = document.getElementById("popup");
  const content = document.getElementById("popup-content");
  content.innerHTML = `
    <img src="img/${img}" alt="${title}" />
    <h3>${title}</h3>
    <p>${info}</p>
    <button onclick="closePopup()">我已閱讀，下一步</button>
  `;
  popup.classList.remove("hidden");
}

function closePopup() {
  document.getElementById("popup").classList.add("hidden");
  flippedCards = [];
  toggleTeam();
}
