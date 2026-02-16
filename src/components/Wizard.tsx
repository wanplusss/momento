import React from 'react';
import type { Goal, Session } from '../types';
import { getWMAFromValues } from '../utils/calculations';
import { Brain, ArrowRight, ChevronLeft } from 'lucide-react';

interface WizardProps {
    goal: Goal;
    sessions: Session[];
    wizardTarget: string;
    onTargetChange: (val: string) => void;
    onCommit: () => void;
    onBack: () => void;
}

const Wizard: React.FC<WizardProps> = ({ goal, sessions, wizardTarget, onTargetChange, onCommit, onBack }) => {
    const historyValues = [...sessions]
        .sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime())
        .map(s => s.finalCount);
    const systemSuggestion = getWMAFromValues(historyValues, goal.movingAverageWindow);
    const suggestionNum = parseInt(wizardTarget) || systemSuggestion;

    let mode = 'Maintaining';
    let modeColor = 'var(--color-text-tertiary)';
    if (suggestionNum > systemSuggestion) { mode = 'Growing'; modeColor = 'var(--color-success)'; }
    if (suggestionNum < systemSuggestion) { mode = 'Recovery'; modeColor = 'var(--color-warning)'; }

    return (
        <div className="fullscreen animate-slide-right" style={{ padding: '2rem', justifyContent: 'space-between' }}>
            <header className="fullscreen-header" style={{ padding: 0, marginBottom: '2rem' }}>
                <button onClick={onBack}><ChevronLeft size={24} /></button>
                <span className="label" style={{ letterSpacing: '0.1em', marginBottom: 0 }}>{goal.name}</span>
                <div style={{ width: 24 }} />
            </header>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', maxWidth: '20rem', margin: '0 auto', width: '100%', gap: '3rem' }}>
                <div style={{ textAlign: 'center' }}>
                    <Brain size={48} style={{ color: 'var(--color-brand-500)', marginBottom: '1rem', opacity: 0.8 }} />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Session Check-In</h2>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>Set your intention for today.</p>
                </div>

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card" style={{ borderRadius: 'var(--radius-xl)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span className="label" style={{ marginBottom: 0 }}>Suggested Target</span>
                            <span style={{ color: 'var(--color-brand-400)', fontWeight: 700 }}>{systemSuggestion}</span>
                        </div>
                        <div style={{ height: 6, background: '#18181b', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: 'rgba(99, 102, 241, 0.6)', width: '60%' }} />
                        </div>
                    </div>

                    <div>
                        <label className="label" style={{ letterSpacing: '0.1em' }}>Your Goal Today</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="number"
                                className="input input-lg"
                                value={wizardTarget}
                                onChange={(e) => onTargetChange(e.target.value)}
                                placeholder={systemSuggestion.toString()}
                                autoFocus
                            />
                            <div style={{
                                position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                                right: '1rem', fontSize: '0.625rem', fontWeight: 700,
                                textTransform: 'uppercase', color: modeColor
                            }}>
                                {mode}
                            </div>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: '0.75rem' }}>
                            "Listen to your body. Push if you can, rest if you must."
                        </p>
                    </div>
                </div>

                <button
                    onClick={onCommit}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '1rem', borderRadius: 'var(--radius-xl)', fontSize: '0.875rem', letterSpacing: '0.1em' }}
                >
                    Start Session <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};

export default Wizard;
