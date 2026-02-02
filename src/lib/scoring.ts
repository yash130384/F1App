export interface RaceResult {
    position: number;
    fastestLap: boolean;
    cleanDriver: boolean;
}

export interface PointsConfig {
    points: Record<number, number>;
    fastestLapBonus: number;
    cleanDriverBonus: number;
}

export const DEFAULT_POINTS: Record<number, number> = {
    1: 20, 2: 19, 3: 18, 4: 17, 5: 16,
    6: 15, 7: 14, 8: 13, 9: 12, 10: 11,
    11: 10, 12: 9, 13: 8, 14: 7, 15: 6,
    16: 5, 17: 4, 18: 3, 19: 2, 20: 1
};

export const DEFAULT_CONFIG: PointsConfig = {
    points: DEFAULT_POINTS,
    fastestLapBonus: 2,
    cleanDriverBonus: 3
};

/**
 * Calculates total points for a driver in a single race using a specific config.
 */
export function calculatePoints(result: RaceResult, config: PointsConfig = DEFAULT_CONFIG): number {
    const positionPoints = config.points[result.position] || 0;
    const fastestLapBonus = result.fastestLap ? config.fastestLapBonus : 0;
    const cleanDriverBonus = result.cleanDriver ? config.cleanDriverBonus : 0;

    return positionPoints + fastestLapBonus + cleanDriverBonus;
}

/**
 * Formats points for display (e.g. "+ 23")
 */
export function formatPoints(points: number): string {
    return points > 0 ? `+${points}` : `${points}`;
}
