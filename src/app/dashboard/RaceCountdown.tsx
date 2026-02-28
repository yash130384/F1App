'use client';

import { useState, useEffect } from 'react';

interface RaceCountdownProps {
    race: {
        id: string;
        track: string;
        scheduled_date: string;
    } | null;
}

export default function RaceCountdown({ race }: RaceCountdownProps) {
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0
    });
    const [isStarted, setIsStarted] = useState(false);

    useEffect(() => {
        if (!race || !race.scheduled_date) return;

        const targetDate = new Date(race.scheduled_date).getTime();

        const updateCountdown = () => {
            const now = new Date().getTime();
            const difference = targetDate - now;

            if (difference <= 0) {
                setIsStarted(true);
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            } else {
                setIsStarted(false);
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((difference % (1000 * 60)) / 1000)
                });
            }
        };

        // Initial call
        updateCountdown();

        // Update every second
        const interval = setInterval(updateCountdown, 1000);

        return () => clearInterval(interval);
    }, [race]);

    if (!race) return null;

    return (
        <div className="f1-card animate-fade-in" style={{ marginBottom: '2rem', border: '1px solid var(--f1-red)', position: 'relative', overflow: 'hidden', padding: '1.5rem 2rem' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--f1-red)' }}></div>
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left" style={{ zIndex: 1 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--f1-red)', fontWeight: 900, letterSpacing: '2px', marginBottom: '0.5rem' }}>NEXT RACE</div>
                    <div className="text-f1" style={{ fontSize: '2rem', lineHeight: 1.1 }}>{race.track}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--silver)', marginTop: '0.5rem' }}>{new Date(race.scheduled_date).toLocaleString()}</div>
                </div>

                <div className="flex gap-3 md:gap-5 items-center justify-center" style={{ zIndex: 1 }}>
                    {isStarted ? (
                        <div className="text-f1 text-gradient" style={{ fontSize: '2rem', animation: 'pulse 1.5s infinite' }}>
                            RACE STARTED
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col items-center min-w-[50px]">
                                <div className="text-f1" style={{ fontSize: '2.5rem', lineHeight: 1 }}>{timeLeft.days.toString().padStart(2, '0')}</div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--silver)', fontWeight: 900, letterSpacing: '1px', marginTop: '4px' }}>DAYS</div>
                            </div>
                            <div className="text-f1" style={{ fontSize: '2.5rem', color: 'var(--f1-red)', lineHeight: 1, paddingBottom: '16px' }}>:</div>
                            <div className="flex flex-col items-center min-w-[50px]">
                                <div className="text-f1" style={{ fontSize: '2.5rem', lineHeight: 1 }}>{timeLeft.hours.toString().padStart(2, '0')}</div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--silver)', fontWeight: 900, letterSpacing: '1px', marginTop: '4px' }}>HRS</div>
                            </div>
                            <div className="text-f1" style={{ fontSize: '2.5rem', color: 'var(--f1-red)', lineHeight: 1, paddingBottom: '16px' }}>:</div>
                            <div className="flex flex-col items-center min-w-[50px]">
                                <div className="text-f1" style={{ fontSize: '2.5rem', lineHeight: 1 }}>{timeLeft.minutes.toString().padStart(2, '0')}</div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--silver)', fontWeight: 900, letterSpacing: '1px', marginTop: '4px' }}>MIN</div>
                            </div>
                            <div className="text-f1" style={{ fontSize: '2.5rem', color: 'var(--f1-red)', lineHeight: 1, paddingBottom: '16px' }}>:</div>
                            <div className="flex flex-col items-center min-w-[50px]">
                                <div className="text-f1" style={{ fontSize: '2.5rem', lineHeight: 1 }}>{timeLeft.seconds.toString().padStart(2, '0')}</div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--silver)', fontWeight: 900, letterSpacing: '1px', marginTop: '4px' }}>SEC</div>
                            </div>
                        </>
                    )}
                </div>
            </div>
            {/* Optional subtle background effect to make it pop even more */}
            <div style={{ position: 'absolute', right: '-10%', top: '-50%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(225,6,0,0.1) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }}></div>
        </div>
    );
}
