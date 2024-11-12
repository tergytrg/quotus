export default class Api {
    constructor(serverUrl = "http://localhost:3001") {
        this.SERVER_URL = serverUrl;
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

    async resetScore() {
        try {
            const response = await fetch(`${this.SERVER_URL}/reset_score`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error resetting scoreboard: ', error);
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
