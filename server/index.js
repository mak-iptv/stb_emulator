const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Generic GET proxy: /proxy?target=<full_url>
app.get('/proxy', async (req, res) => {
  const target = req.query.target;
  if (!target) return res.status(400).send('Missing target');
  try {
    const resp = await fetch(target, { headers: { 'User-Agent': req.headers['user-agent'] || 'stb-web-emulator' } });
    const ct = resp.headers.get('content-type') || 'text/plain';
    res.set('Content-Type', ct);
    const text = await resp.text();
    res.status(resp.status).send(text);
  } catch (err) {
    console.error('Proxy GET error', err);
    res.status(500).send('Proxy failed: ' + err.message);
  }
});

// Generic POST proxy (for STB endpoints that use POST)
app.post('/proxy', async (req, res) => {
  const target = req.query.target;
  if (!target) return res.status(400).send('Missing target');
  try {
    const resp = await fetch(target, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body) });
    const ct = resp.headers.get('content-type') || 'application/json';
    res.set('Content-Type', ct);
    const text = await resp.text();
    res.status(resp.status).send(text);
  } catch (err) {
    console.error('Proxy POST error', err);
    res.status(500).send('Proxy failed: ' + err.message);
  }
});

// Serve client build
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
