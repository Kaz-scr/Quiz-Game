Quiz Game 🧠
A real-time multiplayer quiz game with a pixelated/8-bit aesthetic design. Players can join, answer timed questions, and compete on a live leaderboard.

https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white
https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=white
https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white
https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black
https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white
https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white

Features
 Real-time multiplayer gameplay using Socket.IO

 Pixelated/8-bit visual design with custom styling

 Timer-based questions with multiple difficulty levels

 Live leaderboard with real-time updates

 Rank-based scoring system (1000, 800, 600, 400, 200 points)

 Responsive design that works on desktop and mobile

 SQLite database for question storage

 Player ready system to start games simultaneously

Screenshots
<img width="1901" height="857" alt="image" src="https://github.com/user-attachments/assets/544e2132-7bd9-4bbb-a724-5f4c4947c783" />
<img width="1902" height="868" alt="image" src="https://github.com/user-attachments/assets/802caca8-7f3f-4aca-969e-ac75455125f0" />


Technologies Used
Backend: Node.js, Express.js, Socket.IO, SQLite3

Frontend: HTML5, CSS3, JavaScript (ES6+)

Styling: Custom pixelated CSS, Google Fonts (Jersey 10)

Icons: Font Awesome

Database: SQLite

Project Structure
text
pi-quiz-game/
├── index.html          # Main HTML file with all game screens
├── style.css           # Pixelated styling and responsive design
├── script.js           # Client-side logic and Socket.IO handlers
├── server.js           # Express/Socket.IO server with game logic
├── quiz.db             # SQLite database (created automatically)
├── package.json        # Node.js dependencies and project info
└── README.md           # This documentation file
Installation & Setup
Prerequisites
Node.js (v14 or higher)

npm (Node Package Manager)

Step-by-Step Installation
Clone the repository

bash
git clone https://github.com/your-username/Quiz-Game.git
cd Quiz-Game
Install dependencies

bash
npm install
Start the server

bash
node server.js
Access the game

Open your browser and navigate to http://localhost:3000

How to Play
Join the Game: Enter your name on the welcome screen

Get Ready: Click "I'm Ready" once all players have joined

Answer Questions: Select the correct answer before time runs out

Earn Points: Faster answers earn more points.

Win: The player with the highest score at the end wins!

5th+ correct answers: 200 points

Database: Includes sample questions but can be easily extended
