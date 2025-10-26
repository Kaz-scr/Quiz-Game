const socket = io();

let startTime;
let timerInterval;
let nextQuestionInterval;
let currentQuestionIndex = 0;
let totalQuestions = 0;

document.addEventListener('DOMContentLoaded', () => {
  const nameInput = document.getElementById('name-input');
  nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      submitName();
    }
  });
  nameInput.focus();
});

function submitName() {
  const name = document.getElementById("name-input").value.trim();
  if (!name) {
    showNotification('Please enter your name!', 'error');
    return;
  }
  if (name.length > 20) {
    showNotification('Name too long! Max 20 characters.', 'error');
    return;
  }
  
  const btn = document.querySelector('#name-screen .btn');
  btn.innerHTML = '<i class="fas fa-spinner loading"></i>Joining...';
  btn.disabled = true;
  
  socket.emit("join", name);
  document.getElementById("playerName").textContent = name;
}

function setReady() {
  const btn = event.target;
  btn.innerHTML = '<i class="fas fa-spinner loading"></i>Getting Ready...';
  btn.disabled = true;
  socket.emit("ready");
}

function showScreen(screenId) {
  const screens = document.querySelectorAll('.screen');
  screens.forEach(screen => screen.classList.add('hidden'));
  
  document.getElementById(screenId).classList.remove('hidden');
}

function showNotification(message, type = 'info') {
  alert(message);
}

socket.on("joinSuccess", () => {
  showScreen('ready-screen');
});

socket.on("joinBlocked", () => {
  document.getElementById("game-blocked-message").classList.remove("hidden");
  const btn = document.querySelector('#name-screen .btn');
  btn.innerHTML = '<i class="fas fa-sign-in-alt icon"></i>Join Game';
  btn.disabled = false;
});

socket.on("nameTaken", () => {
  const btn = document.querySelector('#name-screen .btn');
  btn.innerHTML = '<i class="fas fa-sign-in-alt icon"></i>Join Game';
  btn.disabled = false;
  showNotification('That name is already taken. Please choose another!', 'error');
});

socket.on("players", (list) => {
  const container = document.getElementById("playerList");
  if (container) {
    container.innerHTML = list.map(p => 
      `<div class="player-card">
        <i class="fas fa-user icon"></i>${p.name}
      </div>`
    ).join("");
  }
});

socket.on("playerReady", (readyNames) => {
  const ul = document.getElementById("readyList");
  if (ul) {
    ul.innerHTML = readyNames.map(name => 
      `<li>
        <span><i class="fas fa-user icon"></i>${name}</span>
        <span class="ready-indicator"><i class="fas fa-check-circle"></i> Ready</span>
      </li>`
    ).join("");
  }
});

socket.on("question", (q) => {
  currentQuestionIndex = q.index;
  totalQuestions = q.total;
  
  showScreen('question-screen');
  
  const container = document.querySelector('.container');
  if (q.difficulty === 'mythical') {
    container.classList.add('mythical-theme'); 
    document.body.classList.add('mythical-body'); 
  } else {
    container.classList.remove('mythical-theme'); 
    document.body.classList.remove('mythical-body');
  }
  
  const progressFill = document.getElementById('progress-fill');
  const progressPercent = (currentQuestionIndex / totalQuestions) * 100;
  progressFill.style.width = progressPercent + '%';
  
  const difficultyClass = `difficulty-${q.difficulty}`;
  document.getElementById("question-title").innerHTML = 
    `<strong>Question ${q.index} of ${q.total}</strong><br>
     ${q.question} 
     <span class="difficulty-badge ${difficultyClass}">
       <i class="fas fa-star"></i> ${q.difficulty.toUpperCase()}
     </span>`;
  
  // Create answer options with better styling
  const options = ["a", "b", "c", "d"];
  const labels = ["option_a", "option_b", "option_c", "option_d"];
  const optDiv = document.getElementById("options");
  
  optDiv.innerHTML = options.map((opt, i) =>
    `<button class="option-btn" onclick="submitAnswer('${q[labels[i]]}')">
      <strong>${opt.toUpperCase()})</strong> ${q[labels[i]]}
    </button>`
  ).join("");

  startTime = Date.now();
  startTimer(q.timeLimit);
});

function startTimer(seconds) {
  let timeLeft = seconds;
  const timerText = document.getElementById("timer-text");
  const timerDiv = document.getElementById("timer");
  
  // Clear any existing timer
  if (timerInterval) clearInterval(timerInterval);
  
  // Update timer display function
  const updateTimer = () => {
    const minutes = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const timeString = `${secs}s`;
    
    timerText.textContent = timeLeft > 0 ? timeString : "Time's Up!";
    
    // Change color based on time remaining
    if (timeLeft <= 5) {
      timerDiv.style.background = 'linear-gradient(135deg, #f56565, #e53e3e)';
    } else if (timeLeft <= 10) {
      timerDiv.style.background = 'linear-gradient(135deg, #ffa500, #ff8c00)';
    }
  };
  
  // Initial display
  updateTimer();
  
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimer();
    
    if (timeLeft < 0) {
      clearInterval(timerInterval);
      const buttons = document.querySelectorAll(".option-btn");
      buttons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
      });
    }
  }, 1000);
}

function submitAnswer(choice) {
  const timeTaken = Date.now() - startTime;
  socket.emit("answer", { answer: choice, timeTaken });
  
  const buttons = document.querySelectorAll(".option-btn");
  buttons.forEach(btn => {
    btn.disabled = true;
    if (btn.textContent.includes(choice)) {
      btn.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
      btn.style.color = 'white';
      btn.style.borderColor = '#667eea';
    } else {
      btn.style.opacity = '0.5';
    }
  });
  
  document.getElementById("options").innerHTML = 
    `<div style="text-align: center; padding: 20px; background: #f0fff4; border-radius: 10px; border-left: 4px solid #48bb78;">
      <i class="fas fa-check-circle" style="color: #48bb78; margin-right: 10px;"></i>
      <strong>Answer submitted!</strong> Waiting for other players...
    </div>`;
  
  // Clear timer
  if (timerInterval) {
    clearInterval(timerInterval);
    document.getElementById("timer-text").textContent = "Answer Submitted!";
    document.getElementById("timer").style.background = 'linear-gradient(135deg, #48bb78, #38a169)';
  }
}

socket.on("questionResults", (data) => {
  showScreen('results-screen');
  
  // Show fastest player
  const fastestDiv = document.getElementById("fastest-player");
  if (data.fastestPlayer) {
    fastestDiv.innerHTML = `
      <i class="fas fa-trophy" style="font-size: 1.5rem; margin-right: 10px;"></i>
      <strong>Fastest Correct Answer:</strong><br>
      ${data.fastestPlayer} <small>(${data.fastestTime}ms)</small>
    `;
    fastestDiv.className = "fastest-player";
  } else {
    fastestDiv.innerHTML = `
      <i class="fas fa-times-circle" style="font-size: 1.5rem; margin-right: 10px;"></i>
      <strong>No one answered correctly this time!</strong>
    `;
    fastestDiv.className = "fastest-player no-correct";
  }
  
  // Show correct answer
  document.getElementById("correct-answer").innerHTML = 
    `<div style="background: #e6fffa; padding: 15px; border-radius: 10px; border-left: 4px solid #38b2ac;">
      <i class="fas fa-lightbulb icon" style="color: #38b2ac;"></i>
      <strong>Correct Answer:</strong> ${data.correctAnswer}
    </div>`;
  
  // Update scores in results screen
  const resultsLb = document.getElementById("results-leaderboard");
  resultsLb.innerHTML = data.scores
    .sort((a,b) => b.score - a.score)
    .map((p, index) => {
      const medal = index === 0 ? "FIRST" : index === 1 ? "SECOND" : index === 2 ? "THIRD" : "";
      return `<li>
        <span>${medal} <i class="fas fa-user icon"></i>${p.name}</span>
        <span><strong>${p.score} pts</strong></span>
      </li>`;
    }).join("");
  
  // Start countdown for next question
  startNextQuestionCountdown();
});

function startNextQuestionCountdown() {
  let countdown = 5;
  const countdownSpan = document.getElementById("next-countdown");
  
  if (nextQuestionInterval) clearInterval(nextQuestionInterval);
  
  nextQuestionInterval = setInterval(() => {
    countdown--;
    countdownSpan.textContent = countdown;
    
    if (countdown <= 0) {
      clearInterval(nextQuestionInterval);
    }
  }, 1000);
}

socket.on("scoreUpdate", (list) => {
  const lb = document.getElementById("leaderboard");
  if (lb) {
    lb.innerHTML = list
      .sort((a,b) => b.score - a.score)
      .map((p, index) => {
        const medal = index === 0 ? "FIRST" : index === 1 ? "SECOND" : index === 2 ? "THIRD" : "";
        return `<li>
          <span>${medal} <i class="fas fa-user icon"></i>${p.name}</span>
          <span><strong>${p.score} pts</strong></span>
        </li>`;
      }).join("");
  }
});

socket.on("reward", (points) => {
  console.log(`You earned ${points} points!`);
});

socket.on("gameOver", (players) => {
  // Clear any running intervals
  if (timerInterval) clearInterval(timerInterval);
  if (nextQuestionInterval) clearInterval(nextQuestionInterval);
  
  showScreen('gameover-screen');
  
  const fs = document.getElementById("final-scores");
  fs.innerHTML = players
    .sort((a,b) => b.score - a.score)
    .map((p, index) => {
      const medal = index === 0 ? "FIRST" : index === 1 ? "SECONDS" : index === 2 ? "THIRD" : "";
      return `<li>
        <span class="medal">${medal}</span>
        <span><i class="fas fa-user icon"></i>${p.name}</span>
        <span><strong>${p.score} pts</strong></span>
      </li>`;
    }).join("");
});
