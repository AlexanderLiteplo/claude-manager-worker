'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { SkillEditor } from '../../../../../components/management/SkillEditor';
import { useToast } from '../../../../../components/ui/Toast';

interface Skill {
  filename: string;
  title: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  content: string;
}

export default function SkillDetailPage({ params }: { params: Promise<{ instanceId: string; skillId: string }> }) {
  const { instanceId, skillId } = use(params);
  const router = useRouter();
  const toast = useToast();

  const [skill, setSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const decodedPath = decodeURIComponent(instanceId);
  const decodedSkillFile = decodeURIComponent(skillId);
  const instanceName = decodedPath.split('/').pop() || 'Instance';

  useEffect(() => {
    async function fetchSkill() {
      try {
        const response = await fetch(`/api/skills/${instanceId}/${skillId}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch skill');
        }

        setSkill(data.skill);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch skill');
      } finally {
        setLoading(false);
      }
    }

    fetchSkill();
  }, [instanceId, skillId]);

  const handleSave = async (name: string, content: string) => {
    const response = await fetch(`/api/skills/${instanceId}/${skillId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to update skill');
    }

    setSkill(data.skill);
    setIsEditing(false);
    toast.success('Skill updated', `"${data.skill.title}" has been updated successfully`);
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${skill?.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/skills/${instanceId}/${skillId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete skill');
      }

      toast.success('Skill deleted', `"${skill?.title}" has been deleted`);
      router.push(`/manage/${instanceId}/skills`);
    } catch (err) {
      toast.error('Delete failed', err instanceof Error ? err.message : 'Failed to delete skill');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !skill) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/manage/${instanceId}/skills`)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Skill Not Found</h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-700 dark:text-red-400">{error || 'Skill not found'}</p>
            <button
              onClick={() => router.push(`/manage/${instanceId}/skills`)}
              className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              Back to Skills
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Edit: {skill.title}
              </h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          <div className="h-[calc(100vh-150px)]">
            <SkillEditor
              initialContent={skill.content}
              skillName={skill.title}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
              isNew={false}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/manage/${instanceId}/skills`)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <button
                    onClick={() => router.push('/')}
                    className="hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Dashboard
                  </button>
                  <span>/</span>
                  <button
                    onClick={() => router.push(`/manage/${instanceId}`)}
                    className="hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {instanceName}
                  </button>
                  <span>/</span>
                  <button
                    onClick={() => router.push(`/manage/${instanceId}/skills`)}
                    className="hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Skills
                  </button>
                  <span>/</span>
                  <span className="text-gray-900 dark:text-white font-medium truncate max-w-[150px]">
                    {skill.title}
                  </span>
                </nav>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                  {skill.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Skill Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg mb-6">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg font-medium">
                {skill.category}
              </span>
              {skill.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-sm">
                  {tag}
                </span>
              ))}
              <span className="text-sm text-gray-400 ml-auto">
                Last updated: {new Date(skill.updatedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Skill Content */}
          <div className="p-6">
            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
              {skill.content}
            </pre>
          </div>
        </div>
      </main>
    </div>
  );
}
