# STB Web Emulator (Full) - Client + Proxy Server

This project contains:
- `client/` - Vite + React frontend (STB emulator UI)
- `server/` - Express proxy server that forwards requests to MAG/XUI portals and serves the built client

## Local dev
- Install: `npm ci`
- Run dev (requires concurrently and nodemon): `npm run dev`

## Build & run
- Build client and start server:
  ```bash
  npm ci
  npm run build
  npm start
  ```

## Deploy on Render (Web Service)
- Build Command: `npm install --include=dev && npm run build`
- Start Command: `npm start`
- Make sure environment `PORT` is provided by Render (Render sets it automatically).

## Usage
- Use the Portal form to enter either an XUI/Xtream `player_api.php` URL (e.g. https://panel.example.com) with username/password, or a MAG/Stalker portal base URL together with MAC address as the username.
- The server exposes `/proxy?target=<url>` to forward requests when portal CORS blocks direct browser access.
