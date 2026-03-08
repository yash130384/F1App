# F1 2025 UDP Telemetry Router

This is a Node.js console application that captures raw F1 25 UDP packets, aggregates them, and batches them efficiently to your web application, or records them locally for playback.

## Setup
1. Open a terminal in this directory (`F1App/telemetry-router/`).
2. Run `npm install`.

## Starting the Router
```bash
npm start
```

You will be asked interactively to configure:
1. **League ID/Name**: e.g., `TestLeague`.
2. **Mode**:
   - `Live Routing`: Listens on UDP port 20888 and forwards data live to the web API.
   - `Local Recording`: Listens on the UDP port but saves data locally into a JSON file for later inside `logs/`.
   - `Playback`: Reads a previously recorded JSON file from `logs/` and sends it to the web API as it was originally recorded.
3. **Target URL**: The API Route for your F1App frontend (default: `https://f1-app-lknx.vercel.app/api/telemetry`).
4. **Port**: The UDP port to listen on (default: `20888`).
5. **Interval**: How often to dispatch the aggregated data to the web server in milliseconds (default: `1000`).

## F1 25 Game Setup
To stream data to this app, configure your F1 25 game:
1. Go to **Settings > Telemetry Settings**.
2. **UDP Telemetry**: On
3. **UDP IP Address**: `127.0.0.1` (if playing on the same PC) or the local IP of your PC running the app.
4. **UDP Port**: 20888 (oder was auch immer du konfiguriert hast).
5. **UDP Send Rate**: 20Hz, 30Hz, or 60Hz.
6. **UDP Format**: 2025.
