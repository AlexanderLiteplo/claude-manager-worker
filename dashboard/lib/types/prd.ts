// PRD Metadata types for the organizer

export type PRDStatus = 'pending' | 'in-progress' | 'completed' | 'blocked';
export type PRDPriority = 'high' | 'medium' | 'low';
export type PRDComplexity = 'simple' | 'medium' | 'complex';

export interface PRDMetadata {
  filename: string;
  title: string;
  status: PRDStatus;
  priority: PRDPriority;
  tags: string[];
  complexity: PRDComplexity;
  dependencies: string[];
  estimatedIterations: number;
  actualIterations?: number;
  createdAt: string;
  completedAt?: string;
  archived?: boolean;
}

export interface PRDFile {
  filename: string;
  title: string;
  content: string;
  metadata: PRDMetadata;
}

export interface PRDOrganizerState {
  prds: PRDMetadata[];
  tags: string[];
  lastUpdated: string;
}

// View modes for the PRD organizer
export type PRDViewMode = 'list' | 'kanban';

// Search/filter options
export interface PRDFilters {
  status?: PRDStatus | 'all';
  priority?: PRDPriority | 'all';
  tags?: string[];
  search?: string;
  showArchived?: boolean;
}
