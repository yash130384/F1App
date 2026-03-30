"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../src/lib/db");
async function check() {
    console.log('Checking telemetry sessions...');
    const sessions = await (0, db_1.query)('SELECT id, race_id, league_id FROM telemetry_sessions ORDER BY created_at DESC LIMIT 5');
    console.log('Sessions:', sessions);
    if (sessions.length > 0 && sessions[0].race_id) {
        const parts = await (0, db_1.query)('SELECT id, driver_id, game_name FROM telemetry_participants WHERE session_id = ?', [sessions[0].id]);
        console.log('Participants for latest session:', parts);
        const raceId = sessions[0].race_id;
        console.log('Testing getDriverRaceTelemetry query...');
        const sessionCheck = await (0, db_1.query)('SELECT id FROM telemetry_sessions WHERE race_id = ? LIMIT 1', [raceId]);
        console.log('sessionCheck:', sessionCheck);
    }
}
check().catch(console.error);
