"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionState = void 0;
class SessionState {
    sessionType = 'Unknown';
    trackId = -1;
    isActive = false;
    // Map car index (0-21) to PlayerState
    players = new Map();
    getPlayer(carIdx) {
        if (!this.players.has(carIdx)) {
            this.players.set(carIdx, {
                gameName: `Unknown_${carIdx}`,
                position: 0,
                fastestLapMs: null,
                topSpeedKmh: 0,
                isHuman: false,
                startPosition: 0,
                teamId: 0,
                laps: [],
                currentLapNum: 0
            });
        }
        return this.players.get(carIdx);
    }
    updateParticipant(carIdx, data) {
        const p = this.getPlayer(carIdx);
        // Only accept non-empty names
        if (data.name && data.name.trim().length > 0) {
            p.gameName = data.name;
        }
        p.isHuman = data.isHuman;
        p.teamId = data.teamId;
    }
    updateLapData(carIdx, data) {
        const p = this.getPlayer(carIdx);
        p.position = data.carPosition;
        if (p.startPosition === 0 && data.gridPosition > 0) {
            p.startPosition = data.gridPosition;
        }
        // Check if lap finished
        if (data.currentLapNum > p.currentLapNum && p.currentLapNum > 0) {
            if (data.lastLapTimeInMS > 0) {
                p.laps.push({
                    lapNumber: p.currentLapNum,
                    lapTimeMs: data.lastLapTimeInMS,
                    isValid: !data.currentLapInvalid
                });
                if (!data.currentLapInvalid && (p.fastestLapMs === null || data.lastLapTimeInMS < p.fastestLapMs)) {
                    p.fastestLapMs = data.lastLapTimeInMS;
                }
            }
        }
        p.currentLapNum = data.currentLapNum;
    }
    updateTelemetry(carIdx, data) {
        const p = this.getPlayer(carIdx);
        if (data.speedKmh > p.topSpeedKmh) {
            p.topSpeedKmh = data.speedKmh;
        }
    }
    // Prepare payload and clear laps so we don't send duplicates
    buildPayloadAndClear() {
        const participantsList = Array.from(this.players.entries())
            .filter(([_, p]) => p.gameName && !p.gameName.startsWith('Unknown_'))
            .map(([_, p]) => {
            const lapsToSend = [...p.laps];
            p.laps = []; // Clear them after extracting
            return {
                gameName: p.gameName,
                position: p.position,
                fastestLapMs: p.fastestLapMs,
                topSpeedKmh: p.topSpeedKmh,
                isHuman: p.isHuman,
                startPosition: p.startPosition,
                teamId: p.teamId,
                laps: lapsToSend
            };
        });
        return {
            sessionType: this.sessionType,
            trackId: this.trackId,
            isActive: this.isActive,
            participants: participantsList
        };
    }
}
exports.SessionState = SessionState;
