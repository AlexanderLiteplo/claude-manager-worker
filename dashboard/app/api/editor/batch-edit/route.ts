import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

const MAX_CONTENT_LENGTH = 200000;
const MAX_COMMAND_LENGTH = 1000;
const MAX_FILES = 10;
const MAX_VERSIONS = 50;

// Allowed base path for security
const ALLOWED_BASE = path.join(os.homedir(), 'claude-managers');

// Initialize Anthropic client
const anthropic = new Anthropic();

function isPathAllowed(testPath: string): boolean {
  const normalized = path.normalize(path.resolve(testPath));
  return normalized.startsWith(path.normalize(ALLOWED_BASE));
}

interface DiffLine {
  type: 'add' | 'remove' | 'unchanged' | 'modify';
  lineNumber?: number;
  content: string;
  oldContent?: string;
}

interface Version {
  id: string;
  timestamp: string;
  content: string;
  commitMessage: string;
  author: 'user' | 'ai-command';
}

interface VersionFile {
  versions: Version[];
}

interface BatchEditResult {
  prdFile: string;
  success: boolean;
  updatedContent?: string;
  changes?: DiffLine[];
  explanation?: string;
  error?: string;
  version?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instanceId, prdFiles, command, autoSave = false } = body;

    // Validate required fields
    if (!instanceId || typeof instanceId !== 'string') {
      return NextResponse.json({ error: 'instanceId is required' }, { status: 400 });
    }

    if (!Array.isArray(prdFiles) || prdFiles.length === 0) {
      return NextResponse.json({ error: 'prdFiles array is required' }, { status: 400 });
    }

    if (prdFiles.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files allowed per batch operation` },
        { status: 400 }
      );
    }

    if (!command || typeof command !== 'string') {
      return NextResponse.json({ error: 'command is required' }, { status: 400 });
    }

    if (command.length > MAX_COMMAND_LENGTH) {
      return NextResponse.json(
        { error: `Command exceeds maximum length of ${MAX_COMMAND_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Validate path
    const instancePath = decodeURIComponent(instanceId);
    if (!isPathAllowed(instancePath)) {
      return NextResponse.json({ error: 'Invalid instance path' }, { status: 403 });
    }

    // Verify instance exists
    try {
      await fs.access(instancePath);
    } catch {
      return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    // Process each PRD file in parallel (up to MAX_FILES concurrently)
    const results: BatchEditResult[] = await Promise.all(
      prdFiles.map(async (prdFile: string): Promise<BatchEditResult> => {
        try {
          // Sanitize prdFile name
          const sanitizedPrdFile = prdFile.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
          if (!sanitizedPrdFile.endsWith('.md')) {
            return {
              prdFile,
              success: false,
              error: 'PRD file must have .md extension',
            };
          }

          // Load file content
          const prdsDir = path.join(instancePath, 'prds');
          const prdPath = path.join(prdsDir, sanitizedPrdFile);

          let currentContent: string;
          try {
            currentContent = await fs.readFile(prdPath, 'utf-8');
          } catch {
            return {
              prdFile,
              success: false,
              error: 'File not found',
            };
          }

          // Validate content length
          if (currentContent.length > MAX_CONTENT_LENGTH) {
            return {
              prdFile,
              success: false,
              error: `Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`,
            };
          }

          // Process the command with AI
          const result = await processCommand(prdFile, currentContent, command);

          if (!result.success) {
            return {
              prdFile,
              success: false,
              error: result.error,
            };
          }

          // If autoSave is enabled, save the changes
          let versionId: string | undefined;
          if (autoSave && result.updatedContent) {
            versionId = await saveVersion(
              instancePath,
              sanitizedPrdFile,
              result.updatedContent,
              `Batch edit: ${command}`
            );
          }

          return {
            prdFile,
            success: true,
            updatedContent: result.updatedContent,
            changes: result.changes,
            explanation: result.explanation,
            version: versionId,
          };
        } catch (err) {
          return {
            prdFile,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          };
        }
      })
    );

    // Calculate summary
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
      },
    });
  } catch (error) {
    console.error('Batch edit error:', error);

    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again in a moment.' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: `AI service error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}

async function processCommand(
  prdFile: string,
  currentContent: string,
  command: string
): Promise<{
  success: boolean;
  updatedContent?: string;
  changes?: DiffLine[];
  explanation?: string;
  error?: string;
}> {
  try {
    const systemPrompt = `You are an expert PRD (Product Requirements Document) editor. Your task is to apply user commands to modify PRD content.

RULES:
1. ALWAYS return the COMPLETE updated PRD content - never truncate or abbreviate
2. Preserve the overall structure and formatting of the PRD
3. Make only the requested changes - don't add unsolicited improvements
4. Keep the same markdown formatting style
5. Be precise with edits - change exactly what was requested
6. This is a batch operation - apply the same transformation consistently

RESPONSE FORMAT:
Return your response in this exact format:

<explanation>
Brief explanation of what changes you made (1-2 sentences)
</explanation>

<updated_content>
The complete updated PRD content goes here
</updated_content>

Common batch commands:
- "standardize headers" - Make all section headers consistent
- "add timestamp to all" - Add a timestamp or date section
- "remove deprecated sections" - Remove outdated content
- "update terminology: X to Y" - Replace terminology across all documents
- "add acceptance criteria template" - Add a standard AC section if missing
- "fix formatting" - Fix markdown formatting issues
- "update links" - Update broken or outdated links
- "add table of contents" - Add a TOC if missing`;

    const userPrompt = `Here is the PRD file "${prdFile}":

\`\`\`markdown
${currentContent}
\`\`\`

Command to apply: "${command}"

Please apply this command to the PRD and return the updated content in the specified format.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const responseContent = response.content[0];
    if (responseContent.type !== 'text') {
      return { success: false, error: 'Unexpected response type from AI' };
    }

    const aiResponse = responseContent.text;

    // Parse the response
    const explanationMatch = aiResponse.match(/<explanation>([\s\S]*?)<\/explanation>/);
    const explanation = explanationMatch
      ? explanationMatch[1].trim()
      : 'Changes applied as requested.';

    const contentMatch = aiResponse.match(/<updated_content>([\s\S]*?)<\/updated_content>/);
    const updatedContent = contentMatch
      ? contentMatch[1].trim()
      : aiResponse.trim();

    // Compute diff
    const changes = computeDiff(currentContent, updatedContent);

    return {
      success: true,
      updatedContent,
      changes,
      explanation,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to process command',
    };
  }
}

async function saveVersion(
  instancePath: string,
  prdFile: string,
  content: string,
  commitMessage: string
): Promise<string> {
  // Create versions directory
  const versionsDir = path.join(instancePath, '.prd-versions');
  await fs.mkdir(versionsDir, { recursive: true });

  // Create PRDs directory if it doesn't exist
  const prdsDir = path.join(instancePath, 'prds');
  await fs.mkdir(prdsDir, { recursive: true });

  // Load existing versions
  const versionsFile = path.join(versionsDir, `${prdFile}.versions.json`);
  let versionData: VersionFile = { versions: [] };

  try {
    const existingData = await fs.readFile(versionsFile, 'utf-8');
    versionData = JSON.parse(existingData);
  } catch {
    // File doesn't exist yet, use empty versions
  }

  // Create new version
  const versionId = crypto.randomBytes(16).toString('hex');
  const newVersion: Version = {
    id: versionId,
    timestamp: new Date().toISOString(),
    content,
    commitMessage,
    author: 'ai-command',
  };

  // Add to beginning of versions array
  versionData.versions.unshift(newVersion);

  // Limit versions to MAX_VERSIONS
  if (versionData.versions.length > MAX_VERSIONS) {
    versionData.versions = versionData.versions.slice(0, MAX_VERSIONS);
  }

  // Save versions file atomically
  const tempVersionsFile = `${versionsFile}.${Date.now()}.tmp`;
  await fs.writeFile(tempVersionsFile, JSON.stringify(versionData, null, 2));
  await fs.rename(tempVersionsFile, versionsFile);

  // Save the actual PRD file
  const prdPath = path.join(prdsDir, prdFile);
  const tempPrdFile = `${prdPath}.${Date.now()}.tmp`;
  await fs.writeFile(tempPrdFile, content);
  await fs.rename(tempPrdFile, prdPath);

  return versionId;
}

function computeDiff(oldContent: string, newContent: string): DiffLine[] {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const diff: DiffLine[] = [];

  // Simple LCS-based diff
  const lcs = longestCommonSubsequence(oldLines, newLines);
  let oldIndex = 0;
  let newIndex = 0;
  let lcsIndex = 0;
  let lineNumber = 1;

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (lcsIndex < lcs.length && oldIndex < oldLines.length && oldLines[oldIndex] === lcs[lcsIndex]) {
      if (newIndex < newLines.length && newLines[newIndex] === lcs[lcsIndex]) {
        // Unchanged line
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
      // Added line
      diff.push({
        type: 'add',
        lineNumber: lineNumber++,
        content: newLines[newIndex],
      });
      newIndex++;
    } else if (oldIndex < oldLines.length && (lcsIndex >= lcs.length || oldLines[oldIndex] !== lcs[lcsIndex])) {
      // Removed line
      diff.push({
        type: 'remove',
        lineNumber: lineNumber++,
        content: oldLines[oldIndex],
      });
      oldIndex++;
    }
  }

  // Filter to only show changes (not unchanged lines)
  return diff.filter(line => line.type !== 'unchanged');
}

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
