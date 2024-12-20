import './style.css';
//import './api.js';

let currentQuote = null;
let startTime = Date.now();
let score = 0;
let player = "";

const View = {
  Menu: 0,
  Lobby: 1,
  Game: 2
};

let view = View.Menu;

class Api {
    constructor(serverUrl = "http://localhost:3001") {
        this.SERVER_URL = serverUrl;
    }

    setServerUrl(serverUrl) {
        this.SERVER_URL = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;;
    }

    async updateScoreboard(player, score) {
        try {
            const response = await fetch(`${this.SERVER_URL}/update_score`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: player, score: score }),
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            document.querySelector('#score-list').innerHTML = `<p>Cannot update scoreboard :(</p>`;
            console.error('Error updating scoreboard: ', error);
        }
    }

    async getGameStatus() {
        try {
            const response = await fetch(`${this.SERVER_URL}/game_status`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching game status: ', error);
        }
    }

    async startGame(amountOfRounds, roundLength) {
        try {
            const response = await fetch(`${this.SERVER_URL}/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ amountOfRounds: amountOfRounds, roundLength: roundLength }),
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error starting game: ', error);
        }
    }

    async getRandomQuotes() {
        try {
            const response = await fetch(`${this.SERVER_URL}/random_quotes`);
            const data = await response.json();
            const randomQuote = data[0];
            const allOptions = data[1];
            return [randomQuote, allOptions];
        } catch (error) {
            document.querySelector('#app').innerHTML = `<p>Connection to server lost :(</p>`;
            console.error('Error fetching quotes: ', error);
        }
    }

    async getStartTime() {
        try {
            const response = await fetch(`${this.SERVER_URL}/start_time`);
            return await response.json();
        } catch (error) {
            console.error('Error getting start time: ', error);
        }
    }
}

const api = new Api("http://localhost:3001");

async function updateScoreboard() {
    if (player === "") {
        return;
    }
    const data = await api.updateScoreboard(player, score);
    const scoreList = document.querySelector('#score-list');
    scoreList.innerHTML = '';
    data.forEach(([player, score]) => {
      const listItem = document.createElement('li');
      listItem.textContent = `${player}: ${score} punten`;
      scoreList.appendChild(listItem);
    });
}

async function updateStartTime() {
    startTime = await api.getStartTime();
}

function updateRemainingTime() {
    const elapsedTime = Date.now() - startTime;
    const remainingTime = 10000 - elapsedTime;
    const percentage = Math.max(0, (remainingTime / 10000) * 100);
    document.getElementById('slider').value = percentage;
}

// Function to fetch and parse the output.ini file
async function mainLoop() {
    const gameStarted = await api.getGameStatus();
    if (!gameStarted) {
        if (view === View.Game) {
            enableLobbyView();
        }
        return;
    } else if (view === View.Menu) {
        return;
    } else if (view === View.Lobby) {
        enableGameView();
    }
    const [randomQuote, allOptions] = await api.getRandomQuotes();
    if (currentQuote != null && randomQuote.quote === currentQuote.quote) {
        return;
    }
    await updateStartTime();
    currentQuote = randomQuote;

    let correctIndex = -1;
    let selectedIndex = -1;
    for (let i = 0; i < allOptions.length; i++) {
        if (allOptions[i] === randomQuote.nonQuote) {
            correctIndex = i;
            break;
        }
    }
    // Display the random quote and non-quotes in the HTML
    document.querySelector('#app').innerHTML = `
        <h2>"${randomQuote.quote}"</h2>
        <ul id="options">
            ${allOptions.map((option, index) => `<li><button id="option-${index}">${option}</button></li>`).join('')}
        </ul>
    `;

    document.querySelectorAll('#options button').forEach((button, index) => {
        button.addEventListener('click', function () {
            selectedIndex = index;
            document.querySelectorAll('#options button').forEach(btn => btn.style.backgroundColor = '');
            this.style.backgroundColor = '#555555';
        });
    });
    function displayAnswerFeedback() {
        if (selectedIndex === correctIndex) {
                score += 1;
        }
        document.querySelectorAll('#options button').forEach((button, index) => {
            // Always highlight the correct answer in green
            if (index === correctIndex) {
                button.style.backgroundColor = 'green';
            }
            // If selected index is incorrect, highlight it in red
            else if (index === selectedIndex) {
                button.style.backgroundColor = 'red';
            }

            // Disable all buttons after feedback is shown
            button.disabled = true;
        });
    }
    const elapsedTime = Date.now() - startTime;
    const remainingTime = 10000 - elapsedTime;
    setTimeout(displayAnswerFeedback, remainingTime);
}

function clearView() {
    document.getElementById("app-menu").style.display = "none";
    document.getElementById("scoreboard").style.display = "none";
    document.getElementById("lobby").style.display = "none";
    document.getElementById("slider-container").style.display = "none";
    document.getElementById("app").style.display = "none";
    document.getElementById("menu-view").style.display = "none";
}

function enableLobbyView() {
    clearView();
    view = View.Lobby;
    document.getElementById("app-menu").style.display = "block";
    document.getElementById("scoreboard").style.display = "block";
    document.getElementById("lobby").style.display = "block";
}

document.getElementById("join-game-button").addEventListener("click", function() {
    // Get the player's name from the input field
    const playerName = document.getElementById("player-name").value;
    const serverURL = document.getElementById("server-url").value;
    if (playerName.trim() !== "") {
        player = playerName;
        api.setServerUrl(serverURL);
        enableLobbyView();
    } else {
        alert("Please enter your name to start the game.");
    }
});

function enableGameView() {
    clearView();
    view = View.Game;
    document.getElementById("slider-container").style.display = "flex";
    document.getElementById("app").style.display = "block";
    document.getElementById("app-menu").style.display = "block";
    document.getElementById("scoreboard").style.display = "block";
}

document.getElementById("start-game-button").addEventListener("click", function() {
    api.startGame(5, 12000);
});

function enableMenuView() {
    clearView();
    view = View.Menu;
    document.getElementById("menu-view").style.display = "block";
}

document.getElementById("leave-game-button").addEventListener("click", function() {
    score = 0;
    enableMenuView()
});

// Call the function to fetch and display a random quote and non-quotes
setInterval(updateRemainingTime, 10);
setInterval(updateScoreboard, 100);
setInterval(mainLoop, 1000);
