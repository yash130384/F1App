import { describe, it, expect } from 'vitest';
import { calculatePoints, DEFAULT_CONFIG, SEASON_3_CONFIG, SEASON_3_POINTS } from './scoring';

describe('Scoring Logic', () => {
    it('should calculate points for a regular race finish', () => {
        const result = {
            position: 1,
            fastestLap: false,
            cleanDriver: false,
            isDnf: false
        };
        // 1st place is 25 points in default F1 config
        expect(calculatePoints(result, DEFAULT_CONFIG)).toBe(25);
    });

    it('should include bonuses', () => {
        const customConfig = {
            ...DEFAULT_CONFIG,
            points: { 1: 20 },
            fastestLapBonus: 2,
            cleanDriverBonus: 3
        };
        const result = {
            position: 1,
            fastestLap: true,  // +2
            cleanDriver: true, // +3
            isDnf: false
        };
        // 20 + 2 + 3 = 25
        expect(calculatePoints(result, customConfig)).toBe(25);
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

    describe('Season 3 Scoring Scheme (36-1 Schema)', () => {
        const expectedPoints: Record<number, number> = {
            1: 36, 2: 31, 3: 27, 4: 24, 5: 22,
            6: 20, 7: 18, 8: 16, 9: 14, 10: 12,
            11: 10, 12: 9, 13: 8, 14: 7, 15: 6,
            16: 5, 17: 4, 18: 3, 19: 2, 20: 1
        };

        it('should correctly award points for all 20 regular positions', () => {
            for (let pos = 1; pos <= 20; pos++) {
                const result = {
                    position: pos,
                    fastestLap: false,
                    cleanDriver: false,
                    isDnf: false
                };
                expect(calculatePoints(result, SEASON_3_CONFIG)).toBe(expectedPoints[pos]);
            }
        });

        it('should award 0 points for positions outside 1-20', () => {
            expect(calculatePoints({ position: 21, fastestLap: false, cleanDriver: false, isDnf: false }, SEASON_3_CONFIG)).toBe(0);
        });

        it('should award 0 bonus points for fastest lap and clean driver in Season 3', () => {
            const resultWithBonuses = {
                position: 1,
                fastestLap: true,
                cleanDriver: true,
                isDnf: false
            };
            expect(calculatePoints(resultWithBonuses, SEASON_3_CONFIG)).toBe(36);
        });

        it('should strictly return 0 points for DNF regardless of finishing position', () => {
            for (let pos = 1; pos <= 20; pos++) {
                const result = {
                    position: pos,
                    fastestLap: true,
                    cleanDriver: true,
                    isDnf: true
                };
                expect(calculatePoints(result, SEASON_3_CONFIG)).toBe(0);
            }
        });

        it('should reproduce exact race results and driver standings across the 4 season races', () => {
            // Race 1: Spa
            const spaLanz = calculatePoints({ position: 1, fastestLap: false, cleanDriver: false, isDnf: false }, SEASON_3_CONFIG);
            const spaKaydn = calculatePoints({ position: 2, fastestLap: false, cleanDriver: false, isDnf: false }, SEASON_3_CONFIG);
            const spaDox = calculatePoints({ position: 6, fastestLap: false, cleanDriver: false, isDnf: false }, SEASON_3_CONFIG);
            const spaPrecht = calculatePoints({ position: 18, fastestLap: false, cleanDriver: false, isDnf: true }, SEASON_3_CONFIG);

            expect(spaLanz).toBe(36);
            expect(spaKaydn).toBe(31);
            expect(spaDox).toBe(20);
            expect(spaPrecht).toBe(0);

            // Race 2: Silverstone
            const silverstoneKaydn = calculatePoints({ position: 1, fastestLap: false, cleanDriver: false, isDnf: false }, SEASON_3_CONFIG);
            const silverstoneDox = calculatePoints({ position: 3, fastestLap: false, cleanDriver: false, isDnf: false }, SEASON_3_CONFIG);
            const silverstoneLanz = calculatePoints({ position: 9, fastestLap: false, cleanDriver: false, isDnf: false }, SEASON_3_CONFIG);
            const silverstonePrecht = calculatePoints({ position: 18, fastestLap: false, cleanDriver: false, isDnf: true }, SEASON_3_CONFIG);

            expect(silverstoneKaydn).toBe(36);
            expect(silverstoneDox).toBe(27);
            expect(silverstoneLanz).toBe(14);
            expect(silverstonePrecht).toBe(0);

            // Race 3: Red Bull Ring
            const austriaKaydn = calculatePoints({ position: 1, fastestLap: false, cleanDriver: false, isDnf: false }, SEASON_3_CONFIG);
            const austriaLanz = calculatePoints({ position: 6, fastestLap: false, cleanDriver: false, isDnf: false }, SEASON_3_CONFIG);
            const austriaDox = calculatePoints({ position: 20, fastestLap: false, cleanDriver: false, isDnf: true }, SEASON_3_CONFIG);
            const austriaPrecht = calculatePoints({ position: 18, fastestLap: false, cleanDriver: false, isDnf: true }, SEASON_3_CONFIG);

            expect(austriaKaydn).toBe(36);
            expect(austriaLanz).toBe(20);
            expect(austriaDox).toBe(0);
            expect(austriaPrecht).toBe(0);

            // Race 4: Brazil
            const brazilLanz = calculatePoints({ position: 2, fastestLap: false, cleanDriver: false, isDnf: false }, SEASON_3_CONFIG);
            const brazilKaydn = calculatePoints({ position: 3, fastestLap: false, cleanDriver: false, isDnf: true }, SEASON_3_CONFIG);
            const brazilDox = calculatePoints({ position: 4, fastestLap: false, cleanDriver: false, isDnf: true }, SEASON_3_CONFIG);
            const brazilPrecht = calculatePoints({ position: 5, fastestLap: false, cleanDriver: false, isDnf: true }, SEASON_3_CONFIG);

            expect(brazilLanz).toBe(31);
            expect(brazilKaydn).toBe(0);
            expect(brazilDox).toBe(0);
            expect(brazilPrecht).toBe(0);

            // Total Standings Assertions
            const totalKaydn = spaKaydn + silverstoneKaydn + austriaKaydn + brazilKaydn;
            const totalLanz = spaLanz + silverstoneLanz + austriaLanz + brazilLanz;
            const totalDox = spaDox + silverstoneDox + austriaDox + brazilDox;
            const totalPrecht = spaPrecht + silverstonePrecht + austriaPrecht + brazilPrecht;

            expect(totalKaydn).toBe(103);
            expect(totalLanz).toBe(101);
            expect(totalDox).toBe(47);
            expect(totalPrecht).toBe(0);
        });
    });
});
