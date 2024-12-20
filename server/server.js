import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
dotenv.config({ path: "../.env" });
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from "url";
import cors from "cors";

const app = express();
const port = 3001;

// Allow express to parse JSON bodies
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173'
}));

// LOAD ALL QUOTES FROM FILES ==============================================//
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const [outputData, nonQuotedData] = await Promise.all([
    fs.readFile(path.join(__dirname, 'parsed-quotes.ini'), 'utf-8'),    // Path to output.ini
    fs.readFile(path.join(__dirname, 'nonquoted.txt'), 'utf-8')  // Path to nonquoted.txt
]);
const outputLines = outputData.split('\n').filter(line => line.trim() !== '');
const authors = nonQuotedData.split('\n').filter(line => line.trim() !== '');
const quotes = outputLines.map(line => {
    const nonQuoteMatch = line.match(/\[(.*?)\]/); // Match text inside square brackets
    const quoteMatch = line.match(/"(.*?)"/); // Match text inside quotes

    if (nonQuoteMatch && quoteMatch) {
        return {
            nonQuote: nonQuoteMatch[1],
            quote: quoteMatch[1]
        };
    }
    return null;
}).filter(item => item !== null);

let randomQuote = null;
let allOptions = null;
let startTime = Date.now();
let gameStarted = false;
let round = 0;
let maxRound = 0;
let intervalId = null;
let scoreboard = new Map();

function pickNewRandomQuote() {
    console.log(`Picking new set of quotes for round ${round}/${maxRound}`);
    if (!gameStarted) {
        return;
    }
    round += 1;
    if (round > maxRound) {
        clearInterval(intervalId);
        gameStarted = false;
        round = 0;
        maxRound = 0;
    }
  // Pick a random quote and non-quote combination from output.ini
  const randomQuoteIndex = Math.floor(Math.random() * quotes.length);
  randomQuote = quotes[randomQuoteIndex];

  // Pick 3 random incorrect non-quotes from nonquoted.txt
  const incorrectNonQuotes = [];
  while (incorrectNonQuotes.length < 5) {
      const randomIndex = Math.floor(Math.random() * authors.length);
      const nonQuote = authors[randomIndex];

      // Ensure the incorrect non-quote isn't the correct one and isn't already selected
      if (nonQuote !== randomQuote.nonQuote && !incorrectNonQuotes.includes(nonQuote)) {
          incorrectNonQuotes.push(nonQuote);
      }
  }

  // Combine the correct non-quote with the incorrect ones
  allOptions = [...incorrectNonQuotes];

  // Insert the correct answer at a random position
  const randomPosition = Math.floor(Math.random() * (incorrectNonQuotes.length + 1));
  allOptions.splice(randomPosition, 0, randomQuote.nonQuote);
  startTime = Date.now();
}

// GET REQUESTS ==============================================//
// app.get("/all_quotes", async (req, res) => {
//   res.json([quotes, authors]);
// });

app.get("/random_quotes", async (req, res) => {
    console.log(`Returning  ${[randomQuote, allOptions]}`);
  res.json([randomQuote, allOptions]);
});

app.get("/start_time", async (req, res) => {
    console.log(`Returning  ${startTime}`);
  res.json(startTime);
});

app.get("/scoreboard", async (req, res) => {
    console.log(`Returning  ${scoreboard}`);
  res.json(scoreboard);
});

app.get("/game_status", async (req, res) => {
    console.log(`Returning  ${gameStarted}`);
  res.json(gameStarted);
});

app.post("/start", async (req, res) => {
    const { amountOfRounds, roundLength } = req.body;
    if (amountOfRounds === undefined || roundLength === undefined) {
        return res.status(400).json({ error: "Please provide both amountOfRounds and roundLength." });
    }
    gameStarted = true;
    maxRound = amountOfRounds;
    pickNewRandomQuote();
    intervalId = setInterval(pickNewRandomQuote, roundLength);
    console.log(`Game started with ${maxRound} rounds and ${roundLength} milliseconds!`)
    res.json(gameStarted);
});

app.post("/update_score", async (req, res) => {
  const { name, score } = req.body;
  if (!name || score === undefined) {
    return res.status(400).json({ error: "Please provide both name and score." });
  }
  //scoreboard.
  scoreboard.set(name, score);
  const sortedScoreboard = [...scoreboard.entries()]
    .sort((a, b) => b[1] - a[1]);
  console.log(`Updated scoreboard with user ${name} and score ${score} to return ${sortedScoreboard}`);
  res.json(sortedScoreboard);
});

// POST REQUESTS ==============================================//
app.post("/api/token", async (req, res) => {

  // Exchange the code for an access_token
  const response = await fetch(`https://discord.com/api/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.VITE_DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code: req.body.code,
    }),
  });

  // Retrieve the access_token from the response
  const { access_token } = await response.json();

  // Return the access_token to our client as { access_token: "..."}
  res.send({access_token});
});

// HEY, LISTEN! ==============================================//
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
