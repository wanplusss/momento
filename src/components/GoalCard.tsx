import React from 'react';
import type { Goal, Session } from '../types';
import { calculateTrend, getWMAFromValues, getRSI } from '../utils/calculations';
import { Clock, Activity } from 'lucide-react';

interface GoalCardProps {
    goal: Goal;
    sessions: Session[];
    onCheckIn: (goalId: string) => void;
    onDeepDive: (goalId: string) => void;
    onSettings: (goalId: string) => void;
    onManualLog: (goalId: string) => void;
    onRestDay: (goalId: string) => void;
    onBank: (goalId: string) => void;
    onDelete: (goalId: string) => void;
}

const GoalCard: React.FC<GoalCardProps> = ({
    goal, sessions, onCheckIn, onDeepDive,
    onSettings, onManualLog, onRestDay, onBank, onDelete
}) => {
    const trend = calculateTrend(sessions);
    const historyValues = [...sessions]
        .sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime())
        .map(s => s.finalCount);
    const wma = getWMAFromValues(historyValues, goal.movingAverageWindow);
    const rsi = getRSI(historyValues);
    const baseline = Math.round(wma * 0.7);
    const isBanked = goal.status === 'banked';

    return (
        <div className={`card ${isBanked ? 'opacity-60' : ''}`} style={{ overflow: 'visible' }}>
            {/* Hover Actions */}
            <div className="hover-actions">
                {!isBanked && (
                    <>
                        <button className="btn-icon" onClick={() => onSettings(goal.id)} title="Settings">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v2m0 18v2m-9-11h2m18 0h2m-3.6-6.4-1.4 1.4M6.4 17.6 5 19m0-14 1.4 1.4m11.2 11.2 1.4 1.4" /></svg>
                        </button>
                        <button className="btn-icon" onClick={() => onManualLog(goal.id)} title="Manual Log">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                        <button className="btn-icon" onClick={() => onRestDay(goal.id)} title="Rest Day">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                        </button>
                        <button className="btn-icon" onClick={() => onBank(goal.id)} title="Pause Habit" style={{ color: undefined }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /></svg>
                        </button>
                    </>
                )}
                <button className="btn-icon" onClick={() => onDelete(goal.id)} title="Delete" style={{ color: undefined }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                </button>
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <h3
                            onClick={() => onDeepDive(goal.id)}
                            style={{ fontSize: '1.125rem', fontWeight: 700, color: 'white', margin: 0, fontStyle: 'normal', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.2)' }}
                        >
                            {goal.name}
                        </h3>
                        {goal.goalMode === 'timer' && <Clock size={14} style={{ color: 'var(--color-text-tertiary)' }} />}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span className="badge badge-slate">{goal.currentStreak} Day Streak</span>
                        {!isBanked && (
                            <span className={`badge ${rsi > 60 ? 'badge-success' : 'badge-slate'}`}>
                                {rsi}% Consistency
                            </span>
                        )}
                        {trend.direction !== 'neutral' && !isBanked && (
                            <span className={`badge ${trend.direction === 'up' ? 'badge-success' : 'badge-slate'}`}>
                                {trend.direction === 'up' ? '▲' : '▼'} {trend.percent}%
                            </span>
                        )}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div className="label" style={{ marginBottom: '0.25rem' }}>Baseline</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', fontVariantNumeric: 'tabular-nums' }}>
                        {wma} <span style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)', fontWeight: 400 }}>{goal.unit}</span>
                    </div>
                </div>
            </div>

            {/* Segmented Progress Bar */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div className="progress-bar">
                    <div style={{ height: '100%', background: 'rgba(20, 184, 166, 0.4)', width: `${(baseline / goal.stretch) * 100}%` }} />
                    <div style={{ height: '100%', background: 'rgba(99, 102, 241, 0.6)', width: `${((wma - baseline) / goal.stretch) * 100}%` }} />
                    <div style={{ height: '100%', background: 'rgba(168, 85, 247, 0.5)', width: `${((goal.stretch - wma) / goal.stretch) * 100}%` }} />
                    <div style={{ height: '100%', background: 'rgba(245, 158, 11, 0.3)', flex: 1 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                    <span className="label" style={{ color: 'var(--color-teal)', marginBottom: 0 }}>Start</span>
                    <span className="label" style={{ color: 'var(--color-brand-500)', marginBottom: 0 }}>Baseline {wma}</span>
                    <span className="label" style={{ color: 'var(--color-purple)', marginBottom: 0 }}>Target {goal.stretch}</span>
                </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                    onClick={() => onCheckIn(goal.id)}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-lg)' }}
                >
                    {isBanked ? '↻ Resume' : 'Check In'}
                </button>
                <button
                    onClick={() => onDeepDive(goal.id)}
                    className="btn btn-secondary"
                    style={{ padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-lg)' }}
                >
                    <Activity size={18} />
                </button>
            </div>
        </div>
    );
};

export default GoalCard;
