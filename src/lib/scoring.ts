export interface RaceResult {
    position: number;
    qualiPosition?: number;
    fastestLap: boolean;
    cleanDriver: boolean;
    isDnf?: boolean;
}

export interface PointsConfig {
    points: Record<number, number>;
    qualiPoints: Record<number, number>;
    fastestLapBonus: number;
    cleanDriverBonus: number;
    totalRaces: number;
    trackPool: string[];
    dropResultsCount: number;
    teamCompetition: boolean;
}

export const DEFAULT_POINTS: Record<number, number> = {
    1: 25, 2: 18, 3: 15, 4: 12, 5: 10,
    6: 8, 7: 6, 8: 4, 9: 2, 10: 1
};

export const DEFAULT_QUALI_POINTS: Record<number, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
    6: 0, 7: 0, 8: 0, 9: 0, 10: 0,
    11: 0, 12: 0, 13: 0, 14: 0, 15: 0,
    16: 0, 17: 0, 18: 0, 19: 0, 20: 0
};

export const DEFAULT_CONFIG: PointsConfig = {
    points: DEFAULT_POINTS,
    qualiPoints: DEFAULT_QUALI_POINTS,
    fastestLapBonus: 1,
    cleanDriverBonus: 0,
    totalRaces: 0,
    trackPool: [],
    dropResultsCount: 0,
    teamCompetition: false
};

export const SEASON_3_POINTS: Record<number, number> = {
    1: 36, 2: 31, 3: 27, 4: 24, 5: 22,
    6: 20, 7: 18, 8: 16, 9: 14, 10: 12,
    11: 10, 12: 9, 13: 8, 14: 7, 15: 6,
    16: 5, 17: 4, 18: 3, 19: 2, 20: 1
};

export const SEASON_3_CONFIG: PointsConfig = {
    points: SEASON_3_POINTS,
    qualiPoints: DEFAULT_QUALI_POINTS,
    fastestLapBonus: 0,
    cleanDriverBonus: 0,
    totalRaces: 4,
    trackPool: ['Spa', 'Silverstone', 'Austria', 'Brazil'],
    dropResultsCount: 0,
    teamCompetition: false
};

/**
 * Calculates total points for a driver in a single race using a specific config.
 */
export function calculatePoints(result: RaceResult | undefined, config: PointsConfig = DEFAULT_CONFIG): number {
    if (!result) return 0;
    if (result.isDnf) return 0;

    const positionPoints = config.points[result.position] || 0;
    const qualiPoints = (result.qualiPosition && config.qualiPoints) ? (config.qualiPoints[result.qualiPosition] || 0) : 0;
    const fastestLapBonus = result.fastestLap ? config.fastestLapBonus : 0;
    const cleanDriverBonus = result.cleanDriver ? config.cleanDriverBonus : 0;

    return positionPoints + qualiPoints + fastestLapBonus + cleanDriverBonus;
}

/**
 * Formats points for display (e.g. "+ 23")
 */
export function formatPoints(points: number): string {
    return points > 0 ? `+${points}` : `${points}`;
}
