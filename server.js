const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

const db = new sqlite3.Database("quiz.db");

app.use(express.static(path.join(__dirname, "public")));

let players = {};
let readyPlayers = new Set();
let questionList = [];
let currentQuestion = 0;
let gameStarted = false;
let questionTimer = null;

const TIME_LIMITS = {
  easy: 20,
  medium: 30,
  hard: 40
};

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT,
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    correct TEXT,
    difficulty TEXT DEFAULT 'medium'
  )`);

  db.get("SELECT COUNT(*) as count FROM questions", (err, row) => {
    if (row.count === 0) {
      const stmt = db.prepare("INSERT INTO questions (question, option_a, option_b, option_c, option_d, correct, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)");
      const sample = [
        ["Capital of France?", "Paris", "Berlin", "Rome", "Madrid", "Paris", "easy"],
        ["2 + 2 = ?", "3", "4", "5", "6", "4", "easy"],
        ["Red Planet?", "Earth", "Mars", "Venus", "Saturn", "Mars", "easy"],
        ["Sun rises in the?", "West", "East", "North", "South", "East", "medium"],
        ["Largest ocean?", "Atlantic", "Pacific", "Indian", "Arctic", "Pacific", "medium"],
        ["Who wrote 'Romeo and Juliet'?", "Dickens", "Shakespeare", "Austen", "Wilde", "Shakespeare", "medium"],
        ["What is the chemical symbol for gold?", "Go", "Gd", "Au", "Ag", "Au", "hard"],
        ["Which planet has the most moons?", "Jupiter", "Saturn", "Uranus", "Neptune", "Saturn", "hard"]
      ];
      sample.forEach(q => stmt.run(q));
      stmt.finalize();
      console.log("Sample questions inserted into database");
    }
  });
});

// Socket handling
io.on("connection", (socket) => {
  console.log(`[CONNECTION] New socket connected: ${socket.id}`);

  socket.on("join", (name) => {
    if (gameStarted) {
      console.log(`[BLOCKED] ${name} tried to join during game`);
      socket.emit("joinBlocked");
      return;
    }

    players[socket.id] = { name, score: 0, answered: false };
    console.log(`[JOINED] ${name} (${socket.id})`);
    socket.emit("joinSuccess");
    io.emit("players", Object.values(players));
  });

  socket.on("ready", () => {
    if (!players[socket.id]) return;
    
    readyPlayers.add(socket.id);
    console.log(`[READY] ${players[socket.id]?.name}`);
    io.emit("playerReady", Array.from(readyPlayers).map(id => players[id].name));

    if (!gameStarted && readyPlayers.size === Object.keys(players).length && Object.keys(players).length > 0) {
      startGame();
    }
  });

  socket.on("answer", ({ answer, timeTaken }) => {
    const player = players[socket.id];
    if (!player || player.answered) return;

    player.answered = true;
    player.answer = answer;
    player.timeTaken = Number(timeTaken);

    console.log(`[ANSWER] ${player.name} answered '${answer}' in ${player.timeTaken} ms`);

    // Check if all players have answered
    checkAllAnswered();
  });

  socket.on("disconnect", () => {
    const playerName = players[socket.id]?.name;
    console.log(`[DISCONNECTED] ${playerName}`);
    delete players[socket.id];
    readyPlayers.delete(socket.id);
    
    if (!gameStarted) {
      io.emit("players", Object.values(players));
    }
  });
});

function startGame() {
  gameStarted = true;
  console.log("[GAME START] Loading questions...");
  
  db.all("SELECT * FROM questions ORDER BY RANDOM() LIMIT 5", (err, rows) => {
    if (err) {
      console.error("Error loading questions:", err);
      return;
    }
    
    questionList = rows;
    currentQuestion = 0;
    console.log(`[GAME START] Loaded ${questionList.length} questions`);
    sendNextQuestion();
  });
}

function sendNextQuestion() {
  for (let id in players) {
    players[id].answered = false;
    players[id].answer = null;
    players[id].timeTaken = null;
  }

  const question = questionList[currentQuestion];
  const timeLimit = TIME_LIMITS[question.difficulty] || 30;

  console.log(`[QUESTION ${currentQuestion + 1}] Sending: ${question.question} (${question.difficulty}, ${timeLimit}s)`);

  io.emit("question", {
    ...question,
    index: currentQuestion + 1,
    total: questionList.length,
    timeLimit: timeLimit
  });

  if (questionTimer) clearTimeout(questionTimer);
  questionTimer = setTimeout(() => {
    console.log(`[TIMEOUT] Question ${currentQuestion + 1} timed out`);
    processQuestionResults();
  }, timeLimit * 1000);
}

function checkAllAnswered() {
  const allAnswered = Object.values(players).every(p => p.answered);
  if (allAnswered) {
    console.log("[ALL ANSWERED] Processing results...");
    if (questionTimer) clearTimeout(questionTimer);
    processQuestionResults();
  }
}

function processQuestionResults() {
  const correctAnswer = questionList[currentQuestion].correct;
  console.log(`[RESULTS] Correct answer: ${correctAnswer}`);

  const correctPlayers = Object.entries(players)
    .filter(([_, p]) => p.answer === correctAnswer)
    .sort((a, b) => a[1].timeTaken - b[1].timeTaken);

  console.log(`[RESULTS] ${correctPlayers.length} players answered correctly`);

  const rankRewards = [1000, 800, 600, 400, 200];
  let fastestPlayer = null;
  let fastestTime = null;

  correctPlayers.forEach(([id, player], index) => {
    const reward = rankRewards[index] || 200; // all others get 200
    player.score += reward;
    
    if (index === 0) {
      fastestPlayer = player.name;
      fastestTime = player.timeTaken;
    }
    
    console.log(`--> ${player.name} earned ${reward} points (Rank ${index + 1})`);
    io.to(id).emit("reward", reward);
  });

  // Send results to all players
  io.emit("questionResults", {
    correctAnswer: correctAnswer,
    fastestPlayer: fastestPlayer,
    fastestTime: fastestTime,
    scores: Object.values(players)
  });

  // Update leaderboard
  io.emit("scoreUpdate", Object.values(players));

  // Move to next question after 3 seconds
  setTimeout(() => {
    currentQuestion++;
    if (currentQuestion < questionList.length) {
      sendNextQuestion();
    } else {
      endGame();
    }
  }, 3000);
}

function endGame() {
  console.log("[GAME END] Final scores:");
  const sortedPlayers = Object.values(players).sort((a, b) => b.score - a.score);
  sortedPlayers.forEach((player, index) => {
    console.log(`${index + 1}. ${player.name}: ${player.score} points`);
  });

  io.emit("gameOver", sortedPlayers);
  resetGame();
}

function resetGame() {
  console.log("[RESET] Resetting game state");
  players = {};
  readyPlayers.clear();
  gameStarted = false;
  questionList = [];
  currentQuestion = 0;
  
  if (questionTimer) {
    clearTimeout(questionTimer);
    questionTimer = null;
  }
}

server.listen(PORT, () => {
  console.log(`Quiz game server running at http://localhost:${PORT}`);
  console.log("Players can join using the Raspberry Pi's IP address");
});
