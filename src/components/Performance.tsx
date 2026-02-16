import React, { useMemo } from 'react';
import type { Goal, Session } from '../types';
import { getWMAFromValues, getRSI, getGrade, generateHeatmapData } from '../utils/calculations';
import { Calendar, Activity, AlertCircle } from 'lucide-react';
import {
    BarChart, Bar, Tooltip, ResponsiveContainer,
    AreaChart, Area, XAxis, YAxis
} from 'recharts';

interface PerformanceProps {
    goals: Goal[];
    allSessions: Session[];
}

const Performance: React.FC<PerformanceProps> = ({ goals, allSessions }) => {
    const heatmapData = useMemo(() => generateHeatmapData(allSessions), [allSessions]);

    // Calculate scores
    let totalScore = 0;
    let count = 0;
    let totalRealized = 0;
    let totalPotential = 0;

    const activeGoals = goals.filter(g => g.status === 'active');

    activeGoals.forEach(goal => {
        const goalSessions = allSessions.filter(s => s.goalId === goal.id);
        const historyValues = [...goalSessions]
            .sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime())
            .map(s => s.finalCount);

        const potential = goalSessions.length * goal.stretch;
        const realized = historyValues.reduce((a, b) => a + b, 0);
        const efficiency = potential > 0 ? Math.min(100, (realized / potential) * 100) : 0;

        const rsi = getRSI(historyValues);
        const streakBonus = Math.min(20, goal.currentStreak * 2);
        const score = (efficiency * 0.5) + (rsi * 0.3) + (streakBonus * 0.2);

        totalRealized += realized;
        totalPotential += potential;
        totalScore += score;
        count++;
    });

    const avgScore = count > 0 ? Math.round(totalScore / count) : 0;
    const grade = getGrade(avgScore);
    const gap = totalPotential - totalRealized;

    // Effort Composition Data
    const compositionData: { index: number; baseline: number; push: number }[] = [];
    for (let i = 0; i < 10; i++) {
        let dailyBaseline = 0;
        let dailyPush = 0;

        activeGoals.forEach(goal => {
            const goalSessions = allSessions
                .filter(s => s.goalId === goal.id)
                .sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime());

            const histIdx = goalSessions.length - 10 + i;
            if (histIdx < 0 || histIdx >= goalSessions.length) return;

            const val = goalSessions[histIdx].finalCount;
            const priorValues = goalSessions.slice(0, histIdx).map(s => s.finalCount);
            const wma = priorValues.length ? getWMAFromValues(priorValues, goal.movingAverageWindow) : val;

            if (val > wma) {
                dailyBaseline += wma;
                dailyPush += (val - wma);
            } else {
                dailyBaseline += val;
            }
        });

        compositionData.push({ index: i, baseline: dailyBaseline, push: dailyPush });
    }

    const gapData = [
        { name: 'Start', potential: 0, actual: 0 },
        { name: 'Now', potential: totalPotential, actual: totalRealized }
    ];

    return (
        <div className="container animate-fade-in" style={{ minHeight: '100vh', paddingBottom: '6rem' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>Reflection</h2>
                <div className="label" style={{ letterSpacing: '0.1em' }}>Progress Review</div>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Discipline Score */}
                <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div className="label" style={{ letterSpacing: '0.1em' }}>Discipline Score</div>
                        <div style={{ fontSize: '2.25rem', fontWeight: 700, color: 'white', fontVariantNumeric: 'tabular-nums' }}>
                            {avgScore}<span style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>/100</span>
                        </div>
                    </div>
                    <div style={{
                        width: '4rem', height: '4rem',
                        borderRadius: 'var(--radius-xl)',
                        background: 'var(--color-brand-500)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.875rem', fontWeight: 700, color: 'white',
                        boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        {grade}
                    </div>
                </div>

                {/* Consistency Rhythm (Heatmap) */}
                <div className="card">
                    <div className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                        <Calendar size={12} /> Consistency Rhythm
                    </div>
                    <div className="heatmap-grid">
                        {heatmapData.map((d, i) => (
                            <div
                                key={i}
                                className={`heatmap-cell heatmap-${d.intensity >= 4 ? 4 : d.intensity}`}
                                title={d.date.toDateString()}
                            />
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.5rem', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>16 Weeks Ago</span>
                        <span style={{ fontSize: '0.5rem', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Today</span>
                    </div>
                </div>

                {/* Effort Composition */}
                <div className="card">
                    <div className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                        <Activity size={12} /> Effort Composition (Last 10)
                    </div>
                    <div style={{ height: '8rem', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={compositionData}>
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ backgroundColor: '#18181b', border: 'none', fontSize: '10px', color: '#fff', borderRadius: '8px' }}
                                />
                                <Bar dataKey="baseline" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="push" stackId="a" fill="#10b981" radius={[2, 2, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.5rem', fontWeight: 700, color: 'var(--color-brand-400)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            <div style={{ width: 8, height: 8, background: 'var(--color-brand-500)', borderRadius: '50%' }} /> Maintenance
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.5rem', fontWeight: 700, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            <div style={{ width: 8, height: 8, background: 'var(--color-success)', borderRadius: '50%' }} /> Growth
                        </div>
                    </div>
                </div>

                {/* Unrealized Potential */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '0.1em', marginBottom: 0 }}>
                            <AlertCircle size={12} style={{ color: 'var(--color-danger)' }} /> Unrealized Potential
                        </div>
                        <span className="label" style={{ color: 'var(--color-danger)', letterSpacing: '0.1em', marginBottom: 0 }}>-{gap} Units</span>
                    </div>

                    <div style={{ height: '12rem', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={gapData}>
                                <defs>
                                    <linearGradient id="potentialGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#334155" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#334155" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" hide />
                                <YAxis hide />
                                <Tooltip contentStyle={{ background: '#18181b', border: 'none', fontSize: '10px', color: '#fff', borderRadius: '8px' }} />
                                <Area type="monotone" dataKey="potential" stroke="#475569" strokeDasharray="4 4" fill="url(#potentialGrad)" />
                                <Area type="monotone" dataKey="actual" stroke="#6366f1" fill="url(#actualGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <p style={{ marginTop: '1rem', fontSize: '0.625rem', color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
                        "The gray area is the growth you missed. Let's close the gap tomorrow."
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Performance;
