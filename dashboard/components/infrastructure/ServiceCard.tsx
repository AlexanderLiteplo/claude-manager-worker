'use client';

interface GCloudService {
  serviceName: string;
  displayName: string;
  state: 'ENABLED' | 'DISABLED';
}

interface GCloudInstance {
  name: string;
  zone: string;
  machineType: string;
  status: string;
  internalIP: string;
  externalIP?: string;
}

interface GCloudProject {
  projectId: string;
  name: string;
  state: string;
}

interface ServiceCardProps {
  project: GCloudProject;
  services: GCloudService[];
  instances: GCloudInstance[];
  cost: {
    total: number;
    netTotal: number;
  };
}

export function ServiceCard({ project, services, instances, cost }: ServiceCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400';
      case 'STOPPED':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
      case 'TERMINATED':
        return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400';
      default:
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400';
    }
  };

  const commonServices = [
    'compute.googleapis.com',
    'run.googleapis.com',
    'cloudfunctions.googleapis.com',
    'storage.googleapis.com',
    'bigquery.googleapis.com',
    'cloudscheduler.googleapis.com',
    'pubsub.googleapis.com',
  ];

  const filteredServices = services.filter(s =>
    commonServices.some(cs => s.serviceName.includes(cs.split('.')[0]))
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {project.name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {project.projectId}
          </p>
        </div>
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
          project.state === 'ACTIVE'
            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
        }`}>
          {project.state}
        </span>
      </div>

      {/* Cost Summary */}
      <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600 dark:text-gray-400">Est. Monthly Cost</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            ${cost.netTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Running Instances */}
      {instances.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Compute Instances ({instances.filter(i => i.status === 'RUNNING').length} running)
          </p>
          <div className="space-y-1">
            {instances.slice(0, 3).map((instance) => (
              <div
                key={instance.name}
                className="flex items-center justify-between text-xs"
              >
                <span className="truncate text-gray-700 dark:text-gray-300">
                  {instance.name}
                </span>
                <span className={`px-1.5 py-0.5 rounded ${getStatusColor(instance.status)}`}>
                  {instance.status}
                </span>
              </div>
            ))}
            {instances.length > 3 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                +{instances.length - 3} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Enabled Services */}
      {filteredServices.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Services ({services.length} enabled)
          </p>
          <div className="flex flex-wrap gap-1">
            {filteredServices.slice(0, 5).map((service) => (
              <span
                key={service.serviceName}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
                title={service.displayName}
              >
                {service.displayName.split(' ')[0]}
              </span>
            ))}
            {filteredServices.length > 5 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                +{filteredServices.length - 5}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100 dark:border-gray-700">
        <span className="text-gray-500 dark:text-gray-400">
          {services.length} services enabled
        </span>

        <div className="flex items-center gap-2">
          <a
            href={`https://console.cloud.google.com/home/dashboard?project=${project.projectId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600"
            title="GCP Console"
          >
            ☁️
          </a>
          <a
            href={`https://console.cloud.google.com/compute/instances?project=${project.projectId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600"
            title="Compute Instances"
          >
            💻
          </a>
          <a
            href={`https://console.cloud.google.com/billing?project=${project.projectId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600"
            title="Billing"
          >
            💵
          </a>
        </div>
      </div>
    </div>
  );
}
