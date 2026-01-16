'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '../ui/Toast';

interface Skill {
  filename: string;
  title: string;
  category: string;
  tags?: string[];
  content?: string;
}

interface Instance {
  name: string;
  path: string;
  skillsCount: number;
}

interface ImportExportProps {
  instanceId: string;
  mode: 'import' | 'export';
  onClose: () => void;
  onComplete: () => void;
  currentSkills?: Skill[];
}

export function ImportExport({
  instanceId,
  mode,
  onClose,
  onComplete,
  currentSkills = [],
}: ImportExportProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [loading, setLoading] = useState(false);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string>('');
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [importSource, setImportSource] = useState<'instance' | 'file'>('instance');
  const [fileContent, setFileContent] = useState<any>(null);
  const [fileName, setFileName] = useState<string>('');

  // Decode instance ID for display
  const decodedInstanceId = decodeURIComponent(instanceId);

  // Fetch available instances for import
  const fetchInstances = useCallback(async () => {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();

      if (data.managers) {
        const instanceList: Instance[] = data.managers.map((m: any) => ({
          name: m.path.split('/').pop() || m.path,
          path: m.path,
          skillsCount: m.skills || 0,
        })).filter((i: Instance) => i.path !== decodedInstanceId);

        setInstances(instanceList);
      }
    } catch (err) {
      console.error('Failed to fetch instances:', err);
    }
  }, [decodedInstanceId]);

  // Fetch skills from selected instance
  const fetchInstanceSkills = useCallback(async (instancePath: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/skills/${encodeURIComponent(instancePath)}`);
      const data = await response.json();

      if (data.success) {
        setAvailableSkills(data.skills);
        // Pre-select all skills by default
        setSelectedSkills(new Set(data.skills.map((s: Skill) => s.filename)));
      }
    } catch (err) {
      console.error('Failed to fetch skills:', err);
      toast.error('Error', 'Failed to load skills from instance');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initialize
  useEffect(() => {
    if (mode === 'import') {
      fetchInstances();
    } else {
      // For export, show current skills
      setAvailableSkills(currentSkills);
      setSelectedSkills(new Set(currentSkills.map(s => s.filename)));
    }
  }, [mode, fetchInstances, currentSkills]);

  // Fetch skills when instance is selected
  useEffect(() => {
    if (mode === 'import' && selectedInstance && importSource === 'instance') {
      fetchInstanceSkills(selectedInstance);
    }
  }, [mode, selectedInstance, importSource, fetchInstanceSkills]);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.skills || !Array.isArray(data.skills)) {
        throw new Error('Invalid file format');
      }

      setFileContent(data);
      setAvailableSkills(data.skills);
      setSelectedSkills(new Set(data.skills.map((s: Skill) => s.filename)));
    } catch (err) {
      toast.error('Invalid file', 'Please upload a valid skills export JSON file');
      setFileContent(null);
      setFileName('');
    }
  };

  // Toggle skill selection
  const toggleSkill = (filename: string) => {
    const newSelected = new Set(selectedSkills);
    if (newSelected.has(filename)) {
      newSelected.delete(filename);
    } else {
      newSelected.add(filename);
    }
    setSelectedSkills(newSelected);
  };

  // Select/deselect all
  const toggleAll = () => {
    if (selectedSkills.size === availableSkills.length) {
      setSelectedSkills(new Set());
    } else {
      setSelectedSkills(new Set(availableSkills.map(s => s.filename)));
    }
  };

  // Handle import
  const handleImport = async () => {
    if (selectedSkills.size === 0) {
      toast.error('No skills selected', 'Please select at least one skill to import');
      return;
    }

    setLoading(true);

    try {
      let requestBody: any;

      if (importSource === 'instance') {
        requestBody = {
          instanceId,
          source: selectedInstance,
          sourceType: 'instance',
          skills: Array.from(selectedSkills),
        };
      } else {
        // Import from file
        const skillsToImport = fileContent.skills.filter((s: Skill) =>
          selectedSkills.has(s.filename)
        );
        requestBody = {
          instanceId,
          sourceType: 'json',
          skills: skillsToImport,
        };
      }

      const response = await fetch('/api/skills/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Import failed');
      }

      const { result } = data;

      if (result.imported > 0) {
        toast.success(
          'Import complete',
          `Imported ${result.imported} skill${result.imported !== 1 ? 's' : ''}${result.skipped > 0 ? `, ${result.skipped} skipped` : ''}`
        );
        onComplete();
        onClose();
      } else if (result.skipped > 0) {
        toast.error(
          'Import skipped',
          `All ${result.skipped} skills already exist or had errors`
        );
      }
    } catch (err) {
      toast.error('Import failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    if (selectedSkills.size === 0) {
      toast.error('No skills selected', 'Please select at least one skill to export');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/skills/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId,
          skillFiles: Array.from(selectedSkills),
          format: 'json',
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Export failed');
      }

      // Create downloadable file
      const exportData = data.data;
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);

      const instanceName = decodedInstanceId.split('/').pop() || 'instance';
      const filename = `skills_${instanceName}_${new Date().toISOString().split('T')[0]}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(
        'Export complete',
        `Exported ${exportData.skillCount} skill${exportData.skillCount !== 1 ? 's' : ''}`
      );
      onClose();
    } catch (err) {
      toast.error('Export failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {mode === 'import' ? (
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
            ) : (
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
            )}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {mode === 'import' ? 'Import Skills' : 'Export Skills'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {mode === 'import' && (
            <>
              {/* Import Source Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Import Source
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setImportSource('instance');
                      setAvailableSkills([]);
                      setSelectedSkills(new Set());
                    }}
                    className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                      importSource === 'instance'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span className="font-medium text-gray-900 dark:text-white">From Instance</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Import from another manager instance
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      setImportSource('file');
                      setAvailableSkills([]);
                      setSelectedSkills(new Set());
                      setSelectedInstance('');
                    }}
                    className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                      importSource === 'file'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="font-medium text-gray-900 dark:text-white">From File</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Import from a JSON export file
                    </p>
                  </button>
                </div>
              </div>

              {/* Instance Selector */}
              {importSource === 'instance' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Instance
                  </label>
                  <select
                    value={selectedInstance}
                    onChange={(e) => setSelectedInstance(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Choose an instance...</option>
                    {instances.map((instance) => (
                      <option key={instance.path} value={instance.path}>
                        {instance.name} ({instance.skillsCount} skills)
                      </option>
                    ))}
                  </select>
                  {instances.length === 0 && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      No other instances available
                    </p>
                  )}
                </div>
              )}

              {/* File Upload */}
              {importSource === 'file' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload File
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                  >
                    {fileName ? (
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-900 dark:text-white font-medium">{fileName}</span>
                      </div>
                    ) : (
                      <>
                        <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-gray-600 dark:text-gray-400">
                          Click to upload a skills export file
                        </p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                          JSON format only
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}
            </>
          )}

          {/* Skills List */}
          {availableSkills.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {mode === 'import' ? 'Available Skills' : 'Skills to Export'} ({selectedSkills.size}/{availableSkills.length} selected)
                </label>
                <button
                  onClick={toggleAll}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {selectedSkills.size === availableSkills.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-64 overflow-auto">
                {availableSkills.map((skill) => (
                  <label
                    key={skill.filename}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSkills.has(skill.filename)}
                      onChange={() => toggleSkill(skill.filename)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {skill.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {skill.filename}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      {skill.category}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}

          {/* Empty state */}
          {!loading && availableSkills.length === 0 && (
            (mode === 'import' && (importSource === 'file' ? !fileContent : !selectedInstance)) ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {importSource === 'instance'
                  ? 'Select an instance to see available skills'
                  : 'Upload a file to see available skills'}
              </div>
            ) : mode === 'export' ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No skills available to export
              </div>
            ) : null
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={mode === 'import' ? handleImport : handleExport}
            disabled={loading || selectedSkills.size === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                {mode === 'import' ? 'Importing...' : 'Exporting...'}
              </>
            ) : (
              <>
                {mode === 'import' ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                {mode === 'import' ? `Import ${selectedSkills.size} Skill${selectedSkills.size !== 1 ? 's' : ''}` : `Export ${selectedSkills.size} Skill${selectedSkills.size !== 1 ? 's' : ''}`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
