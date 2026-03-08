const fetch = require('node-fetch');

// The League ID we want to test with. Note: In reality, you'd pull this from the DB or .env
// We'll require it as an argument
const leagueId = process.argv[2];

if (!leagueId) {
    console.error('Usage: node simulate_telemetry.js <league_id>');
    process.exit(1);
}

const url = 'http://localhost:3000/api/telemetry';

let lapTime = 95400; // start at 1:35.400

const sendBatch = async (isEnd = false) => {
    const packet = {
        sessionType: "Race",
        trackId: 3, // e.g. Silverstone
        isSessionEnded: isEnd,
        participants: [
            {
                gameName: "Xx_Sniper_xX",
                isHuman: true,
                teamId: 2,
                position: 1,
                startPosition: 4,
                topSpeedKmh: 331.4 + (Math.random() * 5),
                laps: [
                    { lapNumber: 1, lapTimeMs: lapTime, isValid: true }
                ]
            },
            {
                gameName: "Lewis_Fanboy99",
                isHuman: true,
                teamId: 1,
                position: 2,
                startPosition: 2,
                topSpeedKmh: 328.1 + (Math.random() * 5),
                laps: [
                    { lapNumber: 1, lapTimeMs: lapTime + 1200, isValid: true }
                ]
            }
        ]
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leagueId, packet })
        });
        const data = await res.json();
        console.log(`Sent batch. Ended: ${isEnd} | Response:`, data);
    } catch (err) {
        console.error('Failed to send batch:', err);
    }

    lapTime -= 100; // get slightly faster
};

console.log(`Starting Telemetry Simulation for League: ${leagueId}...`);

let count = 0;
const interval = setInterval(() => {
    count++;
    if (count >= 10) { // simulate 10 seconds of race
        clearInterval(interval);
        console.log('Ending session...');
        sendBatch(true);
    } else {
        sendBatch(false);
    }
}, 1000);
