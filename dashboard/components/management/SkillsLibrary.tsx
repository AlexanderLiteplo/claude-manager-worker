'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { SkillCard } from './SkillCard';
import { SkillEditor } from './SkillEditor';
import { SkillGenerator } from './SkillGenerator';
import { ImportExport } from './ImportExport';
import { useToast } from '../ui/Toast';

interface Skill {
  filename: string;
  title: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  content: string;
}

interface SkillsLibraryProps {
  instanceId: string;
}

export function SkillsLibrary({ instanceId }: SkillsLibraryProps) {
  const toast = useToast();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Editor state
  const [showEditor, setShowEditor] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [viewingSkill, setViewingSkill] = useState<Skill | null>(null);

  // Import/Export state
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);

  // Fetch skills
  const fetchSkills = useCallback(async () => {
    try {
      const response = await fetch(`/api/skills/${instanceId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch skills');
      }

      setSkills(data.skills);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch skills');
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(skills.map(s => s.category));
    return ['all', ...Array.from(cats).sort()];
  }, [skills]);

  // Filter skills
  const filteredSkills = useMemo(() => {
    return skills.filter(skill => {
      // Category filter
      if (selectedCategory !== 'all' && skill.category !== selectedCategory) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          skill.title.toLowerCase().includes(query) ||
          skill.content.toLowerCase().includes(query) ||
          skill.tags.some(t => t.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [skills, selectedCategory, searchQuery]);

  // Create new skill
  const handleCreateSkill = async (name: string, content: string) => {
    const response = await fetch(`/api/skills/${instanceId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to create skill');
    }

    setSkills(prev => [...prev, data.skill].sort((a, b) => a.title.localeCompare(b.title)));
    setShowEditor(false);
    toast.success('Skill created', `"${data.skill.title}" has been created successfully`);
  };

  // Update skill
  const handleUpdateSkill = async (name: string, content: string) => {
    if (!editingSkill) return;

    const response = await fetch(`/api/skills/${instanceId}/${encodeURIComponent(editingSkill.filename)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to update skill');
    }

    setSkills(prev => prev.map(s =>
      s.filename === editingSkill.filename ? data.skill : s
    ));
    setEditingSkill(null);
    setShowEditor(false);
    toast.success('Skill updated', `"${data.skill.title}" has been updated successfully`);
  };

  // Delete skill
  const handleDeleteSkill = async (skill: Skill) => {
    try {
      const response = await fetch(`/api/skills/${instanceId}/${encodeURIComponent(skill.filename)}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete skill');
      }

      setSkills(prev => prev.filter(s => s.filename !== skill.filename));
      toast.success('Skill deleted', `"${skill.title}" has been deleted`);
    } catch (err) {
      toast.error('Delete failed', err instanceof Error ? err.message : 'Failed to delete skill');
    }
  };

  // View skill
  const handleViewSkill = (skill: Skill) => {
    setViewingSkill(skill);
  };

  // Edit skill
  const handleEditSkill = (skill: Skill) => {
    setEditingSkill(skill);
    setShowEditor(true);
    setViewingSkill(null);
  };

  // Close editor
  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingSkill(null);
  };

  // Handle AI-generated skill
  const handleGeneratedSkill = async (generatedSkill: {
    content: string;
    title: string;
    category: string;
    suggestedFilename: string;
  }) => {
    // Close generator and open editor with pre-filled content
    setShowGenerator(false);
    // Create skill directly using the API
    try {
      const response = await fetch(`/api/skills/${instanceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: generatedSkill.suggestedFilename,
          content: generatedSkill.content,
          category: generatedSkill.category,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save skill');
      }

      setSkills(prev => [...prev, data.skill].sort((a, b) => a.title.localeCompare(b.title)));
      toast.success('Skill created', `"${data.skill.title}" has been created from AI generation`);
    } catch (err) {
      toast.error('Save failed', err instanceof Error ? err.message : 'Failed to save generated skill');
      // If save fails, open editor with the content so user can try manually
      setEditingSkill(null);
      setShowEditor(true);
      // Store generated content in a way the editor can access
      // For now, we'll alert the user
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <p className="text-red-700 dark:text-red-400">{error}</p>
        <button
          onClick={fetchSkills}
          className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // Skill viewer modal
  if (viewingSkill) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {viewingSkill.title}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                {viewingSkill.category}
              </span>
              {viewingSkill.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleEditSkill(viewingSkill)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setViewingSkill(null)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 dark:text-gray-300">
            {viewingSkill.content}
          </pre>
        </div>
      </div>
    );
  }

  // Editor view
  if (showEditor) {
    return (
      <SkillEditor
        initialContent={editingSkill?.content || ''}
        skillName={editingSkill?.title || ''}
        onSave={editingSkill ? handleUpdateSkill : handleCreateSkill}
        onCancel={handleCloseEditor}
        isNew={!editingSkill}
      />
    );
  }

  // Main library view
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Skills Library</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {skills.length} skill{skills.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium flex items-center gap-2 transition-colors border border-gray-300 dark:border-gray-600"
            title="Import skills"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import
          </button>
          <button
            onClick={() => setShowExport(true)}
            disabled={skills.length === 0}
            className="px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium flex items-center gap-2 transition-colors border border-gray-300 dark:border-gray-600"
            title="Export skills"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
          <button
            onClick={() => setShowGenerator(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Generate with AI
          </button>
          <button
            onClick={() => setShowEditor(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Skill
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search skills..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : cat}
            </option>
          ))}
        </select>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
            title="Grid view"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
            title="List view"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Skills Grid/List */}
      {filteredSkills.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
          {skills.length === 0 ? (
            <>
              <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No skills yet</p>
              <p className="text-gray-400 dark:text-gray-500 mb-4">
                Create your first skill to help guide AI implementations
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowGenerator(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Generate with AI
                </button>
                <span className="text-gray-400">or</span>
                <button
                  onClick={() => setShowEditor(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Create Manually
                </button>
              </div>
            </>
          ) : (
            <>
              <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400 text-lg">No matching skills</p>
              <p className="text-gray-400 dark:text-gray-500">
                Try adjusting your search or filters
              </p>
            </>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-auto">
          {filteredSkills.map(skill => (
            <SkillCard
              key={skill.filename}
              skill={skill}
              onView={handleViewSkill}
              onEdit={handleEditSkill}
              onDelete={handleDeleteSkill}
              viewMode={viewMode}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-auto">
          {filteredSkills.map(skill => (
            <SkillCard
              key={skill.filename}
              skill={skill}
              onView={handleViewSkill}
              onEdit={handleEditSkill}
              onDelete={handleDeleteSkill}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}

      {/* AI Skill Generator Modal */}
      {showGenerator && (
        <SkillGenerator
          instanceId={instanceId}
          onSkillGenerated={handleGeneratedSkill}
          onClose={() => setShowGenerator(false)}
        />
      )}

      {/* Import Modal */}
      {showImport && (
        <ImportExport
          instanceId={instanceId}
          mode="import"
          onClose={() => setShowImport(false)}
          onComplete={fetchSkills}
          currentSkills={skills}
        />
      )}

      {/* Export Modal */}
      {showExport && (
        <ImportExport
          instanceId={instanceId}
          mode="export"
          onClose={() => setShowExport(false)}
          onComplete={() => {}}
          currentSkills={skills}
        />
      )}
    </div>
  );
}
