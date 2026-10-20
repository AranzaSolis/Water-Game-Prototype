// Variables to control game state
let gameRunning = false; // Keeps track of whether game is active or not
let dropMaker; // Will store our timer that creates drops regularly
let score = 0;
let gameDropsCollected = 0;
let totalDrops = Number(localStorage.getItem("totalDropsCollected") || 0);
let bestScore = Number(localStorage.getItem("bestScore") || 0);
let lastFunFactIndex = -1;
let audioContext;
let countdownMaker;
let collisionChecker;
let timeRemaining = 30;
let soundEnabled = localStorage.getItem("soundEnabled") !== "false";
let volumeLevel = Number(localStorage.getItem("volumeLevel") || 70) / 100;
let factsVisible = localStorage.getItem("factsVisible") !== "false";
let gameStartTime = 0;

const funFacts = [
  "A nearby source of safe water can turn a daily trek into extra time for learning, earning, and family life.",
  "Safe water and sanitation help communities prevent waterborne diseases.",
  "Small drops of support can help bring lasting clean water solutions to communities.",
  "100% of public donations fund clean water projects!",
  "charity: water shares photos and GPS coordinates of its water projects so supporters can see where their contributions are making an impact.",
  "According to charity: water, approximately 696 million people lack access to clean and safe drinking water.",
  "According to charity: water Stories' \"The Water Crisis is a Women's Issue,\" women and girls spend an estimated 200 million hours every day collecting water worldwide."
];

const homeScreen = document.getElementById("home-screen");
const gameScreen = document.getElementById("game-screen");
const scoreElement = document.getElementById("score");
const timeElement = document.getElementById("time");
const totalDropsElement = document.getElementById("total-drops");
const gameContainer = document.getElementById("game-container");
const bucketCursor = document.getElementById("bucket-cursor");
const howToDialog = document.getElementById("how-to-dialog");
const storeDialog = document.getElementById("store-dialog");
const gameOverDialog = document.getElementById("game-over-dialog");
const gameOverScore = document.getElementById("game-over-score");
const bestScoreElement = document.getElementById("best-score");
const funFactElement = document.getElementById("fun-fact-text");
const settingsDialog = document.getElementById("settings-dialog");
const volumeControl = document.getElementById("volume-control");
const volumeValue = document.getElementById("volume-value");
const soundToggle = document.getElementById("sound-toggle");
const factsToggle = document.getElementById("facts-toggle");
const resetSettingsButton = document.getElementById("reset-settings");
let bucketPosition = 0;

totalDropsElement.textContent = totalDrops;
bestScoreElement.textContent = bestScore;
volumeControl.value = Math.round(volumeLevel * 100);
volumeValue.textContent = `${volumeControl.value}%`;
soundToggle.checked = soundEnabled;
factsToggle.checked = factsVisible;
document.body.classList.toggle("facts-hidden", !factsVisible);
showRandomFunFact();

document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("restart-btn").addEventListener("click", returnHome);
document.getElementById("results-home-button").addEventListener("click", returnHome);
document.getElementById("results-try-again").addEventListener("click", () => {
  gameOverDialog.close();
  startGame();
});
document.getElementById("results-store").addEventListener("click", () => {
  gameOverDialog.close();
  storeDialog.showModal();
});
document.getElementById("settings-button").addEventListener("click", () => settingsDialog.showModal());
document.getElementById("how-to-play").addEventListener("click", () => howToDialog.showModal());
document.getElementById("store").addEventListener("click", () => storeDialog.showModal());
gameContainer.addEventListener("pointermove", (event) => {
  const bounds = gameContainer.getBoundingClientRect();
  moveBucket(event.clientX - bounds.left);
  checkBucketCollisions();
});
volumeControl.addEventListener("input", () => {
  volumeLevel = Number(volumeControl.value) / 100;
  volumeValue.textContent = `${volumeControl.value}%`;
  localStorage.setItem("volumeLevel", volumeControl.value);
});
soundToggle.addEventListener("change", () => {
  soundEnabled = soundToggle.checked;
  localStorage.setItem("soundEnabled", soundEnabled);
});
factsToggle.addEventListener("change", () => {
  factsVisible = factsToggle.checked;
  document.body.classList.toggle("facts-hidden", !factsVisible);
  localStorage.setItem("factsVisible", factsVisible);
});
resetSettingsButton.addEventListener("click", () => {
  volumeLevel = 0.7;
  soundEnabled = true;
  factsVisible = true;
  volumeControl.value = 70;
  volumeValue.textContent = "70%";
  soundToggle.checked = true;
  factsToggle.checked = true;
  document.body.classList.remove("facts-hidden");
  localStorage.removeItem("volumeLevel");
  localStorage.removeItem("soundEnabled");
  localStorage.removeItem("factsVisible");
});
document.querySelectorAll(".dialog-close").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

function startGame() {
  // Prevent multiple games from running at once
  if (gameRunning) return;

  gameRunning = true;
  score = 0;
  gameDropsCollected = 0;
  gameStartTime = Date.now();
  timeRemaining = 30;
  scoreElement.textContent = score;
  timeElement.textContent = timeRemaining;
  homeScreen.hidden = true;
  gameScreen.hidden = false;
  moveBucket(gameContainer.offsetWidth / 2);
  playTone(440, 0.12);

  scheduleNextDrop();
  collisionChecker = setInterval(checkBucketCollisions, 50);
  countdownMaker = setInterval(() => {
    timeRemaining -= 1;
    timeElement.textContent = timeRemaining;

    if (timeRemaining <= 0) {
      endGame();
    }
  }, 1000);
}

function returnHome() {
  clearTimeout(dropMaker);
  clearInterval(countdownMaker);
  clearInterval(collisionChecker);
  gameRunning = false;
  gameOverDialog.close();
  clearDrops();
  gameScreen.hidden = true;
  homeScreen.hidden = false;
  showRandomFunFact();
}

function endGame() {
  clearTimeout(dropMaker);
  clearInterval(countdownMaker);
  clearInterval(collisionChecker);
  gameRunning = false;
  clearDrops();
  gameOverScore.textContent = gameDropsCollected;
  if (gameDropsCollected > bestScore) {
    bestScore = gameDropsCollected;
    bestScoreElement.textContent = bestScore;
    localStorage.setItem("bestScore", bestScore);
  }
  bestScoreElement.textContent = bestScore;
  gameOverDialog.showModal();
}

function showRandomFunFact() {
  let nextFunFactIndex;

  do {
    nextFunFactIndex = Math.floor(Math.random() * funFacts.length);
  } while (funFacts.length > 1 && nextFunFactIndex === lastFunFactIndex);

  lastFunFactIndex = nextFunFactIndex;
  funFactElement.textContent = funFacts[nextFunFactIndex];
}

function createDrop() {
  // Create a new div element that will be our water drop
  const drop = document.createElement("div");
  const polluted = Math.random() < getPollutionChance();
  drop.className = polluted ? "water-drop bad-drop" : "water-drop";
  drop.setAttribute("role", "button");
  drop.setAttribute("aria-label", polluted ? "Avoid polluted drop" : "Collect water drop");

  drop.addEventListener("click", () => {
    if (!gameRunning || drop.dataset.resolved) return;
    collectDrop(drop, polluted);
  });

  // Make drops different sizes for visual variety
  const initialSize = 60;
  const sizeMultiplier = Math.random() * 0.8 + 0.5;
  const size = initialSize * sizeMultiplier;
  drop.style.width = drop.style.height = `${size}px`;

  // Position the drop randomly across the game width
  // Subtract 60 pixels to keep drops fully inside the container
  const gameWidth = document.getElementById("game-container").offsetWidth;
  const xPosition = Math.random() * (gameWidth - 60);
  drop.style.left = xPosition + "px";

  drop.style.animationDuration = `${getFallDuration()}s`;

  // Add the new drop to the game screen
  gameContainer.appendChild(drop);

  // Remove drops that reach the bottom (weren't clicked)
  drop.addEventListener("animationend", () => {
    if (isTouchingBucket(drop)) {
      collectDrop(drop, polluted);
      return;
    }

    drop.remove(); // Clean up drops that weren't caught
  });
}

function moveBucket(position) {
  const bucketHalfWidth = bucketCursor.offsetWidth / 2;
  bucketPosition = Math.max(bucketHalfWidth, Math.min(position, gameContainer.offsetWidth - bucketHalfWidth));
  bucketCursor.style.left = `${bucketPosition}px`;
}

function checkBucketCollisions() {
  gameContainer.querySelectorAll(".water-drop").forEach((drop) => {
    if (isTouchingBucket(drop)) {
      collectDrop(drop, drop.classList.contains("bad-drop"));
    }
  });
}

function isTouchingBucket(drop) {
  const dropRect = drop.getBoundingClientRect();
  const bucketRect = bucketCursor.getBoundingClientRect();

  return dropRect.bottom >= bucketRect.top
    && dropRect.top <= bucketRect.bottom
    && dropRect.right >= bucketRect.left
    && dropRect.left <= bucketRect.right;
}

function collectDrop(drop, polluted) {
  if (drop.dataset.resolved) return;

  drop.dataset.resolved = "true";
  if (polluted) {
    score = Math.max(0, score - 1);
    playTone(180, 0.12);
  } else {
    score += 1;
    gameDropsCollected += 1;
    totalDrops += 1;
    totalDropsElement.textContent = totalDrops;
    localStorage.setItem("totalDropsCollected", totalDrops);
    playTone(660, 0.08);
  }
  scoreElement.textContent = score;
  drop.remove();
}

function clearDrops() {
  gameContainer.querySelectorAll(".water-drop").forEach((drop) => drop.remove());
}

function scheduleNextDrop() {
  if (!gameRunning) return;

  dropMaker = setTimeout(() => {
    createDrop();
    scheduleNextDrop();
  }, getSpawnInterval());
}

function getDifficultyLevel() {
  return Math.floor((Date.now() - gameStartTime) / 5000);
}

function getSpawnInterval() {
  return Math.max(250, 1000 - getDifficultyLevel() * 130);
}

function getFallDuration() {
  return Math.max(1.2, 4 - getDifficultyLevel() * 0.45);
}

function getPollutionChance() {
  return Math.min(0.55, 0.08 + getDifficultyLevel() * 0.09);
}

function playTone(frequency, duration) {
  if (!soundEnabled || volumeLevel === 0) return;

  audioContext ??= new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volumeLevel * 0.08, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}
