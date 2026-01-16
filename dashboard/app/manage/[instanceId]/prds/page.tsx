'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PRDOrganizer } from '@/components/management/PRDOrganizer';
import { ToastProvider } from '@/components/ui/Toast';

export default function PRDsPage({ params }: { params: Promise<{ instanceId: string }> }) {
  const { instanceId } = use(params);
  const router = useRouter();

  const decodedPath = decodeURIComponent(instanceId);
  const instanceName = decodedPath.split('/').pop() || 'Instance';

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow shrink-0">
          <div className="max-w-7xl mx-auto px-4 py-4">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
              <Link href="/" className="hover:text-gray-700 dark:hover:text-gray-300">
                Dashboard
              </Link>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <Link href={`/manage/${instanceId}`} className="hover:text-gray-700 dark:hover:text-gray-300">
                {instanceName}
              </Link>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-gray-900 dark:text-white font-medium">PRDs</span>
            </nav>

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
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  PRD Organizer
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {instanceName}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 overflow-hidden">
          <PRDOrganizer instanceId={instanceId} />
        </main>
      </div>
    </ToastProvider>
  );
}
