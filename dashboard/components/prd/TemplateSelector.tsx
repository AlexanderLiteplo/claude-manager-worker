'use client';

import { useState, useRef, useEffect } from 'react';

interface TemplateSelectorProps {
  selectedTemplate: string | null;
  onSelect: (template: string | null) => void;
  disabled?: boolean;
}

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const TEMPLATES: Template[] = [
  {
    id: 'feature',
    name: 'Feature Addition',
    description: 'New feature implementation',
    icon: <FeatureIcon />,
  },
  {
    id: 'bug_fix',
    name: 'Bug Fix',
    description: 'Bug investigation and fix',
    icon: <BugIcon />,
  },
  {
    id: 'refactoring',
    name: 'Refactoring',
    description: 'Code quality improvement',
    icon: <RefactorIcon />,
  },
  {
    id: 'api_integration',
    name: 'API Integration',
    description: 'External service integration',
    icon: <ApiIcon />,
  },
  {
    id: 'testing',
    name: 'Testing',
    description: 'Test suite creation',
    icon: <TestIcon />,
  },
  {
    id: 'documentation',
    name: 'Documentation',
    description: 'Documentation writing',
    icon: <DocIcon />,
  },
  {
    id: 'performance',
    name: 'Performance',
    description: 'Optimization work',
    icon: <PerformanceIcon />,
  },
];

export function TemplateSelector({ selectedTemplate, onSelect, disabled = false }: TemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedTemplateData = TEMPLATES.find(t => t.id === selectedTemplate);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
          ${disabled
            ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-50'
            : 'border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-500 bg-white dark:bg-gray-800'
          }
          ${isOpen ? 'border-green-500 ring-2 ring-green-500/20' : ''}`}
      >
        {selectedTemplateData ? (
          <>
            <span className="text-green-600 dark:text-green-400">{selectedTemplateData.icon}</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedTemplateData.name}</span>
          </>
        ) : (
          <>
            <TemplateIcon />
            <span className="text-sm text-gray-500 dark:text-gray-400">Template</span>
          </>
        )}
        <ChevronDownIcon className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
          {/* Clear selection option */}
          <button
            onClick={() => {
              onSelect(null);
              setIsOpen(false);
            }}
            className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
              ${!selectedTemplate ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-gray-400">
                <TemplateIcon />
              </span>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No Template</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">General PRD format</p>
              </div>
            </div>
          </button>

          <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />

          {/* Template options */}
          {TEMPLATES.map(template => (
            <button
              key={template.id}
              onClick={() => {
                onSelect(template.id);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                ${selectedTemplate === template.id ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className={selectedTemplate === template.id ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
                  {template.icon}
                </span>
                <div>
                  <p className={`text-sm font-medium ${selectedTemplate === template.id
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {template.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{template.description}</p>
                </div>
                {selectedTemplate === template.id && (
                  <span className="ml-auto text-green-600 dark:text-green-400">
                    <CheckIcon />
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Icons
function TemplateIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  );
}

function ChevronDownIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function FeatureIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function BugIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function RefactorIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function ApiIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function TestIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function PerformanceIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}
