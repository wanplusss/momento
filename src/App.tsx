import { useState, useEffect } from 'react';
import type { Goal, Session } from './types';
import { getGoals, saveGoals, getSessions, getSessionsByGoalId, migrateFromLocalStorage } from './utils/storage';
import { getWMAFromValues } from './utils/calculations';
import { genId } from './utils/id';
import Dashboard from './components/Dashboard';
import GoalCreate from './components/GoalCreate';
import Wizard from './components/Wizard';
import ActiveSession from './components/ActiveSession';
import SessionSummary from './components/SessionSummary';
import Performance from './components/Performance';
import Technical from './components/Technical';
import { Zap } from 'lucide-react';

function App() {
  const [view, setView] = useState('dashboard');
  const [viewParams, setViewParams] = useState<any>({});
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [wizardTarget, setWizardTarget] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  const loadData = async () => {
    const [g, s] = await Promise.all([getGoals(), getSessions()]);
    setGoals(g);
    setSessions(s);
  };

  useEffect(() => {
    // Initial migration check
    migrateFromLocalStorage().then(() => {
      loadData().then(() => setIsLoaded(true));
    });
  }, []);

  useEffect(() => {
    if (isLoaded) loadData();
  }, [view, isLoaded]);

  const navigate = async (page: string, params: any = {}) => {
    // Handle special navigation actions
    if (page === 'delete') {
      const updated = goals.filter(g => g.id !== params.goalId);
      await saveGoals(updated);
      setGoals(updated);
      return;
    }

    if (page === 'updateGoal') {
      const updated = goals.map(g => {
        if (g.id === params.goalId) {
          return { ...g, ...params.updates };
        }
        return g;
      });
      await saveGoals(updated);
      setGoals(updated);
      showToast('Habit Updated');
      return;
    }

    if (page === 'addQuick') {
      const newGoal: Goal = {
        id: genId(),
        name: params.name,
        type: 'habit',
        goalMode: params.goalMode || 'counter',
        status: 'active',
        baseline: 1,
        momentum: 3,
        stretch: params.stretch || 10,
        increment: params.increment || 1,
        unit: params.unit || 'reps',
        movingAverageWindow: 5,
        currentStreak: 0,
        longestStreak: 0,
        totalSessions: 0,
        bankedProgress: [],
        restDays: [],
        icon: params.goalMode === 'timer' ? 'timer' : 'activity',
        color: '#6366f1',
        createdAt: new Date().toISOString(),
      };
      const updated = [...goals, newGoal];
      await saveGoals(updated);
      setGoals(updated);
      return;
    }

    if (page === 'wizard') {
      // Resume banked goals
      const goal = goals.find(g => g.id === params.goalId);
      if (goal && goal.status === 'banked') {
        const updated = goals.map(g => g.id === params.goalId ? { ...g, status: 'active' as const } : g);
        await saveGoals(updated);
        setGoals(updated);
      }

      // Set default wizard target
      if (goal) {
        const goalSessions = await getSessionsByGoalId(goal.id);
        const historyValues = [...goalSessions]
          .sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime())
          .map(s => s.finalCount);
        const wma = getWMAFromValues(historyValues, goal.movingAverageWindow);
        setWizardTarget(wma.toString());
      }
    }

    setView(page);
    setViewParams(params);
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 1500);
  };

  const commitWizardSession = () => {
    const goal = goals.find(g => g.id === viewParams.goalId);
    if (!goal) return;
    const prediction = parseInt(wizardTarget) || 0;
    setView('session');
    setViewParams({ ...viewParams, prediction });
  };

  const activeGoal = goals.find(g => g.id === viewParams.goalId);

  if (!isLoaded) return <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }} />;

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
      {view === 'dashboard' && (
        <Dashboard goals={goals} sessions={sessions} onNavigate={navigate} currentView="dashboard" />
      )}

      {view === 'performance' && (
        <>
          <Performance goals={goals} allSessions={sessions} />
          {/* Bottom nav for performance view */}
          <div className="bottom-nav">
            <button onClick={() => navigate('dashboard')} className="bottom-nav-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
              <span>Home</span>
            </button>
            <button onClick={() => navigate('performance')} className="bottom-nav-item active">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>
              <span>Reflect</span>
            </button>
          </div>
        </>
      )}

      {view === 'create' && (
        <GoalCreate
          onComplete={() => { loadData(); navigate('dashboard'); }}
          onCancel={() => navigate('dashboard')}
        />
      )}

      {view === 'wizard' && activeGoal && (
        <Wizard
          goal={activeGoal}
          sessions={sessions.filter(s => s.goalId === activeGoal.id)}
          wizardTarget={wizardTarget}
          onTargetChange={setWizardTarget}
          onCommit={commitWizardSession}
          onBack={() => navigate('dashboard')}
        />
      )}

      {view === 'session' && (
        <ActiveSession
          goals={goals}
          sessions={sessions}
          goalId={viewParams.goalId}
          prediction={viewParams.prediction || 0}
          onEndSession={(sessionId) => { loadData(); navigate('summary', { sessionId, prediction: viewParams.prediction }); }}
          onBack={() => navigate('dashboard')}
        />
      )}

      {view === 'summary' && (
        <SessionSummary
          goals={goals}
          sessions={sessions}
          sessionId={viewParams.sessionId}
          prediction={viewParams.prediction || 0}
          onNavigate={(page) => navigate(page)}
        />
      )}

      {view === 'technical' && activeGoal && (
        <Technical
          goal={activeGoal}
          sessions={sessions.filter(s => s.goalId === activeGoal.id)}
          onBack={() => navigate('dashboard')}
        />
      )}

      {/* Global Toast */}
      {toast && (
        <div className="toast">
          <Zap size={14} fill="white" /> {toast}
        </div>
      )}
    </div>
  );
}

export default App;
