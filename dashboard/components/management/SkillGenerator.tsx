'use client';

import { useState, useCallback } from 'react';
import { useToast } from '../ui/Toast';

interface SkillGeneratorProps {
  instanceId: string;
  onSkillGenerated: (skill: GeneratedSkill) => void;
  onClose: () => void;
}

interface GeneratedSkill {
  content: string;
  title: string;
  category: string;
  suggestedFilename: string;
}

// Skill categories with descriptions
const SKILL_CATEGORIES = [
  { value: '', label: 'Auto-detect', description: 'Let AI choose the category' },
  { value: 'React', label: 'React', description: 'Hooks, components, state management' },
  { value: 'API Design', label: 'API Design', description: 'REST, GraphQL, endpoints' },
  { value: 'Database', label: 'Database', description: 'Queries, ORM, optimization' },
  { value: 'Testing', label: 'Testing', description: 'Unit, integration, E2E tests' },
  { value: 'Performance', label: 'Performance', description: 'Speed, memory, optimization' },
  { value: 'Security', label: 'Security', description: 'XSS, CSRF, validation' },
  { value: 'TypeScript', label: 'TypeScript', description: 'Types, generics, patterns' },
  { value: 'Error Handling', label: 'Error Handling', description: 'Exceptions, recovery, logging' },
  { value: 'Documentation', label: 'Documentation', description: 'Comments, README, guides' },
  { value: 'DevOps', label: 'DevOps', description: 'CI/CD, deployment, containers' },
  { value: 'General', label: 'General', description: 'General best practices' },
];

// Example prompts for inspiration
const EXAMPLE_PROMPTS = [
  'React hooks optimization to prevent unnecessary re-renders',
  'API rate limiting and retry patterns',
  'Database query optimization for large datasets',
  'Form validation best practices with error handling',
  'Secure handling of user authentication tokens',
  'TypeScript strict mode patterns and type safety',
];

export function SkillGenerator({
  instanceId,
  onSkillGenerated,
  onClose,
}: SkillGeneratorProps) {
  const { showToast } = useToast();
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewSkill, setPreviewSkill] = useState<GeneratedSkill | null>(null);
  const [step, setStep] = useState<'input' | 'preview'>('input');

  // Generate skill
  const handleGenerate = useCallback(async () => {
    if (!description.trim()) {
      showToast('error', 'Please enter a description of the skill you want to generate');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/skills/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId,
          description: description.trim(),
          category: category || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate skill');
      }

      const data = await response.json();
      setPreviewSkill({
        content: data.skill,
        title: data.title,
        category: data.category,
        suggestedFilename: data.suggestedFilename,
      });
      setStep('preview');
      showToast('success', 'Skill generated successfully');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to generate skill');
    } finally {
      setIsGenerating(false);
    }
  }, [instanceId, description, category, showToast]);

  // Save skill
  const handleSave = useCallback(() => {
    if (previewSkill) {
      onSkillGenerated(previewSkill);
    }
  }, [previewSkill, onSkillGenerated]);

  // Regenerate skill
  const handleRegenerate = useCallback(() => {
    setStep('input');
    setPreviewSkill(null);
  }, []);

  // Use example prompt
  const handleExampleClick = useCallback((example: string) => {
    setDescription(example);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Generate Skill with AI
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {step === 'input' ? 'Describe what skill you need' : 'Review and save your skill'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'input' ? (
            <div className="space-y-6">
              {/* Description input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Describe Your Skill
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-32 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                    focus:ring-2 focus:ring-purple-500 focus:border-transparent
                    resize-none placeholder-gray-400"
                  placeholder="Example: A skill for optimizing React hooks to prevent unnecessary re-renders, including useMemo, useCallback, and dependency array best practices..."
                  disabled={isGenerating}
                />
                <div className="flex justify-between mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {description.length} / 5000 characters
                  </p>
                </div>
              </div>

              {/* Category selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category (optional)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {SKILL_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      disabled={isGenerating}
                      className={`p-3 rounded-lg border text-left transition-colors
                        ${category === cat.value
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                        }`}
                    >
                      <div className="font-medium text-sm">{cat.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {cat.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Example prompts */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Example prompts
                </label>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROMPTS.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleClick(example)}
                      disabled={isGenerating}
                      className="px-3 py-1.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700
                        text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600
                        transition-colors truncate max-w-[200px]"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Skill metadata */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {previewSkill?.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 text-xs rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                      {previewSkill?.category}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {previewSkill?.suggestedFilename}.md
                    </span>
                  </div>
                </div>
              </div>

              {/* Skill preview */}
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Preview
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {previewSkill?.content.length} characters
                  </span>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 dark:text-gray-300">
                    {previewSkill?.content}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {step === 'input' ? (
            <>
              <button
                onClick={onClose}
                disabled={isGenerating}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !description.trim()}
                className="px-6 py-2 bg-purple-600 text-white font-medium rounded-lg
                  hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                  transition-colors flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <LoadingSpinner />
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    Generate Skill
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleRegenerate}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg
                    hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Skill
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Loading spinner component
function LoadingSpinner() {
  return (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
