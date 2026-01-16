'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { SkillsLibrary } from '../../../../components/management/SkillsLibrary';

export default function SkillsPage({ params }: { params: Promise<{ instanceId: string }> }) {
  const { instanceId } = use(params);
  const router = useRouter();

  const decodedPath = decodeURIComponent(instanceId);
  const instanceName = decodedPath.split('/').pop() || 'Instance';

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/manage/${instanceId}`)}
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
                <span className="text-gray-900 dark:text-white font-medium">Skills</span>
              </nav>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                Skills Library
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 min-h-[calc(100vh-200px)]">
          <SkillsLibrary instanceId={instanceId} />
        </div>
      </main>
    </div>
  );
}
