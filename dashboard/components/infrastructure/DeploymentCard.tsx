'use client';

interface Deployment {
  id: string;
  name: string;
  url?: string;
  state: 'READY' | 'ERROR' | 'BUILDING' | 'QUEUED' | 'CANCELED';
  target: 'production' | 'preview';
  createdAt: number;
  inspectorUrl?: string;
  projectName?: string;
}

interface Project {
  id: string;
  name: string;
  framework: string | null;
  productionDeployment?: Deployment;
  latestDeployments?: Deployment[];
  targets?: {
    production?: {
      alias?: string[];
      url?: string;
    };
  };
  link?: {
    type: 'github';
    repo: string;
  };
}

interface DeploymentCardProps {
  project: Project;
}

export function DeploymentCard({ project }: DeploymentCardProps) {
  const productionUrl = project.targets?.production?.url ||
    project.productionDeployment?.url ||
    `https://${project.name}.vercel.app`;

  const getStateColor = (state: string) => {
    switch (state) {
      case 'READY':
        return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400';
      case 'BUILDING':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400';
      case 'QUEUED':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400';
      case 'ERROR':
        return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400';
      case 'CANCELED':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'READY':
        return '✓';
      case 'BUILDING':
        return '⏳';
      case 'QUEUED':
        return '📋';
      case 'ERROR':
        return '✕';
      case 'CANCELED':
        return '⊘';
      default:
        return '?';
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {project.name}
          </h3>
          {project.framework && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {project.framework}
            </p>
          )}
        </div>
        {project.productionDeployment && (
          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStateColor(project.productionDeployment.state)}`}>
            <span className="mr-1">{getStateIcon(project.productionDeployment.state)}</span>
            {project.productionDeployment.state}
          </span>
        )}
      </div>

      {project.link?.repo && (
        <div className="mb-3">
          <a
            href={`https://github.com/${project.link.repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 flex items-center gap-1"
          >
            <span>📦</span>
            {project.link.repo}
          </a>
        </div>
      )}

      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">
          {project.productionDeployment
            ? formatDate(project.productionDeployment.createdAt)
            : 'No deployment'}
        </span>

        <div className="flex items-center gap-2">
          {productionUrl && (
            <a
              href={productionUrl.startsWith('http') ? productionUrl : `https://${productionUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600"
              title="Visit Site"
            >
              🔗
            </a>
          )}
          {project.productionDeployment?.inspectorUrl && (
            <a
              href={project.productionDeployment.inspectorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600"
              title="View Logs"
            >
              📝
            </a>
          )}
          <a
            href={`https://vercel.com/${project.name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600"
            title="Vercel Dashboard"
          >
            ▲
          </a>
        </div>
      </div>

      {project.latestDeployments && project.latestDeployments.length > 1 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Recent Deployments</p>
          <div className="flex gap-1">
            {project.latestDeployments.slice(0, 5).map((deployment) => (
              <span
                key={deployment.id}
                className={`w-2 h-2 rounded-full ${
                  deployment.state === 'READY'
                    ? 'bg-green-500'
                    : deployment.state === 'BUILDING'
                    ? 'bg-yellow-500'
                    : deployment.state === 'ERROR'
                    ? 'bg-red-500'
                    : 'bg-gray-400'
                }`}
                title={`${deployment.target}: ${deployment.state}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
