import React, { useEffect, useState } from 'react';
import type { Goal, Session, Tier } from '../types';
import { getGoals, getSessionsByGoalId } from '../utils/storage';
import { calculateWeightedMovingAverage } from '../utils/calculations';
import BarChart from './charts/BarChart';
import LineChart from './charts/LineChart';
import TierBreakdown from './charts/TierBreakdown';
import { ArrowLeft, Trophy, Flame, Calendar, Activity } from 'lucide-react';

interface AnalyticsProps {
    goalId: string;
    onBack: () => void;
}

const Analytics: React.FC<AnalyticsProps> = ({ goalId, onBack }) => {
    const [goal, setGoal] = useState<Goal | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);

    useEffect(() => {
        const allGoals = getGoals();
        const found = allGoals.find(g => g.id === goalId);
        if (found) {
            setGoal(found);
            setSessions(getSessionsByGoalId(goalId));
        }
    }, [goalId]);

    if (!goal) return <div>Loading analytics...</div>;

    // Prepare Data for Charts

    // 1. Performance History (Last 20 sessions)
    const sortedSessions = [...sessions].sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime());
    const recentSessions = sortedSessions.slice(-20);

    const barData = recentSessions.map((s) => ({
        label: new Date(s.endTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        value: s.finalCount,
        tier: s.tier
    }));

    // 2. Moving Average Trend (Dual Line)
    // Calculate WMA for each point in history? 
    // Expensive but accurate. Or just use stored adaptive values? 
    // Sessions store "originalGoal" but not necessarily the WMA at that time.
    // We can re-calculate WMA for each point.

    const lineData = recentSessions.map((s, i) => {
        // Get sessions up to this point
        const indexInAll = sessions.findIndex(sess => sess.id === s.id);
        const sessionsUpToHere = sessions.slice(0, indexInAll + 1);
        const wma = calculateWeightedMovingAverage(sessionsUpToHere, goal.movingAverageWindow);

        return {
            label: i % 5 === 0 ? new Date(s.endTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '',
            value: s.finalCount,
            average: wma
        };
    });

    // 3. Tier Breakdown
    const tierCounts: Record<Tier, number> = {
        below: 0, baseline: 0, momentum: 0, stretch: 0, beyond: 0
    };
    sessions.forEach(s => {
        if (tierCounts[s.tier] !== undefined) tierCounts[s.tier]++;
    });

    // Stats
    const totalBreakthroughs = sessions.reduce((sum, s) => sum + s.breakthroughs, 0);
    const averageScore = sessions.length > 0 ? Math.round(sessions.reduce((sum, s) => sum + s.finalCount, 0) / sessions.length) : 0;

    return (
        <div className="container pb-10 pt-4">
            <header className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 -ml-2 text-muted hover:text-white">
                    <ArrowLeft />
                </button>
                <div>
                    <h1 className="text-2xl font-bold">{goal.name}</h1>
                    <p className="text-muted text-sm">Analytics & Trends</p>
                </div>
            </header>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="card p-4 flex flex-col items-center">
                    <span className="text-xs text-muted uppercase font-bold">Total Sessions</span>
                    <div className="flex items-center gap-2 text-xl font-bold mt-1">
                        <Calendar size={20} className="text-brand" />
                        {goal.totalSessions}
                    </div>
                </div>

                <div className="card p-4 flex flex-col items-center">
                    <span className="text-xs text-muted uppercase font-bold">Best Streak</span>
                    <div className="flex items-center gap-2 text-xl font-bold mt-1">
                        <Flame size={20} className="text-orange-500" />
                        {goal.longestStreak}
                    </div>
                </div>

                <div className="card p-4 flex flex-col items-center">
                    <span className="text-xs text-muted uppercase font-bold">Total Breakthroughs</span>
                    <div className="flex items-center gap-2 text-xl font-bold mt-1">
                        <Trophy size={20} className="text-yellow-500" />
                        {totalBreakthroughs}
                    </div>
                </div>

                <div className="card p-4 flex flex-col items-center">
                    <span className="text-xs text-muted uppercase font-bold">Average Score</span>
                    <div className="flex items-center gap-2 text-xl font-bold mt-1">
                        <Activity size={20} className="text-blue-500" />
                        {averageScore}
                    </div>
                </div>
            </div>

            <div className="card mb-8">
                <h3 className="font-bold mb-4">Performance History</h3>
                <BarChart data={barData} />
            </div>

            <div className="card mb-8">
                <h3 className="font-bold mb-4">Moving Average Trend</h3>
                <p className="text-xs text-muted mb-4">Solid: Count • Dashed: Weighted Average</p>
                <LineChart data={lineData} />
            </div>

            <div className="card mb-8">
                <h3 className="font-bold mb-4">Tier Distribution</h3>
                <TierBreakdown distribution={tierCounts} total={sessions.length} />

                <div className="grid grid-cols-5 gap-1 mt-4 text-center">
                    {['Below', 'Base', 'Momen', 'Stretch', 'Beyond'].map((label, i) => (
                        <div key={label} className="flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full mb-1 bg-${['gray-700', 'baseline', 'momentum', 'stretch', 'beyond'][i]}`}
                                style={{ backgroundColor: `var(--color-${['gray-700', 'baseline', 'momentum', 'stretch', 'beyond'][i].replace('gray-700', 'gray-700')})` }}
                            />
                            <span className="text-[10px] text-muted uppercase">{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Analytics;
