'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../components/ui/Toast';
import { BatchPRDEditor } from '../components/editor/BatchPRDEditor';
import { AnimeButton, AnimeIconButton } from '../components/theme/AnimeButton';
import { AnimeCard, AnimeStatsCard } from '../components/theme/AnimeCard';
import { CharacterAvatar, WorkerManagerDuo, ModelBadge as AnimeModelBadge } from '../components/theme/CharacterAvatar';
import { ModelSwitcher } from '../components/theme/ModelSwitcher';
import { useSoundEffect } from '../lib/sounds/useSoundEffect';
import type { ModelType, StatusType } from '../lib/theme/anime-colors';
import { QuickAddTaskButton } from '../components/QuickAddTask';

interface WorkerStatus {
  status: 'running' | 'stopped';
  pid: string | null;
  iteration: number;
  currentPrd: string | null;
  model: string;
}

interface ManagerStatus {
  status: 'running' | 'stopped';
  pid: string | null;
  reviews: number;
  model: string;
}

interface PrdStatus {
  total: number;
  completed: number;
  list: string[];
  completedList: string[];
}

interface SkillsStatus {
  count: number;
  list: string[];
}

interface ClaudeManager {
  path: string;
  name: string;
  worker: WorkerStatus;
  manager: ManagerStatus;
  prds: PrdStatus;
  skills: SkillsStatus;
  recentLogs: string[];
  config?: any;
}

interface StatusResponse {
  timestamp: string;
  managers: ClaudeManager[];
}

function AnimeStatusBadge({ status }: { status: 'running' | 'stopped' }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
      status === 'running'
        ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/30'
        : 'bg-gradient-to-r from-red-400 to-rose-500 text-white shadow-lg shadow-red-500/30'
    }`}>
      <span className={`w-2 h-2 mr-2 rounded-full ${
        status === 'running' ? 'bg-white animate-pulse' : 'bg-white/60'
      }`} />
      {status === 'running' ? '⚡ Running' : '💤 Stopped'}
    </span>
  );
}

function AnimeProgressBar({ completed, total, gradient = 'from-pink-500 to-purple-600' }: { completed: number; total: number; gradient?: string }) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
      <div
        className={`bg-gradient-to-r ${gradient} h-3 rounded-full transition-all duration-500 relative`}
        style={{ width: `${percentage}%` }}
      >
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[anime-shine_2s_linear_infinite]" />
      </div>
    </div>
  );
}

function ManagerCard({
  manager,
  onControl,
  onPlan,
  onGeneratePRD,
  onEditPRD
}: {
  manager: ClaudeManager;
  onControl: (action: string, path: string, config?: any) => Promise<void>;
  onPlan: (instancePath: string) => void;
  onGeneratePRD: (instancePath: string) => void;
  onEditPRD: (instancePath: string, prdFile: string) => void;
}) {
  const [showLogs, setShowLogs] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [controlling, setControlling] = useState(false);
  const [showBatchEditor, setShowBatchEditor] = useState(false);
  const [showModelSwitcher, setShowModelSwitcher] = useState(false);
  const { play } = useSoundEffect();

  const handleControl = async (action: string) => {
    setControlling(true);
    play('start');
    try {
      await onControl(action, manager.path, manager.config);
      play('success');
    } catch {
      play('error');
    } finally {
      setControlling(false);
    }
  };

  const handlePlan = () => {
    play('click');
    onPlan(manager.path);
  };

  const handleGeneratePRD = () => {
    play('click');
    onGeneratePRD(manager.path);
  };

  const isRunning = manager.worker.status === 'running' || manager.manager.status === 'running';

  // Convert model string to ModelType
  const workerModel = (manager.worker.model as ModelType) || 'sonnet';
  const managerModel = (manager.manager.model as ModelType) || 'opus';

  // Determine status for avatars
  const workerStatus: StatusType = manager.worker.status === 'running'
    ? (manager.worker.currentPrd ? 'working' : 'idle')
    : 'idle';
  const managerStatus: StatusType = manager.manager.status === 'running'
    ? 'reviewing'
    : 'idle';

  return (
    <AnimeCard
      title={manager.name}
      subtitle={manager.path}
      icon="🎮"
      gradient="cosmic"
      className="mb-6"
      glow={isRunning}
      badge={
        <div className="flex gap-1">
          <AnimeStatusBadge status={manager.worker.status} />
        </div>
      }
    >
      {/* Character Avatars & Model Info */}
      <div className="flex items-center justify-between mb-6">
        <WorkerManagerDuo
          workerModel={workerModel}
          workerStatus={workerStatus}
          managerModel={managerModel}
          managerStatus={managerStatus}
          size="sm"
        />
        <div className="flex flex-col gap-2 items-end">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Worker:</span>
            <AnimeModelBadge model={workerModel} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Manager:</span>
            <AnimeModelBadge model={managerModel} />
          </div>
          <button
            onClick={() => {
              play('click');
              setShowModelSwitcher(true);
            }}
            className="text-xs text-pink-500 hover:text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1"
          >
            ⚙️ Change Models
          </button>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {!isRunning ? (
          <AnimeButton
            onClick={() => handleControl('start')}
            disabled={controlling}
            variant="success"
            icon="▶"
            loading={controlling}
          >
            Start
          </AnimeButton>
        ) : (
          <AnimeButton
            onClick={() => handleControl('stop')}
            disabled={controlling}
            variant="danger"
            icon="⏹"
            loading={controlling}
          >
            Stop
          </AnimeButton>
        )}
        <AnimeButton
          onClick={() => handleControl('restart')}
          disabled={controlling}
          variant="accent"
          icon="🔄"
          loading={controlling}
        >
          Restart
        </AnimeButton>
        <div className="flex-1" />
        <AnimeButton
          onClick={handlePlan}
          variant="secondary"
          icon={<span>💬</span>}
        >
          Plan
        </AnimeButton>
        <AnimeButton
          onClick={handleGeneratePRD}
          variant="primary"
          icon={<span>📝</span>}
        >
          Generate PRD
        </AnimeButton>
        <QuickAddTaskButton
          instanceName={manager.name}
          onTaskAdded={() => window.location.reload()}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <AnimeStatsCard
          label="Iteration"
          value={manager.worker.iteration}
          icon="🔄"
          gradient="ocean"
        />
        <AnimeStatsCard
          label="Reviews"
          value={manager.manager.reviews}
          icon="👀"
          gradient="aurora"
        />
        <AnimeStatsCard
          label="PRDs"
          value={`${manager.prds.completed}/${manager.prds.total}`}
          icon="📋"
          gradient="sakura"
        />
        <AnimeStatsCard
          label="Skills"
          value={manager.skills.count}
          icon="⚡"
          gradient="fire"
        />
      </div>

      {/* Current PRD */}
      {manager.worker.currentPrd && (
        <div className="mb-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
            <span className="animate-pulse">🎯</span>
            <span>Currently Working On</span>
          </div>
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-4 animate-pulse">
            <span className="font-mono text-yellow-700 dark:text-yellow-300 font-bold">
              {manager.worker.currentPrd}
            </span>
          </div>
        </div>
      )}

      {/* PRD Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <span>📊</span> PRD Progress
          </span>
          <span className="text-gray-700 dark:text-gray-300 font-bold">
            {manager.prds.total > 0 ? Math.round((manager.prds.completed / manager.prds.total) * 100) : 0}%
          </span>
        </div>
        <AnimeProgressBar completed={manager.prds.completed} total={manager.prds.total} />
      </div>

      {/* PRD List */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <span>📁</span> PRD Files
          </div>
          {manager.prds.list.length > 0 && (
            <button
              onClick={() => {
                play('click');
                setShowBatchEditor(true);
              }}
              className="text-sm text-pink-500 hover:text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1"
            >
              ✏️ Batch Edit
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {manager.prds.list.map((prd) => {
            const isCompleted = manager.prds.completedList.includes(prd);
            const isCurrent = manager.worker.currentPrd === prd;
            return (
              <button
                key={prd}
                onClick={() => {
                  play('click');
                  onEditPRD(manager.path, prd);
                }}
                className={`
                  flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-mono text-left
                  transition-all duration-300 transform hover:scale-[1.02]
                  ${
                    isCompleted
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-700 dark:text-green-400 border-2 border-green-300 dark:border-green-700'
                      : isCurrent
                        ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 text-yellow-700 dark:text-yellow-400 border-2 border-yellow-300 dark:border-yellow-700 animate-pulse'
                        : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 border-2 border-gray-200 dark:border-gray-600 hover:border-pink-300 dark:hover:border-pink-700'
                  }
                `}
              >
                <span className="text-lg">{isCompleted ? '✅' : isCurrent ? '⚡' : '📄'}</span>
                <span className="truncate flex-1">{prd}</span>
                <span className="text-gray-400 hover:text-pink-500 transition-colors">✏️</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Batch Editor Modal */}
      {showBatchEditor && (
        <BatchPRDEditor
          instanceId={encodeURIComponent(manager.path)}
          prdFiles={manager.prds.list}
          onClose={() => setShowBatchEditor(false)}
        />
      )}

      {/* Model Switcher Modal */}
      {showModelSwitcher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                ⚙️ Model Configuration
              </h2>
              <AnimeIconButton
                icon="✕"
                onClick={() => setShowModelSwitcher(false)}
                variant="ghost"
                size="sm"
              />
            </div>
            <div className="p-6">
              <ModelSwitcher
                instancePath={manager.path}
                currentWorkerModel={workerModel}
                currentManagerModel={managerModel}
                onUpdate={() => {
                  setShowModelSwitcher(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Expandable Sections */}
      <div className="flex gap-2 mb-4">
        <AnimeButton
          onClick={() => {
            play('click');
            setShowLogs(!showLogs);
          }}
          variant="ghost"
          size="sm"
          icon={showLogs ? '📖' : '📕'}
        >
          {showLogs ? 'Hide Logs' : 'Show Logs'}
        </AnimeButton>
        <AnimeButton
          onClick={() => {
            play('click');
            setShowSkills(!showSkills);
          }}
          variant="ghost"
          size="sm"
          icon={showSkills ? '🌟' : '⭐'}
        >
          {showSkills ? 'Hide Skills' : `Show Skills (${manager.skills.count})`}
        </AnimeButton>
      </div>

      {/* Logs */}
      {showLogs && manager.recentLogs.length > 0 && (
        <div className="mb-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
            <span>📜</span> Recent Logs
          </div>
          <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto max-h-64 overflow-y-auto border-2 border-gray-700">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
              {manager.recentLogs.join('\n')}
            </pre>
          </div>
        </div>
      )}

      {/* Skills */}
      {showSkills && manager.skills.list.length > 0 && (
        <div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
            <span>✨</span> Generated Skills
          </div>
          <div className="flex flex-wrap gap-2">
            {manager.skills.list.map((skill) => (
              <span
                key={skill}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold border border-purple-200 dark:border-purple-700"
              >
                ⚡ {skill.replace('.md', '')}
              </span>
            ))}
          </div>
        </div>
      )}
    </AnimeCard>
  );
}

function CreateInstanceModal({ isOpen, onClose, onCreate }: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, workerModel: string, managerModel: string, maxIterations: number) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [workerModel, setWorkerModel] = useState('opus');
  const [managerModel, setManagerModel] = useState('sonnet');
  const [maxIterations, setMaxIterations] = useState(999999);
  const [creating, setCreating] = useState(false);
  const { play } = useSoundEffect();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    play('start');
    try {
      await onCreate(name, workerModel, managerModel, maxIterations);
      play('success');
      setName('');
      onClose();
    } catch {
      play('error');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  const modelOptions = [
    { id: 'opus', name: 'Opus', emoji: '👑', description: 'Most powerful' },
    { id: 'sonnet', name: 'Sonnet', emoji: '⚡', description: 'Balanced' },
    { id: 'haiku', name: 'Haiku', emoji: '🚀', description: 'Fastest' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span>✨</span>
            <span>Create New Instance</span>
          </h2>
          <p className="text-white/80 text-sm mt-1">Configure your new Claude Manager instance</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Instance Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              📝 Instance Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-pink-500 dark:focus:border-pink-500 focus:outline-none transition-colors"
              placeholder="my-awesome-project"
              required
            />
          </div>

          {/* Worker Model */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              👷 Worker Model
            </label>
            <div className="grid grid-cols-3 gap-2">
              {modelOptions.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    play('click');
                    setWorkerModel(model.id);
                  }}
                  className={`
                    p-3 rounded-xl border-2 transition-all text-center
                    ${workerModel === model.id
                      ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-pink-300'}
                  `}
                >
                  <div className="text-2xl">{model.emoji}</div>
                  <div className="text-sm font-bold">{model.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Manager Model */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              👔 Manager Model
            </label>
            <div className="grid grid-cols-3 gap-2">
              {modelOptions.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    play('click');
                    setManagerModel(model.id);
                  }}
                  className={`
                    p-3 rounded-xl border-2 transition-all text-center
                    ${managerModel === model.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'}
                  `}
                >
                  <div className="text-2xl">{model.emoji}</div>
                  <div className="text-sm font-bold">{model.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Max Iterations */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              🔄 Max Iterations
            </label>
            <input
              type="number"
              value={maxIterations}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setMaxIterations(isNaN(val) ? 50 : val);
              }}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-pink-500 dark:focus:border-pink-500 focus:outline-none transition-colors"
              min="1"
              max="10000"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <AnimeButton
              type="submit"
              disabled={creating}
              variant="primary"
              fullWidth
              loading={creating}
              icon="✨"
            >
              {creating ? 'Creating...' : 'Create Instance'}
            </AnimeButton>
            <AnimeButton
              onClick={() => {
                play('click');
                onClose();
              }}
              variant="ghost"
            >
              Cancel
            </AnimeButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const toast = useToast();
  const { play } = useSoundEffect();
  const [data, setData] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [apiUsage, setApiUsage] = useState<any>(null);

  const handlePlan = (instancePath: string) => {
    const encodedPath = encodeURIComponent(instancePath);
    router.push(`/planning/${encodedPath}`);
  };

  const handleGeneratePRD = (instancePath: string) => {
    const encodedPath = encodeURIComponent(instancePath);
    router.push(`/prd-generator/${encodedPath}`);
  };

  const handleEditPRD = (instancePath: string, prdFile: string) => {
    const encodedPath = encodeURIComponent(instancePath);
    const encodedFile = encodeURIComponent(prdFile);
    router.push(`/prd-editor/${encodedPath}/${encodedFile}`);
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error('Failed to fetch status');
      const json = await res.json();
      setData(json);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchApiUsage = async () => {
    try {
      const res = await fetch('/api/usage');
      if (res.ok) {
        const json = await res.json();
        setApiUsage(json);
      }
    } catch (err) {
      // Silently fail - usage display is optional
    }
  };

  const handleControl = async (action: string, instancePath: string, config?: any) => {
    try {
      const res = await fetch('/api/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          instancePath,
          workerModel: config?.workerModel || 'sonnet',
          managerModel: config?.managerModel || 'opus',
          maxIterations: config?.maxIterations || 50,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Control action failed');
      }

      toast.success('Action completed', `Successfully executed ${action} on instance`);
      play('success');
      setTimeout(fetchStatus, 2000);
    } catch (err) {
      console.error('Control error:', err);
      toast.error('Action failed', err instanceof Error ? err.message : String(err));
      play('error');
    }
  };

  const handleCreateInstance = async (name: string, workerModel: string, managerModel: string, maxIterations: number) => {
    try {
      const res = await fetch('/api/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, workerModel, managerModel, maxIterations }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create instance');
      }

      await fetchStatus();
      toast.success('Instance created', `Instance "${name}" has been created successfully`);
      play('success');
    } catch (err) {
      console.error('Create instance error:', err);
      toast.error('Failed to create instance', err instanceof Error ? err.message : String(err));
      play('error');
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchApiUsage();
    const interval = setInterval(fetchStatus, 5000);
    const usageInterval = setInterval(fetchApiUsage, 30000); // Check API usage every 30s
    return () => {
      clearInterval(interval);
      clearInterval(usageInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-lg border-b border-pink-200 dark:border-pink-900/30">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent flex items-center gap-3">
                <span className="text-5xl">🎮</span>
                <span>Claude Manager Dashboard</span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-14">
                ✨ Monitor and control your autonomous PRD implementation systems
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* API Usage Display */}
              {apiUsage && (
                <div className="text-right bg-white/50 dark:bg-gray-700/50 rounded-xl px-4 py-2 border border-green-200 dark:border-green-900/30">
                  <div className="text-sm font-bold text-green-600 dark:text-green-400 flex items-center gap-2">
                    <span>🤖</span>
                    <span>Claude API</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {apiUsage.status === 'active' ? (
                      <span className="text-green-500">✓ Connected</span>
                    ) : apiUsage.status === 'rate_limited' ? (
                      <span className="text-orange-500">⚠ Rate Limited</span>
                    ) : (
                      <span className="text-red-500">✗ Error</span>
                    )}
                  </div>
                </div>
              )}

              <AnimeButton
                onClick={() => {
                  play('click');
                  router.push('/infrastructure');
                }}
                variant="secondary"
                icon="☁"
              >
                Infrastructure
              </AnimeButton>

              <AnimeButton
                onClick={() => {
                  play('click');
                  setShowCreateModal(true);
                }}
                variant="primary"
                icon="+"
              >
                New Instance
              </AnimeButton>
              <div className="text-right bg-white/50 dark:bg-gray-700/50 rounded-xl px-4 py-2 border border-pink-200 dark:border-pink-900/30">
                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <span className="animate-pulse">🔄</span> Auto-refresh: 5s
                </div>
                {lastUpdate && (
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    Last: {lastUpdate.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex flex-col justify-center items-center h-64 gap-4">
            <div className="w-16 h-16 relative">
              <div className="absolute inset-0 rounded-full border-4 border-pink-200 dark:border-pink-900/30" />
              <div className="absolute inset-0 rounded-full border-4 border-pink-500 border-t-transparent animate-spin" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 animate-pulse">Loading instances...</p>
          </div>
        )}

        {error && (
          <div className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-2 border-red-300 dark:border-red-700 rounded-2xl p-6 mb-6">
            <p className="text-red-700 dark:text-red-400 flex items-center gap-2">
              <span className="text-2xl">❌</span>
              <span className="font-bold">Error:</span> {error}
            </p>
          </div>
        )}

        {data && data.managers.length === 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <p className="text-yellow-700 dark:text-yellow-400 text-xl font-bold">
              No Claude Manager instances found
            </p>
            <p className="text-yellow-600 dark:text-yellow-500 text-sm mt-2">
              Click "New Instance" to create your first one and start building amazing things!
            </p>
            <AnimeButton
              onClick={() => {
                play('click');
                setShowCreateModal(true);
              }}
              variant="accent"
              className="mt-6"
              icon="✨"
            >
              Create Your First Instance
            </AnimeButton>
          </div>
        )}

        {data && data.managers.map((manager) => (
          <ManagerCard
            key={manager.path}
            manager={manager}
            onControl={handleControl}
            onPlan={handlePlan}
            onGeneratePRD={handleGeneratePRD}
            onEditPRD={handleEditPRD}
          />
        ))}
      </main>

      {/* Footer */}
      <footer className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-t border-pink-200 dark:border-pink-900/30 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
            <span>🎮</span>
            <span>Claude Manager Dashboard</span>
            <span>•</span>
            <span className="font-bold text-pink-500">
              {data?.managers.length || 0} instance(s)
            </span>
            <span>•</span>
            <span className="animate-pulse">✨ Powered by Anime Energy ✨</span>
          </p>
        </div>
      </footer>

      {/* Create Instance Modal */}
      <CreateInstanceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateInstance}
      />
    </div>
  );
}
