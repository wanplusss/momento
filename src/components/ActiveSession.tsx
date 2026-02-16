import React, { useState, useEffect } from 'react';
import type { Goal, Session, Hit } from '../types';
import { completeSession } from '../utils/actions';
import { determineTier, getWMAFromValues } from '../utils/calculations';
import { genId } from '../utils/id';
import { ChevronLeft, Zap, Info, X } from 'lucide-react';

interface ActiveSessionProps {
    goals: Goal[];
    sessions: Session[];
    goalId: string;
    prediction: number;
    onEndSession: (sessionId: string) => void;
    onBack: () => void;
}

const ActiveSession: React.FC<ActiveSessionProps> = ({ goals, sessions, goalId, prediction, onEndSession, onBack }) => {
    const [count, setCount] = useState(0);
    const [hits, setHits] = useState<Hit[]>([]);
    const [startTime] = useState(new Date().toISOString());
    const [toast, setToast] = useState<string | null>(null);

    const [dynamicStretch, setDynamicStretch] = useState(0);
    const [breakthroughCount, setBreakthroughCount] = useState(0);
    const [isRunning, setIsRunning] = useState(true);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [showTierInfo, setShowTierInfo] = useState(false);

    const goal = goals.find(g => g.id === goalId);

    // Timer for elapsed time display + Logic
    useEffect(() => {
        if (!isRunning) return;
        const timer = setInterval(() => {
            setElapsedSeconds(prev => {
                const newSecs = prev + 1;

                // If Timer Mode, update Count and Check Breakthroughs
                if (goal?.goalMode === 'timer') {
                    const minutes = Math.floor(newSecs / 60);
                    setCount(currentCount => {
                        if (minutes > currentCount) {
                            // Minute passed
                            if (minutes > dynamicStretch) {
                                // Breakthrough
                                setBreakthroughCount(bc => bc + 1);
                                setDynamicStretch(ds => ds + (goal?.increment ?? 1));
                                setToast(`BREAKTHROUGH +${goal?.increment ?? 1}m`);
                                setTimeout(() => setToast(null), 1500);
                            }
                            return minutes;
                        }
                        return currentCount;
                    });
                }
                return newSecs;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isRunning, goal, dynamicStretch]); // Added dependencies

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Derived session values
    const [pivot, setPivot] = useState(0);
    const [baseline, setBaseline] = useState(0);

    useEffect(() => {
        if (goal) {
            setDynamicStretch(prediction || goal.stretch);

            const goalSessions = sessions.filter(s => s.goalId === goal.id);
            const historyValues = [...goalSessions]
                .sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime())
                .map(s => s.finalCount);
            const wma = getWMAFromValues(historyValues, goal.movingAverageWindow);
            setPivot(wma);
            setBaseline(Math.round(wma * 0.7));
        }
    }, [goal, sessions, prediction]);

    const handleHit = () => {
        if (!goal) return;
        const step = goal.stepSize ?? 1;
        const newCount = Math.round((count + step) * 100) / 100;
        setCount(newCount);

        const hit: Hit = {
            value: step,
            timestamp: new Date().toISOString(),
            tier: determineTier(newCount, goal)
        };
        setHits(prev => [...prev, hit]);

        if (newCount > dynamicStretch) {
            setBreakthroughCount(prev => prev + 1);
            setDynamicStretch(prev => prev + (goal.increment ?? 1));
            setToast(`TARGET RAISED +${goal.increment ?? 1}`);
            setTimeout(() => setToast(null), 1000);
        }
    };

    const handleEndSession = () => {
        if (!goal) return;

        // Guard: 0 count
        if (count === 0) {
            if (confirm('Session has no progress. Discard it?')) {
                onBack();
                return;
            }
        }

        const endTime = new Date().toISOString();
        const finalTier = determineTier(count, goal);

        const session: Session = {
            id: genId(),
            goalId: goal.id,
            originalGoal: {
                baseline: goal.adaptiveBaseline || goal.baseline,
                momentum: goal.adaptiveMomentum || goal.momentum,
                stretch: goal.stretch
            },
            prediction: prediction || undefined,
            finalCount: count,
            breakthroughs: breakthroughCount,
            tier: finalTier,
            startTime,
            endTime,
            hitHistory: hits
        };

        completeSession(session);
        onEndSession(session.id);
    };

    if (!goal) return <div style={{ padding: '2rem' }}>Initializing...</div>;

    const maxBar = goal.stretch * 1.2;
    let currentZone = 'Baseline';
    let zoneColor = 'var(--color-teal)';
    if (count >= pivot) { currentZone = 'Momentum'; zoneColor = 'var(--color-brand-500)'; }
    if (count >= goal.stretch) { currentZone = 'TARGET'; zoneColor = 'var(--color-purple)'; }
    if (count > goal.stretch) { currentZone = 'BEYOND'; zoneColor = 'var(--color-warning)'; }

    return (
        <div className="fullscreen" style={{ alignItems: 'center', justifyContent: 'space-between', padding: '2rem', transition: 'background 0.3s' }}>
            {/* Header */}
            <div className="fullscreen-header" style={{ width: '100%', padding: 0 }}>
                <button onClick={onBack}><ChevronLeft size={24} /></button>
                <span className="label" style={{ letterSpacing: '0.1em', marginBottom: 0 }}>{goal.name}</span>
                <button onClick={() => setShowTierInfo(true)} style={{ opacity: 1, color: 'var(--color-brand-400)' }}><Info size={18} /></button>
            </div>

            {/* Zone + Count */}
            <div style={{ textAlign: 'center' }}>
                <div className="zone-pulse" style={{ color: zoneColor, marginBottom: '0.5rem' }}>
                    {currentZone} Zone
                </div>
                <div style={{ position: 'relative' }}>
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'var(--color-brand-500)',
                        filter: 'blur(120px)',
                        opacity: toast ? 0.3 : 0.1,
                        transition: 'opacity 0.3s'
                    }} />
                    <div className="count-display" onClick={() => { setEditValue(count.toString()); setIsEditing(true); }}>
                        {isEditing ? (
                            <input
                                type="number"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={() => { setCount(parseInt(editValue) || count); setIsEditing(false); }}
                                onKeyDown={e => { if (e.key === 'Enter') { setCount(parseInt(editValue) || count); setIsEditing(false); } }}
                                autoFocus
                                style={{ background: 'transparent', border: 'none', color: 'inherit', font: 'inherit', width: '100%', textAlign: 'center', outline: 'none' }}
                            />
                        ) : (
                            <>
                                {count}
                                {goal.goalMode === 'timer' && <span style={{ fontSize: '1.125rem', verticalAlign: 'top', marginLeft: '0.5rem', opacity: 0.5 }}>m</span>}
                            </>
                        )}
                    </div>
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
                <div className="label" style={{ letterSpacing: '0.1em', marginBottom: 0 }}>{goal.unit}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatTime(elapsedSeconds)}
                </div>
            </div>


            {/* Controls */}
            <div style={{ width: '100%', maxWidth: '20rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Progress Bar */}
                <div>
                    <div className="progress-bar progress-bar-thin" style={{ position: 'relative' }}>
                        {/* Cursor */}
                        <div style={{
                            position: 'absolute', top: 0, bottom: 0, width: 3,
                            background: 'white', zIndex: 10,
                            boxShadow: '0 0 10px white',
                            left: `${Math.min(100, (count / maxBar) * 100)}%`,
                            transition: 'left 0.3s'
                        }} />
                        <div style={{ height: '100%', background: 'rgba(20, 184, 166, 0.3)', width: `${(baseline / maxBar) * 100}%` }} />
                        <div style={{ height: '100%', background: 'rgba(99, 102, 241, 0.3)', width: `${((pivot - baseline) / maxBar) * 100}%` }} />
                        <div style={{ height: '100%', background: 'rgba(168, 85, 247, 0.3)', width: `${((goal.stretch - pivot) / maxBar) * 100}%` }} />
                        <div style={{ height: '100%', background: 'rgba(245, 158, 11, 0.2)', flex: 1 }} />
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ textAlign: 'center', borderRight: '1px solid var(--color-border)' }}>
                        <div className="label" style={{ marginBottom: '0.25rem' }}>Next Target</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{dynamicStretch}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div className="label" style={{ marginBottom: '0.25rem' }}>Wins</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-purple)', fontVariantNumeric: 'tabular-nums' }}>{breakthroughCount}</div>
                    </div>
                </div>

                {/* Hit Button or Timer Label */}
                {goal.goalMode === 'counter' ? (
                    <button
                        onClick={handleHit}
                        style={{
                            width: '100%', height: '5rem',
                            background: 'white', color: 'var(--color-bg)',
                            fontWeight: 700,
                            borderRadius: 'var(--radius-xl)',
                            border: 'none', cursor: 'pointer',
                            boxShadow: '0 0 30px rgba(255,255,255,0.1)',
                            transition: 'transform 0.1s',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.1rem'
                        }}
                        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
                        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        <span style={{ fontSize: '1.5rem', letterSpacing: '0.05em' }}>TAP +{goal.stepSize ?? 1}</span>
                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5 }}>{goal.unit}</span>
                    </button>
                ) : (
                    <div style={{
                        textAlign: 'center', fontSize: '0.75rem', fontWeight: 700,
                        color: 'var(--color-text-tertiary)', textTransform: 'uppercase',
                        letterSpacing: '0.1em'
                    }}
                        className="zone-pulse"
                    >
                        Timer Running...
                    </div>
                )}

                {/* Action Controls */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <button
                        onClick={() => setIsRunning(!isRunning)}
                        className="btn"
                        style={{
                            background: isRunning ? 'var(--color-surface)' : 'var(--color-warning)',
                            color: isRunning ? 'var(--color-text-secondary)' : 'var(--color-bg)',
                            border: isRunning ? '1px solid var(--color-border)' : 'none'
                        }}
                    >
                        {isRunning ? 'Pause' : 'Resume'}
                    </button>

                    <button
                        onClick={handleEndSession}
                        className="btn"
                        style={{
                            background: 'var(--color-surface)',
                            color: 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border)'
                        }}
                    >
                        Finish
                    </button>
                </div>
            </div>

            {/* Session Toast */}
            {
                toast && (
                    <div className="toast-session">
                        <Zap size={16} fill="white" /> {toast}
                    </div>
                )
            }

            {/* Tier Info Modal */}
            {showTierInfo && (
                <div className="overlay" onClick={() => setShowTierInfo(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '22rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Effort Tiers</h3>
                            <button onClick={() => setShowTierInfo(false)} style={{ color: 'var(--color-text-tertiary)' }}><X size={18} /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-teal)', marginTop: 6, flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-teal)' }}>Baseline</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>Your minimum "showing up" effort. Hit this every day to maintain your streak.</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-brand-500)', marginTop: 6, flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-brand-500)' }}>Momentum</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>Your working target. Consistent effort here builds long-term improvement.</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-purple)', marginTop: 6, flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-purple)' }}>Target</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>Your Daily Target (formerly "Stretch"). Reaching here means you've hit your goal.</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-warning)', marginTop: 6, flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-warning)' }}>Beyond</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>You exceeded your daily target — Level Up! Your target just increased.</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-md)', fontSize: '0.65rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                            <strong>How it works:</strong> Tiers auto-adapt over time using a Weighted Moving Average of your recent sessions. As you improve, your baseline and momentum shift upward automatically.
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default ActiveSession;
