export interface TrackLayout {
    name: string;
    path: string;
    viewBox: string;
}

export const TRACK_MAPS: Record<number, TrackLayout> = {
    // 7: Silverstone
    7: {
        name: "Silverstone",
        path: "M 152,112 L 175,98 L 202,94 L 228,102 L 244,122 L 250,152 L 244,180 L 224,204 L 195,214 L 164,210 L 132,194 L 105,178 L 84,182 L 64,198 L 48,224 L 40,250 L 52,282 L 84,302 L 120,308 L 164,298 L 212,282 L 264,264 L 312,250 L 350,244 L 380,254 L 400,280 L 404,312 L 392,344 L 364,368 L 324,374 L 280,364 L 232,344 L 180,314 L 132,274 L 100,234 L 84,194 L 88,154 L 108,122 Z",
        viewBox: "0 0 450 400"
    },
    // 10: Spa-Francorchamps
    10: {
        name: "Spa-Francorchamps",
        path: "M 100,100 L 150,80 L 220,100 L 280,180 L 320,250 L 300,320 L 240,360 L 160,340 L 120,280 L 80,220 L 70,160 Z",
        viewBox: "0 0 400 400"
    },
    // 11: Monza
    11: {
        name: "Monza",
        path: "M 50,100 L 350,100 L 380,130 L 350,160 L 50,160 L 20,130 Z",
        viewBox: "0 0 400 250"
    },
    // 5: Monaco
    5: {
        name: "Monaco",
        path: "M 50,150 L 100,100 L 180,120 L 220,80 L 280,100 L 300,180 L 250,250 L 180,220 L 120,280 L 60,250 Z",
        viewBox: "0 0 350 350"
    }
};

export const GENERIC_TRACK: TrackLayout = {
    name: "Circuit",
    path: "M 200,50 A 150,150 0 1,1 199.9,50 Z", // Circle
    viewBox: "0 0 400 400"
};

export function getTrackLayout(trackId: number): TrackLayout {
    return TRACK_MAPS[trackId] || GENERIC_TRACK;
}
