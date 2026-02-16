import React, { useState } from 'react';
import type { Goal } from '../types';
import { saveGoals, getGoals } from '../utils/storage';
import { getIcon, ICONS } from '../utils/icons';
import { ArrowRight, ArrowLeft, Check, RefreshCw, Dumbbell, ClipboardList, Minus, Plus } from 'lucide-react';
import { genId } from '../utils/id';

interface GoalCreateProps {
    onComplete: () => void;
    onCancel: () => void;
}

const STEPS = ['Type', 'Details', 'Targets', 'Config', 'Review'];

/* ── Shared mini-component: Number stepper ─────────────────────── */
const Stepper: React.FC<{
    label: string;
    color: string;
    value: number;
    unit: string;
    min?: number;
    max?: number;
    step?: number;
    onChange: (v: number) => void;
}> = ({ label, color, value, unit, min = 1, max = 999, step = 1, onChange }) => {
    const dec = () => onChange(Math.max(min, value - step));
    const inc = () => onChange(Math.min(max, value + step));
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ fontWeight: 600, fontSize: '0.8rem', color, letterSpacing: '0.03em' }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button onClick={dec} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Minus size={14} />
                </button>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', minWidth: 40, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                    {value}
                </span>
                <button onClick={inc} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Plus size={14} />
                </button>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', minWidth: 30 }}>{unit}</span>
            </div>
        </div>
    );
};

/* ── Chip selector ─────────────────────────────────────────────── */
const ChipSelect: React.FC<{
    options: { label: string; value: number | string }[];
    selected: number | string;
    onSelect: (v: any) => void;
}> = ({ options, selected, onSelect }) => (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
        {options.map(o => (
            <button
                key={o.value}
                onClick={() => onSelect(o.value)}
                style={{
                    flex: 1,
                    padding: '0.6rem 0.5rem',
                    borderRadius: 'var(--radius-lg)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    border: '1px solid',
                    borderColor: selected === o.value ? 'var(--color-brand-500)' : 'var(--color-border)',
                    background: selected === o.value ? 'var(--color-brand-600)' : 'var(--color-surface)',
                    color: selected === o.value ? 'white' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                }}
            >
                {o.label}
            </button>
        ))}
    </div>
);

const GoalCreate: React.FC<GoalCreateProps> = ({ onComplete, onCancel }) => {
    const [step, setStep] = useState(0);
    const [draft, setDraft] = useState<Partial<Goal>>({
        type: 'habit',
        goalMode: 'counter',
        status: 'active',
        icon: 'activity',
        name: '',
        unit: 'times',
        baseline: 1,
        momentum: 3,
        stretch: 5,
        increment: 1,
        movingAverageWindow: 5,
        currentStreak: 0,
        longestStreak: 0,
        totalSessions: 0,
        bankedProgress: [],
        restDays: [],
        color: '#10b981'
    });

    const handleNext = () => { if (step < STEPS.length - 1) setStep(step + 1); };
    const handleBack = () => { if (step > 0) setStep(step - 1); else onCancel(); };

    const handleSave = async () => {
        if (!draft.name?.trim()) {
            alert('Please enter a goal name in Step 2.');
            return;
        }

        try {
            const newGoal: Goal = {
                ...draft as Goal,
                id: genId(),
                createdAt: new Date().toISOString()
            };
            const goals = await getGoals();
            await saveGoals([...goals, newGoal]);
            onComplete();
        } catch (err: any) {
            alert('Error creating goal: ' + (err?.message || err));
        }
    };

    /* ── Inline label style ───────────────────────────────── */
    const labelStyle: React.CSSProperties = {
        display: 'block', fontWeight: 700, fontSize: '0.75rem', marginBottom: '0.4rem',
        textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-secondary)'
    };

    const inputStyle: React.CSSProperties = {
        width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)', padding: '0.7rem 0.85rem', color: '#ffffff',
        fontSize: '0.9rem', fontFamily: 'var(--font-mono)', outline: 'none',
        WebkitTextFillColor: '#ffffff',
    };

    /* ── Type card style ───────────────────────────────── */
    const typeCard = (active: boolean): React.CSSProperties => ({
        width: '100%', textAlign: 'left' as const, padding: '1rem',
        background: active ? 'rgba(99, 102, 241, 0.08)' : 'var(--color-surface)',
        border: `1.5px solid ${active ? 'var(--color-brand-500)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-xl)',
        cursor: 'pointer', transition: 'all 0.15s ease',
        boxShadow: active ? '0 0 0 2px rgba(99, 102, 241, 0.15)' : 'none',
    });

    const renderStepContent = () => {
        switch (step) {
            case 0: // Type
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {[
                            { type: 'habit', icon: <RefreshCw size={18} />, iconBg: 'rgba(59,130,246,0.15)', iconColor: '#60a5fa', label: 'Daily Habit', desc: 'Consistent small actions — reading, meditating, flossing.' },
                            { type: 'fitness', icon: <Dumbbell size={18} />, iconBg: 'rgba(249,115,22,0.15)', iconColor: '#fb923c', label: 'Fitness Record', desc: 'Push for higher numbers — push-ups, distance, weights.' },
                            { type: 'project', icon: <ClipboardList size={18} />, iconBg: 'rgba(168,85,247,0.15)', iconColor: '#c084fc', label: 'Project Work', desc: 'Deep work sessions — writing words, coding hours.' },
                        ].map(t => (
                            <button key={t.type} style={typeCard(draft.type === t.type)}
                                onClick={() => setDraft({ ...draft, type: t.type as any, icon: t.type === 'habit' ? 'check' : t.type === 'fitness' ? 'dumbbell' : 'target' })}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                                    <div style={{ padding: '0.35rem', borderRadius: '0.5rem', background: t.iconBg, color: t.iconColor, display: 'flex' }}>{t.icon}</div>
                                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t.label}</span>
                                </div>
                                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', margin: 0, paddingLeft: '2.25rem' }}>{t.desc}</p>
                            </button>
                        ))}
                    </div>
                );

            case 1: // Details
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={labelStyle}>Goal Name</label>
                            <input style={inputStyle} type="text" placeholder="e.g. Morning Push-ups"
                                value={draft.name || ''} onChange={e => setDraft({ ...draft, name: e.target.value })} autoFocus />
                        </div>
                        <div>
                            <label style={labelStyle}>Unit</label>
                            <input style={inputStyle} type="text" placeholder="e.g. reps, km, pages"
                                value={draft.unit || ''} onChange={e => setDraft({ ...draft, unit: e.target.value })} />
                        </div>
                        <div>
                            <label style={labelStyle}>Mode</label>
                            <ChipSelect
                                options={[{ label: 'Counter', value: 'counter' }, { label: 'Timer', value: 'timer' }]}
                                selected={draft.goalMode || 'counter'}
                                onSelect={(v: string) => setDraft({ ...draft, goalMode: v as any, unit: v === 'timer' ? 'mins' : draft.unit })}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Icon</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
                                {Object.keys(ICONS).map(iconKey => (
                                    <button key={iconKey} onClick={() => setDraft({ ...draft, icon: iconKey })}
                                        style={{
                                            padding: '0.5rem', borderRadius: 'var(--radius-lg)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: draft.icon === iconKey ? 'var(--color-brand-600)' : 'var(--color-surface)',
                                            color: draft.icon === iconKey ? 'white' : 'var(--color-text-tertiary)',
                                            border: `1px solid ${draft.icon === iconKey ? 'var(--color-brand-500)' : 'var(--color-border)'}`,
                                            cursor: 'pointer', transition: 'all 0.15s ease',
                                        }}>
                                        {getIcon(iconKey, { size: 18 })}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 2: // Targets — REPLACES SLIDERS with +/- steppers
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem', lineHeight: 1.6 }}>
                            <strong style={{ color: 'var(--color-teal)' }}>Baseline</strong> = bare minimum, even on a bad day.<br />
                            <strong style={{ color: 'var(--color-brand-400)' }}>Momentum</strong> = your comfortable pace.<br />
                            <strong style={{ color: 'var(--color-purple)' }}>Daily Target</strong> = your ambitious goal.
                        </p>

                        <Stepper label="Baseline (Min)" color="var(--color-teal)" value={draft.baseline || 1} unit={draft.unit || ''} min={1} onChange={v => {
                            const updates: Partial<Goal> = { baseline: v };
                            if (v > (draft.momentum || 3)) updates.momentum = v;
                            if (v > (draft.stretch || 5)) updates.stretch = v;
                            setDraft({ ...draft, ...updates });
                        }} />

                        <Stepper label="Momentum" color="var(--color-brand-400)" value={draft.momentum || 3} unit={draft.unit || ''} min={draft.baseline || 1} onChange={v => {
                            const updates: Partial<Goal> = { momentum: v };
                            if (v > (draft.stretch || 5)) updates.stretch = v;
                            setDraft({ ...draft, ...updates });
                        }} />

                        <Stepper label="Daily Target" color="var(--color-purple)" value={draft.stretch || 5} unit={draft.unit || ''} min={draft.momentum || 3} onChange={v => {
                            setDraft({ ...draft, stretch: v });
                        }} />

                        <div style={{ marginTop: '0.75rem', padding: '0.65rem', background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-md)', fontSize: '0.6rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                            💡 Tip: Start small. You can always increase targets later via Auto+.
                        </div>
                    </div>
                );

            case 3: // Config
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <label style={labelStyle}>Auto-Increase</label>
                            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                                If you beat your Daily Target, how much should it increase next time?
                            </p>
                            <ChipSelect
                                options={[{ label: '+1', value: 1 }, { label: '+2', value: 2 }, { label: '+5', value: 5 }, { label: '+10', value: 10 }]}
                                selected={draft.increment || 1}
                                onSelect={(v: number) => setDraft({ ...draft, increment: v })}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Baseline Stability</label>
                            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                                How forgiving is your baseline?<br />
                                <strong>Low (3)</strong> = drops fast if you miss days.<br />
                                <strong>High (10)</strong> = stays steady, more forgiving.
                            </p>
                            <ChipSelect
                                options={[{ label: '3', value: 3 }, { label: '5', value: 5 }, { label: '10', value: 10 }]}
                                selected={draft.movingAverageWindow || 5}
                                onSelect={(v: number) => setDraft({ ...draft, movingAverageWindow: v })}
                            />
                        </div>
                    </div>
                );

            case 4: // Review
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{
                            textAlign: 'center', padding: '1.5rem 1rem',
                            background: 'rgba(99,102,241,0.08)', border: '1.5px solid rgba(99,102,241,0.3)',
                            borderRadius: 'var(--radius-xl)',
                        }}>
                            <div style={{ color: 'var(--color-brand-400)', display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                                {getIcon(draft.icon!, { size: 36 })}
                            </div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.15rem' }}>{draft.name}</h2>
                            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', margin: 0 }}>{draft.type} • {draft.unit}</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
                            <div style={{ padding: '0.6rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Base</div>
                                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-teal)' }}>{draft.baseline}</div>
                            </div>
                            <div style={{ padding: '0.6rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Momentum</div>
                                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-brand-400)' }}>{draft.momentum}</div>
                            </div>
                            <div style={{ padding: '0.6rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Target</div>
                                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-purple)' }}>{draft.stretch}</div>
                            </div>
                        </div>

                        <p style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--color-text-tertiary)', margin: 0 }}>
                            Auto-increases by +{draft.increment} when you exceed your target.
                            Baseline adapts every {draft.movingAverageWindow} sessions.
                        </p>
                    </div>
                );

            default: return null;
        }
    };

    /* ── Progress dots ───────────────────────────────── */
    const ProgressDots = () => (
        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
            {STEPS.map((_, i) => (
                <div key={i} style={{
                    width: i === step ? 20 : 6, height: 6,
                    borderRadius: 'var(--radius-full)',
                    background: i <= step ? 'var(--color-brand-500)' : 'var(--color-border)',
                    transition: 'all 0.2s ease',
                }} />
            ))}
        </div>
    );

    return (
        <div className="container" style={{ maxWidth: 420, paddingTop: '1rem', paddingBottom: '2rem', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <button onClick={handleBack} style={{ padding: '0.35rem', color: 'var(--color-text-tertiary)', cursor: 'pointer', background: 'none', border: 'none' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <span style={{ fontWeight: 600, fontSize: '0.7rem', color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>
                        Step {step + 1} of {STEPS.length}
                    </span>
                    <div style={{ width: 28 }} />
                </div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.75rem', fontFamily: 'var(--font-sans)' }}>{STEPS[step]}</h1>
                <ProgressDots />
            </div>

            {/* Content */}
            <div style={{ flex: 1 }}>
                {renderStepContent()}
            </div>

            {/* Bottom button */}
            {/* Bottom button — sticky on mobile */}
            <div style={{ position: 'sticky', bottom: 0, paddingTop: '1rem', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))', background: 'linear-gradient(transparent, var(--color-bg) 30%)', marginTop: 'auto' }}>
                {step === STEPS.length - 1 ? (
                    <button onClick={handleSave}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '0.85rem', fontSize: '0.85rem', borderRadius: 'var(--radius-xl)' }}>
                        <Check size={18} /> Create Goal
                    </button>
                ) : (
                    <button onClick={handleNext}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '0.85rem', fontSize: '0.85rem', borderRadius: 'var(--radius-xl)' }}>
                        Continue <ArrowRight size={18} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default GoalCreate;
