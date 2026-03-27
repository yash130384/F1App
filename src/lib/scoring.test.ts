import { describe, it, expect } from 'vitest';
import { calculatePoints, DEFAULT_CONFIG } from './scoring';

describe('Scoring Logic', () => {
    it('should calculate points for a regular race finish', () => {
        const result = {
            position: 1,
            fastestLap: false,
            cleanDriver: false,
            isDnf: false
        };
        // 1st place is 20 points in default config
        expect(calculatePoints(result, DEFAULT_CONFIG)).toBe(20);
    });

    it('should include bonuses', () => {
        const result = {
            position: 1,
            fastestLap: true,  // +2
            cleanDriver: true, // +3
            isDnf: false
        };
        // 20 + 2 + 3 = 25
        expect(calculatePoints(result, DEFAULT_CONFIG)).toBe(25);
    });

    it('should return 0 for DNF', () => {
        const result = {
            position: 1,
            fastestLap: true,
            cleanDriver: true,
            isDnf: true
        };
        expect(calculatePoints(result, DEFAULT_CONFIG)).toBe(0);
    });

    it('should handle custom points config', () => {
        const customConfig = {
            ...DEFAULT_CONFIG,
            points: { 1: 50, 2: 40 },
            fastestLapBonus: 5
        };
        const result = {
            position: 2,
            fastestLap: true,
            cleanDriver: false,
            isDnf: false
        };
        // 40 + 5 = 45
        expect(calculatePoints(result, customConfig)).toBe(45);
    });
});
