import React, { useState } from 'react';
import type { Goal, Session } from '../types';
import GoalCard from './GoalCard';
import { Plus, LayoutDashboard, PieChart as PieChartIcon, Heart, Coffee, Download } from 'lucide-react';
import { markRestDay, bankProgress, completeSession } from '../utils/actions';
import { getDayString, determineTier } from '../utils/calculations';
import { genId } from '../utils/id';

interface DashboardProps {
    goals: Goal[];
    sessions: Session[];
    onNavigate: (page: string, params?: any) => void;
    currentView: string;
}

const Dashboard: React.FC<DashboardProps> = ({ goals, sessions, onNavigate, currentView }) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [showGovernance, setShowGovernance] = useState(false);
    const [showSupport, setShowSupport] = useState(false);
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [activeGoalId, setActiveGoalId] = useState<string | null>(null);

    const [formData, setFormData] = useState<any>({});
    const [manualValue, setManualValue] = useState('');

    const activeGoal = goals.find(g => g.id === activeGoalId);

    const handleCheckIn = (goalId: string) => {
        const goal = goals.find(g => g.id === goalId);
        if (goal && goal.status === 'banked') {
            // Resume - navigate to wizard to restart
            onNavigate('wizard', { goalId });
            return;
        }
        onNavigate('wizard', { goalId });
    };

    const handleSettings = (goalId: string) => {
        const goal = goals.find(g => g.id === goalId);
        if (goal) {
            setActiveGoalId(goalId);
            setFormData({
                name: goal.name,
                unit: goal.unit,
                stepSize: goal.stepSize ?? 1,
                stretch: goal.stretch,
                increment: goal.increment,
                window: goal.movingAverageWindow,
            });
            setShowGovernance(true);
        }
    };

    const handleManualLog = (goalId: string) => {
        setActiveGoalId(goalId);
        setManualValue('');
        setShowManualEntry(true);
    };

    const handleRestDay = async (goalId: string) => {
        if (confirm('Log Rest Day? (Keeps your streak alive)')) {
            await markRestDay(goalId, getDayString(new Date()));
            onNavigate('dashboard');
        }
    };

    const handleBank = async (goalId: string) => {
        if (confirm('Pause this habit? (Saves your stats)')) {
            await bankProgress(goalId);
            onNavigate('dashboard');
        }
    };

    const handleDelete = (goalId: string) => {
        if (confirm('Remove this habit?')) {
            onNavigate('delete', { goalId });
        }
    };

    const submitGovernance = () => {
        onNavigate('updateGoal', {
            goalId: activeGoalId,
            updates: {
                name: formData.name,
                unit: formData.unit,
                stepSize: parseFloat(formData.stepSize) || 1,
                stretch: parseInt(formData.stretch),
                increment: parseInt(formData.increment),
                movingAverageWindow: parseInt(formData.window),
            }
        });
        setShowGovernance(false);
    };

    const submitManualEntry = async () => {
        if (!manualValue || !activeGoal) return;
        const val = parseInt(manualValue);

        // Create a session directly
        const endTime = new Date().toISOString();
        const session: any = {
            id: genId(),
            goalId: activeGoal.id,
            originalGoal: {
                baseline: activeGoal.adaptiveBaseline || activeGoal.baseline,
                momentum: activeGoal.adaptiveMomentum || activeGoal.momentum,
                stretch: activeGoal.stretch,
                increment: activeGoal.increment
            },
            finalCount: val,
            breakthroughs: 0,
            tier: determineTier(val, activeGoal),
            startTime: endTime,
            endTime: endTime,
            hitHistory: []
        };

        await completeSession(session);
        setShowManualEntry(false);
        onNavigate('summary', { sessionId: session.id, prediction: val });
    };

    const addNewHabit = () => {
        if (!formData.newName) return;
        onNavigate('addQuick', {
            name: formData.newName,
            goalMode: formData.newType || 'counter',
            stretch: parseInt(formData.newStretch) || 10,
            increment: parseInt(formData.newIncrement) || 1,
            unit: formData.newUnit || (formData.newType === 'timer' ? 'mins' : 'reps'),
        });
        setShowAddForm(false);
        setFormData({});
    };

    if (goals.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', padding: '1.5rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'white' }}>Momento</h1>
                </div>
                <button onClick={() => onNavigate('create')} className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                    <Plus size={16} /> Create First Habit
                </button>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingBottom: '6rem', minHeight: '100vh' }}>
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingTop: '0.5rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'white', letterSpacing: '-0.02em' }}>Momento</h1>
                <button onClick={() => setShowSupport(true)} style={{ color: 'var(--color-text-tertiary)', padding: '0.5rem' }}>
                    <Heart size={20} />
                </button>
            </header>

            {/* Goal Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {goals.map(goal => (
                    <GoalCard
                        key={goal.id}
                        goal={goal}
                        sessions={sessions.filter(s => s.goalId === goal.id)}
                        onCheckIn={handleCheckIn}
                        onDeepDive={(id) => onNavigate('technical', { goalId: id })}
                        onSettings={handleSettings}
                        onManualLog={handleManualLog}
                        onRestDay={handleRestDay}
                        onBank={handleBank}
                        onDelete={handleDelete}
                    />
                ))}
            </div>

            {/* Add Habit Section */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(39,39,42,0.5)' }}>
                {!showAddForm ? (
                    <button
                        onClick={() => { setFormData({}); setShowAddForm(true); }}
                        style={{
                            width: '100%', padding: '1rem',
                            border: '1px dashed var(--color-border)',
                            color: 'var(--color-text-tertiary)',
                            borderRadius: 'var(--radius-xl)',
                            fontSize: '0.75rem', fontWeight: 700,
                            textTransform: 'uppercase',
                            background: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                            transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.color = 'var(--color-brand-400)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}
                    >
                        <Plus size={16} /> Add New Habit
                    </button>
                ) : (
                    <div className="card animate-slide-up" style={{ gap: '1rem', display: 'flex', flexDirection: 'column' }}>
                        <div className="label" style={{ color: 'var(--color-brand-400)', letterSpacing: '0.1em' }}>Create New Habit</div>
                        <input
                            type="text"
                            placeholder='Habit Name (e.g. Read 10 Pages)'
                            className="input"
                            value={formData.newName || ''}
                            onChange={e => setFormData({ ...formData, newName: e.target.value })}
                            autoFocus
                        />
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <select
                                className="select"
                                value={formData.newType || 'counter'}
                                onChange={e => setFormData({ ...formData, newType: e.target.value })}
                            >
                                <option value="counter">Reps (Counter)</option>
                                <option value="timer">Time (Timer)</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Unit (e.g. pages)"
                                className="input"
                                style={{ width: '33%' }}
                                value={formData.newUnit || ''}
                                onChange={e => setFormData({ ...formData, newUnit: e.target.value })}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <div style={{ flex: 1 }}>
                                <div className="label" style={{ marginBottom: '0.25rem' }}>Auto-Increase</div>
                                <input
                                    type="number"
                                    placeholder="Step (e.g. 1)"
                                    className="input"
                                    value={formData.newIncrement || ''}
                                    onChange={e => setFormData({ ...formData, newIncrement: e.target.value })}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div className="label" style={{ marginBottom: '0.25rem' }}>Daily Target</div>
                                <input
                                    type="number"
                                    placeholder="Goal (e.g. 10)"
                                    className="input"
                                    value={formData.newStretch || ''}
                                    onChange={e => setFormData({ ...formData, newStretch: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={addNewHabit} className="btn btn-primary" style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-lg)' }}>Create</button>
                            <button onClick={() => setShowAddForm(false)} className="btn btn-secondary" style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)' }}>Cancel</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Manual Entry Modal */}
            {showManualEntry && activeGoal && (
                <div className="overlay" onClick={() => setShowManualEntry(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3 style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Manual Log</h3>
                        <div style={{ marginBottom: '1rem' }}>
                            <div className="label">Total {activeGoal.unit}</div>
                            <input
                                type="number"
                                className="input input-lg"
                                value={manualValue}
                                onChange={e => setManualValue(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={submitManualEntry} className="btn btn-primary" style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-lg)' }}>Save</button>
                            <button onClick={() => setShowManualEntry(false)} className="btn btn-secondary" style={{ padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-lg)' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Governance Modal */}
            {showGovernance && activeGoal && (
                <div className="overlay" onClick={() => setShowGovernance(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {/* Drag handle */}
                        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-border)', margin: '0 auto 0.25rem' }} />

                        <h3 style={{ fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ⚙ Settings
                        </h3>

                        <div>
                            <div className="label">Habit Name</div>
                            <input type="text" className="input" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ color: '#fff', WebkitTextFillColor: '#fff' }} />
                        </div>

                        <div>
                            <div className="label">Unit Label</div>
                            <input type="text" className="input" placeholder="e.g. reps, km, pages" value={formData.unit || ''} onChange={e => setFormData({ ...formData, unit: e.target.value })} style={{ color: '#fff', WebkitTextFillColor: '#fff' }} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                            <div>
                                <div className="label">Step/Tap</div>
                                <input type="number" step="any" className="input" placeholder="1" value={formData.stepSize ?? ''} onChange={e => setFormData({ ...formData, stepSize: e.target.value })} style={{ color: '#fff', WebkitTextFillColor: '#fff' }} />
                            </div>
                            <div>
                                <div className="label">Daily Target</div>
                                <input type="number" className="input" value={formData.stretch || ''} onChange={e => setFormData({ ...formData, stretch: e.target.value })} style={{ color: '#fff', WebkitTextFillColor: '#fff' }} />
                            </div>
                            <div>
                                <div className="label">Auto+</div>
                                <input type="number" className="input" value={formData.increment || ''} onChange={e => setFormData({ ...formData, increment: e.target.value })} style={{ color: '#fff', WebkitTextFillColor: '#fff' }} />
                            </div>
                        </div>
                        <p style={{ fontSize: '0.6rem', color: 'var(--color-text-secondary)', marginTop: '-0.25rem', lineHeight: 1.4 }}>
                            <strong>Step/Tap</strong> = per tap. <strong>Daily Target</strong> = your goal. <strong>Auto+</strong> = auto-increase when exceeded.
                        </p>

                        <div>
                            <div className="label">Baseline Stability (Days)</div>
                            <input type="number" className="input" value={formData.window || ''} onChange={e => setFormData({ ...formData, window: e.target.value })} style={{ color: '#fff', WebkitTextFillColor: '#fff' }} />
                            <p style={{ fontSize: '0.6rem', color: 'var(--color-text-secondary)', marginTop: '0.35rem', lineHeight: 1.4 }}>
                                Low (3) = adapts fast. High (30) = more forgiving.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.25rem' }}>
                            <button onClick={submitGovernance} className="btn" style={{ flex: 1, padding: '0.7rem', borderRadius: 'var(--radius-lg)', background: 'var(--color-brand-500)', color: 'white', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem' }}>Save</button>
                            <button onClick={() => setShowGovernance(false)} className="btn btn-secondary" style={{ padding: '0.7rem 1rem', borderRadius: 'var(--radius-lg)', fontSize: '0.7rem' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Support Modal */}
            {showSupport && (
                <div className="overlay" onClick={() => setShowSupport(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Drag handle */}
                        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-border)', margin: '0 auto 0.25rem' }} />

                        <h3 style={{ fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                            Support Developer
                        </h3>

                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
                            If you enjoy using Momento, please consider supporting a solo developer like me!
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <a href="https://ko-fi.com/wanplusss" target="_blank" rel="noreferrer" className="btn" style={{ background: '#29abe0', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.85rem', borderRadius: 'var(--radius-lg)', textDecoration: 'none' }}>
                                <Coffee size={18} /> Buy me a Coffee
                            </a>

                            <div style={{ background: 'white', padding: '1rem', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '100%', aspectRatio: '1/1', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)', border: '2px solid #e4e4e7', padding: '0.25rem', position: 'relative' }}>
                                    <img src="/qr.png" alt="DuitNow QR" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'var(--radius-sm)' }} />
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                                    <button onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = '/momento-support.jpeg';
                                        link.download = 'momento-support.jpeg';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }} className="btn" style={{ flex: 1, padding: '0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', background: '#18181b', color: 'white', fontWeight: 600, borderRadius: 'var(--radius-md)' }}>
                                        <Download size={14} /> Save to Photos
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button onClick={() => setShowSupport(false)} className="btn btn-secondary" style={{ width: '100%', padding: '0.85rem', borderRadius: 'var(--radius-lg)' }}>
                            Maybe Later
                        </button>
                    </div>
                </div>
            )}

            {/* Bottom Navigation */}
            <div className="bottom-nav">
                <button onClick={() => onNavigate('dashboard')} className={`bottom-nav-item ${currentView === 'dashboard' ? 'active' : ''}`}>
                    <LayoutDashboard size={20} />
                    <span>Home</span>
                </button>
                <button onClick={() => onNavigate('performance')} className={`bottom-nav-item ${currentView === 'performance' ? 'active' : ''}`}>
                    <PieChartIcon size={20} />
                    <span>Reflect</span>
                </button>
            </div>
        </div>
    );
};

export default Dashboard;
