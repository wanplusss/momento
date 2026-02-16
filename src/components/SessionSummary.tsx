import React, { useEffect, useState } from 'react';
import type { Session, Goal } from '../types';
import { getWMAFromValues } from '../utils/calculations';
import { TrendingUp, ArrowUpRight, Layers } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface SessionSummaryProps {
    goals: Goal[];
    sessions: Session[];
    sessionId: string;
    prediction: number;
    onNavigate: (page: string) => void;
}

const SessionSummary: React.FC<SessionSummaryProps> = ({ goals, sessions, sessionId, prediction, onNavigate }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [goal, setGoal] = useState<Goal | null>(null);
    const [oldWMA, setOldWMA] = useState(0);
    const [newWMA, setNewWMA] = useState(0);

    useEffect(() => {
        const foundSession = sessions.find(s => s.id === sessionId);
        if (foundSession) {
            setSession(foundSession);
            const foundGoal = goals.find(g => g.id === foundSession.goalId);
            if (foundGoal) {
                setGoal(foundGoal);

                // Calculate old and new WMA
                const goalSessions = sessions.filter(s => s.goalId === foundGoal.id);
                const sorted = [...goalSessions].sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime());
                const allValues = sorted.map(s => s.finalCount);

                // New WMA includes this session
                const nwma = getWMAFromValues(allValues, foundGoal.movingAverageWindow);
                setNewWMA(nwma);

                // Old WMA excludes this session
                // Actually, relying on values might be tricky if duplicates. 
                // Better: filter by ID? Session object doesn't have ID in `allValues`.
                // Let's filter the session object before mapping.

                const previousSessions = sorted.filter(s => s.id !== sessionId);
                const prevValues = previousSessions.map(s => s.finalCount);

                const owma = getWMAFromValues(prevValues, foundGoal.movingAverageWindow);
                setOldWMA(owma);
            }
        }
    }, [sessionId, goals, sessions]);

    if (!session || !goal) return <div style={{ padding: '2rem' }}>Loading summary...</div>;

    const alphaGrowth = session.finalCount > oldWMA
        ? (((session.finalCount - oldWMA) / (oldWMA || 1)) * 100).toFixed(1)
        : '0';

    const effectivePrediction = session.prediction ?? prediction;
    const capabilityData = [
        { name: 'Your Prediction', value: effectivePrediction || session.finalCount, fill: '#334155' },
        { name: 'Actual Reality', value: session.finalCount, fill: '#6366f1' }
    ];

    const wmaDelta = newWMA - oldWMA;
    const isPositive = wmaDelta >= 0;

    return (
        <div className="container animate-fade-in" style={{ minHeight: '100vh', paddingBottom: '2rem', overflowY: 'auto' }}>
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                <span className="label" style={{ color: 'var(--color-brand-500)', letterSpacing: '0.1em', marginBottom: 0 }}>Session Summary</span>
                <span className="label" style={{ color: 'var(--color-text-tertiary)', marginBottom: 0 }}>{new Date(session.endTime).toLocaleTimeString()}</span>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Title + Growth */}
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>{goal.name}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--color-success)', fontWeight: 700 }}>
                        <TrendingUp size={16} />
                        <span>Growth: +{alphaGrowth}%</span>
                    </div>
                    <p className="label" style={{ marginTop: '0.5rem', letterSpacing: '0.1em', marginBottom: 0 }}>Vs Baseline</p>
                </div>

                {/* Mind vs Reality Chart */}
                <div className="card">
                    <h3 className="label" style={{ letterSpacing: '0.1em', marginBottom: '1.5rem' }}>Mind vs Reality</h3>
                    <div style={{ height: '12rem', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={capabilityData} layout="vertical">
                                <XAxis type="number" hide domain={[0, Math.max(prediction || session.finalCount, session.finalCount) * 1.1]} />
                                <YAxis type="category" dataKey="name" hide />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ backgroundColor: '#18181b', border: 'none', fontSize: '10px', color: '#fff', borderRadius: '8px' }}
                                />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
                                    {capabilityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.625rem', fontWeight: 700, color: 'var(--color-text-tertiary)' }}>
                            <div style={{ width: 8, height: 8, background: '#334155', borderRadius: 2 }} /> You Thought ({prediction || session.finalCount})
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.625rem', fontWeight: 700, color: 'var(--color-brand-400)' }}>
                            <div style={{ width: 8, height: 8, background: '#6366f1', borderRadius: 2 }} /> You Did ({session.finalCount})
                        </div>
                    </div>
                </div>

                {/* Baseline Shift Card */}
                <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, right: 0, padding: '1rem', opacity: 0.1 }}>
                        <Layers size={64} />
                    </div>
                    <div className="label" style={{ letterSpacing: '0.1em', marginBottom: '1rem' }}>New Baseline Set</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div className="label" style={{ color: 'var(--color-text-tertiary)' }}>Old Baseline</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>{oldWMA}</div>
                        </div>
                        <ArrowUpRight style={{ color: isPositive ? 'var(--color-success)' : 'var(--color-danger)' }} />
                        <div style={{ textAlign: 'right' }}>
                            <div className="label" style={{ color: 'var(--color-brand-500)' }}>New Baseline</div>
                            <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'white' }}>{newWMA}</div>
                        </div>
                    </div>
                </div>

                {/* Complete Button */}
                <button
                    onClick={() => onNavigate('dashboard')}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '1rem', borderRadius: 'var(--radius-xl)', fontSize: '0.75rem', letterSpacing: '0.1em' }}
                >
                    Complete Session
                </button>
            </div>
        </div>
    );
};

export default SessionSummary;
