const express = require('express');
const axios = require('axios');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Session setup
app.use(session({
  secret: 'your-secret',
  resave: false,
  saveUninitialized: true,
}));

// Discord OAuth2 credentials
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/callback';

// Routes
app.get('/login', (req, res) => {
  const scope = 'identify guilds';
  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}`;
  res.redirect(discordAuthUrl);
});

app.get('/callback', async (req, res) => {
  const code = req.query.code;

  if (!code) return res.send('No code provided');

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const accessToken = tokenResponse.data.access_token;

    // Fetch user guilds
    const guildsResponse = await axios.get('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    req.session.guilds = guildsResponse.data;
    res.redirect('/panel');
  } catch (err) {
    console.error(err);
    res.send('Error while authenticating');
  }
});

app.get('/panel', (req, res) => {
  const guilds = req.session.guilds;

  if (!guilds) return res.redirect('/login');

  let guildListHTML = '<h1>Select a Guild</h1>';
  guildListHTML += '<ul>';
  guilds.forEach(guild => {
    guildListHTML += `<li>${guild.name}</li>`;
  });
  guildListHTML += '</ul>';
  res.send(guildListHTML);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
