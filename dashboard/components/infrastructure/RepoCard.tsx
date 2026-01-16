'use client';

interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  private: boolean;
  language: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  pushedAt: string;
  archived: boolean;
  activity?: {
    commits: { sha: string; message: string; date: string }[];
    pullRequests: { number: number; title: string; state: string }[];
    issues: { number: number; title: string; state: string }[];
  };
}

interface RepoCardProps {
  repo: GitHubRepo;
}

export function RepoCard({ repo }: RepoCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getLanguageColor = (language: string | null) => {
    const colors: Record<string, string> = {
      TypeScript: 'bg-blue-500',
      JavaScript: 'bg-yellow-500',
      Python: 'bg-green-500',
      Go: 'bg-cyan-500',
      Rust: 'bg-orange-500',
      Java: 'bg-red-500',
      'C++': 'bg-pink-500',
      Ruby: 'bg-red-400',
      PHP: 'bg-purple-500',
      Swift: 'bg-orange-400',
      Kotlin: 'bg-purple-400',
    };
    return colors[language || ''] || 'bg-gray-400';
  };

  const isActive = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(repo.pushedAt) > thirtyDaysAgo;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow ${repo.archived ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {repo.name}
            </h3>
            {repo.private && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                Private
              </span>
            )}
            {repo.archived && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400">
                Archived
              </span>
            )}
          </div>
          {repo.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {repo.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3 text-xs text-gray-500 dark:text-gray-400">
        {repo.language && (
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${getLanguageColor(repo.language)}`} />
            {repo.language}
          </span>
        )}
        {repo.stars > 0 && (
          <span className="flex items-center gap-1">
            ⭐ {repo.stars}
          </span>
        )}
        {repo.forks > 0 && (
          <span className="flex items-center gap-1">
            🔀 {repo.forks}
          </span>
        )}
        {repo.openIssues > 0 && (
          <span className="flex items-center gap-1">
            🔘 {repo.openIssues}
          </span>
        )}
      </div>

      {repo.activity && (
        <div className="space-y-2 mb-3">
          {repo.activity.commits.length > 0 && (
            <div className="text-xs">
              <span className="text-gray-500 dark:text-gray-400">Latest commit: </span>
              <span className="text-gray-700 dark:text-gray-300 truncate">
                {repo.activity.commits[0].message.split('\n')[0]}
              </span>
            </div>
          )}
          {repo.activity.pullRequests.filter(pr => pr.state === 'open').length > 0 && (
            <div className="text-xs text-green-600 dark:text-green-400">
              {repo.activity.pullRequests.filter(pr => pr.state === 'open').length} open PR(s)
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">
          {isActive() ? (
            <span className="text-green-600 dark:text-green-400">Active</span>
          ) : (
            `Updated ${formatDate(repo.pushedAt)}`
          )}
        </span>

        <div className="flex items-center gap-2">
          <a
            href={repo.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600"
            title="View on GitHub"
          >
            📦
          </a>
          <a
            href={`${repo.htmlUrl}/actions`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600"
            title="GitHub Actions"
          >
            ▶️
          </a>
          <a
            href={`${repo.htmlUrl}/pulls`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600"
            title="Pull Requests"
          >
            🔃
          </a>
        </div>
      </div>
    </div>
  );
}
