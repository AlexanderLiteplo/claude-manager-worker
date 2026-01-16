'use client';

interface QuickLink {
  name: string;
  url: string;
  icon: string;
  description: string;
  category: 'vercel' | 'github' | 'gcloud' | 'other';
}

const quickLinks: QuickLink[] = [
  // Vercel
  {
    name: 'Vercel Dashboard',
    url: 'https://vercel.com/dashboard',
    icon: '▲',
    description: 'Overview of all projects',
    category: 'vercel',
  },
  {
    name: 'Vercel Analytics',
    url: 'https://vercel.com/analytics',
    icon: '📊',
    description: 'Web analytics & vitals',
    category: 'vercel',
  },
  {
    name: 'Vercel Billing',
    url: 'https://vercel.com/account/billing',
    icon: '💳',
    description: 'Billing & usage',
    category: 'vercel',
  },
  {
    name: 'Vercel Logs',
    url: 'https://vercel.com/logs',
    icon: '📝',
    description: 'Runtime & build logs',
    category: 'vercel',
  },

  // GitHub
  {
    name: 'GitHub Repositories',
    url: 'https://github.com',
    icon: '📦',
    description: 'All repositories',
    category: 'github',
  },
  {
    name: 'GitHub Actions',
    url: 'https://github.com/settings/actions',
    icon: '▶️',
    description: 'CI/CD workflows',
    category: 'github',
  },
  {
    name: 'GitHub Billing',
    url: 'https://github.com/settings/billing',
    icon: '💳',
    description: 'Actions & storage usage',
    category: 'github',
  },
  {
    name: 'GitHub Notifications',
    url: 'https://github.com/notifications',
    icon: '🔔',
    description: 'Activity feed',
    category: 'github',
  },

  // Google Cloud
  {
    name: 'GCP Console',
    url: 'https://console.cloud.google.com',
    icon: '☁️',
    description: 'Cloud dashboard',
    category: 'gcloud',
  },
  {
    name: 'Cloud Run',
    url: 'https://console.cloud.google.com/run',
    icon: '🏃',
    description: 'Serverless containers',
    category: 'gcloud',
  },
  {
    name: 'GCP Billing',
    url: 'https://console.cloud.google.com/billing',
    icon: '💳',
    description: 'Cost management',
    category: 'gcloud',
  },
  {
    name: 'Cloud Logging',
    url: 'https://console.cloud.google.com/logs',
    icon: '📋',
    description: 'Centralized logs',
    category: 'gcloud',
  },
];

export function QuickLinks() {
  const categories = [
    { id: 'vercel', name: 'Vercel', color: 'border-black dark:border-white' },
    { id: 'github', name: 'GitHub', color: 'border-purple-500' },
    { id: 'gcloud', name: 'Google Cloud', color: 'border-blue-500' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
        Quick Links
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((category) => (
          <div key={category.id}>
            <h3 className={`text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 pb-2 border-b-2 ${category.color}`}>
              {category.name}
            </h3>
            <div className="space-y-2">
              {quickLinks
                .filter((link) => link.category === category.id)
                .map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                  >
                    <span className="text-lg">{link.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-500">
                        {link.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {link.description}
                      </p>
                    </div>
                    <span className="text-gray-400 group-hover:text-blue-500 text-sm">→</span>
                  </a>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
