'use client';

import { useState, useCallback } from 'react';
import { PRDPreview } from './PRDPreview';
import { PRDEditor } from './PRDEditor';
import { TemplateSelector } from './TemplateSelector';
import { useToast } from '../ui/Toast';

interface PRDGeneratorProps {
  instanceId: string;
  instanceName: string;
  instancePath: string;
  existingPrds?: string[];
  technologies?: string[];
  onPRDAdded?: (filename: string) => void;
}

type Step = 'prompt' | 'preview' | 'queue';

export function PRDGenerator({
  instanceId,
  instanceName,
  instancePath,
  existingPrds = [],
  technologies = [],
  onPRDAdded,
}: PRDGeneratorProps) {
  const [currentStep, setCurrentStep] = useState<Step>('prompt');
  const [prompt, setPrompt] = useState('');
  const [template, setTemplate] = useState<string | null>(null);
  const [generatedPRD, setGeneratedPRD] = useState<string>('');
  const [prdTitle, setPrdTitle] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [priority, setPriority] = useState<number>(2); // 1=High, 2=Medium, 3=Low
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isAddingToQueue, setIsAddingToQueue] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const { showToast } = useToast();

  // Generate PRD from prompt
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      showToast('error', 'Please enter a description of the feature');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/prd/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId,
          instancePath,
          prompt: prompt.trim(),
          template,
          context: {
            existingPRDs: existingPrds,
            technologies,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate PRD');
      }

      const data = await response.json();
      setGeneratedPRD(data.prd);
      setPrdTitle(data.title);
      setSuggestions(data.suggestions || []);
      setCurrentStep('preview');
      showToast('success', 'PRD generated successfully');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to generate PRD');
    } finally {
      setIsGenerating(false);
    }
  }, [instanceId, instancePath, prompt, template, existingPrds, technologies, showToast]);

  // Refine PRD
  const handleRefine = useCallback(async () => {
    if (!refinementPrompt.trim()) {
      showToast('error', 'Please enter refinement instructions');
      return;
    }

    setIsRefining(true);
    try {
      const response = await fetch('/api/prd/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId,
          instancePath,
          currentPRD: generatedPRD,
          refinementPrompt: refinementPrompt.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refine PRD');
      }

      const data = await response.json();
      setGeneratedPRD(data.updatedPRD);
      setPrdTitle(data.title);
      setRefinementPrompt('');
      showToast('success', 'PRD refined successfully');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to refine PRD');
    } finally {
      setIsRefining(false);
    }
  }, [instanceId, instancePath, generatedPRD, refinementPrompt, showToast]);

  // Add to queue
  const handleAddToQueue = useCallback(async () => {
    if (!generatedPRD) {
      showToast('error', 'No PRD to add');
      return;
    }

    setIsAddingToQueue(true);
    try {
      const response = await fetch('/api/prd/add-to-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId,
          instancePath,
          prdContent: generatedPRD,
          title: prdTitle,
          priority,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add PRD to queue');
      }

      const data = await response.json();
      showToast('success', `PRD added to queue: ${data.filename}`);

      // Call callback if provided
      if (onPRDAdded) {
        onPRDAdded(data.filename);
      }

      // Reset form
      handleReset();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to add to queue');
    } finally {
      setIsAddingToQueue(false);
    }
  }, [instanceId, instancePath, generatedPRD, prdTitle, priority, onPRDAdded, showToast]);

  // Reset form
  const handleReset = useCallback(() => {
    setCurrentStep('prompt');
    setPrompt('');
    setTemplate(null);
    setGeneratedPRD('');
    setPrdTitle('');
    setSuggestions([]);
    setRefinementPrompt('');
    setPriority(2);
  }, []);

  // Handle PRD edit
  const handlePRDEdit = useCallback((newContent: string) => {
    setGeneratedPRD(newContent);
    // Update title if it changed
    const titleMatch = newContent.match(/^#\s+PRD:\s*(.+)$/m);
    if (titleMatch) {
      setPrdTitle(titleMatch[1].trim());
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Generate PRD</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{instanceName}</p>
            </div>
          </div>

          {/* Template selector */}
          <TemplateSelector
            selectedTemplate={template}
            onSelect={setTemplate}
            disabled={currentStep !== 'prompt'}
          />
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mt-4">
          <StepIndicator step={1} label="Describe" active={currentStep === 'prompt'} completed={currentStep !== 'prompt'} />
          <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700" />
          <StepIndicator step={2} label="Review" active={currentStep === 'preview'} completed={currentStep === 'queue'} />
          <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700" />
          <StepIndicator step={3} label="Queue" active={currentStep === 'queue'} completed={false} />
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        {/* Step 1: Prompt input */}
        {currentStep === 'prompt' && (
          <div className="max-w-2xl mx-auto">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Describe Your Feature
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-40 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                focus:ring-2 focus:ring-green-500 focus:border-transparent
                resize-none"
              placeholder="Describe what you want to build. Be as specific as possible about features, requirements, and constraints..."
              disabled={isGenerating}
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {prompt.length} characters
            </p>

            {/* Template help text */}
            {template && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  <strong>Template:</strong> {template.replace('_', ' ')} - The PRD will focus on aspects relevant to this type of work.
                </p>
              </div>
            )}

            {/* Example prompts */}
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Example prompts:</p>
              <div className="grid gap-2">
                <ExamplePrompt
                  onClick={() => setPrompt("Add user authentication with email/password login. Include password reset and 2FA support.")}
                >
                  Add user authentication with email/password login. Include password reset and 2FA support.
                </ExamplePrompt>
                <ExamplePrompt
                  onClick={() => setPrompt("Create a dashboard that shows real-time metrics for API usage, including charts for requests per minute and error rates.")}
                >
                  Create a dashboard for real-time API metrics with charts for requests and error rates.
                </ExamplePrompt>
                <ExamplePrompt
                  onClick={() => setPrompt("Build a notification system that supports email, SMS, and push notifications with user preferences.")}
                >
                  Build a notification system with email, SMS, and push notifications.
                </ExamplePrompt>
              </div>
            </div>

            {/* Generate button */}
            <div className="mt-6">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full px-4 py-3 bg-green-600 text-white font-medium rounded-lg
                  hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                  transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <LoadingSpinner />
                    Generating PRD...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    Generate PRD
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Preview and refine */}
        {currentStep === 'preview' && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* PRD Preview/Editor */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Generated PRD</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentStep('prompt')}
                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    Back
                  </button>
                </div>
              </div>
              <PRDEditor
                content={generatedPRD}
                onChange={handlePRDEdit}
              />
            </div>

            {/* Refinement panel */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="sticky top-0 space-y-4">
                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">Suggestions</h4>
                    <ul className="space-y-2">
                      {suggestions.map((suggestion, index) => (
                        <li key={index}>
                          <button
                            onClick={() => setRefinementPrompt(suggestion)}
                            className="text-sm text-yellow-700 dark:text-yellow-300 hover:underline text-left"
                          >
                            • {suggestion}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Refinement input */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Refine PRD</h4>
                  <textarea
                    value={refinementPrompt}
                    onChange={(e) => setRefinementPrompt(e.target.value)}
                    className="w-full h-24 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                      focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    placeholder="Add more detail about session management..."
                    disabled={isRefining}
                  />
                  <button
                    onClick={handleRefine}
                    disabled={isRefining || !refinementPrompt.trim()}
                    className="mt-2 w-full px-3 py-2 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200
                      rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed
                      transition-colors flex items-center justify-center gap-2"
                  >
                    {isRefining ? (
                      <>
                        <LoadingSpinner />
                        Refining...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refine
                      </>
                    )}
                  </button>
                </div>

                {/* Priority and queue */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Add to Queue</h4>

                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                      focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value={1}>High Priority</option>
                    <option value={2}>Medium Priority</option>
                    <option value={3}>Low Priority</option>
                  </select>

                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoStart}
                      onChange={(e) => setAutoStart(e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Auto-start instance after adding</span>
                  </label>

                  <button
                    onClick={handleAddToQueue}
                    disabled={isAddingToQueue}
                    className="mt-4 w-full px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg
                      hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                      transition-colors flex items-center justify-center gap-2"
                  >
                    {isAddingToQueue ? (
                      <>
                        <LoadingSpinner />
                        Adding...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add to Queue
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Step indicator component
function StepIndicator({ step, label, active, completed }: { step: number; label: string; active: boolean; completed: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
        ${active ? 'bg-green-600 text-white' : completed ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}
      >
        {completed ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : step}
      </div>
      <span className={`text-sm hidden sm:block ${active ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
        {label}
      </span>
    </div>
  );
}

// Example prompt button
function ExamplePrompt({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left text-sm p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400
        hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
    >
      {children}
    </button>
  );
}

// Loading spinner
function LoadingSpinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
