'use client';

import { useState } from 'react';

interface QuickAddTaskProps {
  instanceName: string;
  onTaskAdded?: () => void;
}

export function QuickAddTaskButton({ instanceName, onTaskAdded }: QuickAddTaskProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [quickInput, setQuickInput] = useState('');
  const [taskType, setTaskType] = useState<'feature' | 'bug' | 'task'>('feature');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/instances/${encodeURIComponent(instanceName)}/tasks/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quickInput, type: taskType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add task');
      }

      setSuccess(true);
      setQuickInput('');

      // Close modal after 1 second
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        onTaskAdded?.();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Add Task Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
      >
        <span>➕</span>
        <span>Add Task</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Quick Add Task</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Task Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'feature' as const, label: '✨ Feature', color: 'blue' },
                    { value: 'bug' as const, label: '🐛 Bug Fix', color: 'red' },
                    { value: 'task' as const, label: '📋 Task', color: 'gray' },
                  ].map(({ value, label, color }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTaskType(value)}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                        taskType === value
                          ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-900/20`
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Input */}
              <div>
                <label htmlFor="quickInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What needs to be done?
                </label>
                <textarea
                  id="quickInput"
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  placeholder="E.g., Add dark mode support to the settings page..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                  required
                  disabled={isSubmitting}
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  💡 Just write a quick bullet point - AI will expand it into a full task with description and acceptance criteria
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-green-700 dark:text-green-400 text-sm">
                  ✓ Task added successfully!
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting || !quickInput.trim()}
                >
                  {isSubmitting ? 'Adding...' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
