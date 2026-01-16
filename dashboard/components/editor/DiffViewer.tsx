'use client';

import { useMemo } from 'react';

export interface DiffLine {
  type: 'add' | 'remove' | 'unchanged' | 'modify';
  lineNumber?: number;
  content: string;
  oldContent?: string;
}

interface DiffViewerProps {
  diff: DiffLine[];
  maxLines?: number;
  compact?: boolean;
}

export function DiffViewer({ diff, maxLines = 20, compact = false }: DiffViewerProps) {
  // Limit displayed lines for long diffs
  const displayedDiff = useMemo(() => {
    if (diff.length <= maxLines) return diff;

    // Show first and last lines with indicator in between
    const half = Math.floor(maxLines / 2);
    const first = diff.slice(0, half);
    const last = diff.slice(-half);
    const skipped = diff.length - maxLines;

    return [
      ...first,
      { type: 'unchanged' as const, content: `... ${skipped} lines hidden ...`, lineNumber: undefined },
      ...last,
    ];
  }, [diff, maxLines]);

  // Count changes
  const stats = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    let modifications = 0;

    diff.forEach(line => {
      if (line.type === 'add') additions++;
      else if (line.type === 'remove') deletions++;
      else if (line.type === 'modify') modifications++;
    });

    return { additions, deletions, modifications };
  }, [diff]);

  if (diff.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 py-2">
        No changes detected
      </div>
    );
  }

  if (compact) {
    return (
      <div className="text-sm">
        <div className="flex items-center gap-3 mb-2">
          {stats.additions > 0 && (
            <span className="text-green-600 dark:text-green-400">
              +{stats.additions} added
            </span>
          )}
          {stats.deletions > 0 && (
            <span className="text-red-600 dark:text-red-400">
              -{stats.deletions} removed
            </span>
          )}
          {stats.modifications > 0 && (
            <span className="text-yellow-600 dark:text-yellow-400">
              ~{stats.modifications} modified
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 bg-gray-100 dark:bg-gray-750 text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <span className="font-medium">📊 Changes Preview</span>
        <div className="flex items-center gap-3">
          {stats.additions > 0 && (
            <span className="text-green-600 dark:text-green-400">
              +{stats.additions}
            </span>
          )}
          {stats.deletions > 0 && (
            <span className="text-red-600 dark:text-red-400">
              -{stats.deletions}
            </span>
          )}
          {stats.modifications > 0 && (
            <span className="text-yellow-600 dark:text-yellow-400">
              ~{stats.modifications}
            </span>
          )}
        </div>
      </div>

      {/* Diff lines */}
      <div className="overflow-x-auto max-h-64 overflow-y-auto font-mono text-sm">
        {displayedDiff.map((line, index) => (
          <DiffLineComponent key={index} line={line} />
        ))}
      </div>
    </div>
  );
}

function DiffLineComponent({ line }: { line: DiffLine }) {
  const bgColor = {
    add: 'bg-green-50 dark:bg-green-900/20',
    remove: 'bg-red-50 dark:bg-red-900/20',
    modify: 'bg-yellow-50 dark:bg-yellow-900/20',
    unchanged: 'bg-transparent',
  }[line.type];

  const textColor = {
    add: 'text-green-700 dark:text-green-300',
    remove: 'text-red-700 dark:text-red-300',
    modify: 'text-yellow-700 dark:text-yellow-300',
    unchanged: 'text-gray-500 dark:text-gray-400',
  }[line.type];

  const prefix = {
    add: '+',
    remove: '-',
    modify: '~',
    unchanged: ' ',
  }[line.type];

  const prefixColor = {
    add: 'text-green-600 dark:text-green-400',
    remove: 'text-red-600 dark:text-red-400',
    modify: 'text-yellow-600 dark:text-yellow-400',
    unchanged: 'text-gray-400',
  }[line.type];

  return (
    <div className={`flex ${bgColor}`}>
      {/* Line number */}
      {line.lineNumber !== undefined && (
        <div className="w-12 flex-shrink-0 px-2 py-1 text-right text-xs text-gray-400 dark:text-gray-500 select-none border-r border-gray-200 dark:border-gray-700">
          {line.lineNumber}
        </div>
      )}

      {/* Prefix */}
      <div className={`w-6 flex-shrink-0 px-2 py-1 text-center select-none ${prefixColor}`}>
        {prefix}
      </div>

      {/* Content */}
      <div className={`flex-1 px-2 py-1 whitespace-pre-wrap break-words ${textColor}`}>
        {line.type === 'modify' && line.oldContent ? (
          <span>
            <span className="line-through text-red-600 dark:text-red-400">
              {line.oldContent}
            </span>
            {' → '}
            <span className="text-green-600 dark:text-green-400">
              {line.content}
            </span>
          </span>
        ) : (
          line.content || '\u00A0' // Non-breaking space for empty lines
        )}
      </div>
    </div>
  );
}

// Utility function to compute diff between two strings
export function computeDiff(oldContent: string, newContent: string): DiffLine[] {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const diff: DiffLine[] = [];

  // Simple line-by-line diff using LCS algorithm
  const lcs = longestCommonSubsequence(oldLines, newLines);
  let oldIndex = 0;
  let newIndex = 0;
  let lcsIndex = 0;
  let lineNumber = 1;

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (lcsIndex < lcs.length && oldIndex < oldLines.length && oldLines[oldIndex] === lcs[lcsIndex]) {
      // Line is in LCS (unchanged)
      if (newIndex < newLines.length && newLines[newIndex] === lcs[lcsIndex]) {
        diff.push({
          type: 'unchanged',
          lineNumber: lineNumber++,
          content: oldLines[oldIndex],
        });
        newIndex++;
      }
      oldIndex++;
      lcsIndex++;
    } else if (newIndex < newLines.length && (lcsIndex >= lcs.length || newLines[newIndex] !== lcs[lcsIndex])) {
      // Line was added
      diff.push({
        type: 'add',
        lineNumber: lineNumber++,
        content: newLines[newIndex],
      });
      newIndex++;
    } else if (oldIndex < oldLines.length && (lcsIndex >= lcs.length || oldLines[oldIndex] !== lcs[lcsIndex])) {
      // Line was removed
      diff.push({
        type: 'remove',
        lineNumber: lineNumber++,
        content: oldLines[oldIndex],
      });
      oldIndex++;
    }
  }

  return diff;
}

// Longest Common Subsequence algorithm
function longestCommonSubsequence(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find LCS
  const lcs: string[] = [];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

// Utility to create diff from before/after comparison
export function createDiffFromChanges(
  originalContent: string,
  updatedContent: string
): DiffLine[] {
  return computeDiff(originalContent, updatedContent);
}
