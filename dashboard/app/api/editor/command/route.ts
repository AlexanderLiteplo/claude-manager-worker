import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

const MAX_CONTENT_LENGTH = 200000;
const MAX_COMMAND_LENGTH = 1000;

// Initialize Anthropic client
const anthropic = new Anthropic();

// Command patterns for quick processing
const COMMAND_PATTERNS = {
  undo: /^(no|undo|cancel|reject)$/i,
  accept: /^(yes|accept|apply|ok)$/i,
  add: /^add\s+(section|paragraph|part|a?\s*)?(about|for|on)?\s*(.+)$/i,
  remove: /^(remove|delete)\s*(the\s+)?(section|paragraph|part)?\s*(about|for|on)?\s*(.+)$/i,
  change: /^(change|replace|update)\s+(.+)\s+(to|with)\s+(.+)$/i,
  expand: /^(expand|make\s+(.+\s+)?more\s+detailed|elaborate(\s+on)?|add\s+more\s+details?(\s+to)?)\s*(.*)$/i,
  simplify: /^(simplify|make\s+(.+\s+)?simpler|reduce|shorten|condense)\s*(.*)$/i,
  fix: /^fix\s+(grammar|typos|spelling|errors?|formatting)$/i,
  improve: /^improve(\s+this)?(\s+section|\s+text)?$/i,
  reorganize: /^(reorganize|restructure|reorder)\s*(.*)$/i,
  rewrite: /^(rewrite|rephrase|reformulate)\s*(.*)$/i,
  format: /^(format|clean\s*up|prettify)\s*(.*)$/i,
  listItems: /^(improve|make)\s+(list\s+)?items?\s*(more\s+)?(actionable|specific|clear)$/i,
  fillPlaceholders: /^(fill\s+in|complete)\s+(placeholder|missing)\s*(content|sections?)?$/i,
};

interface DiffLine {
  type: 'add' | 'remove' | 'unchanged' | 'modify';
  lineNumber?: number;
  content: string;
  oldContent?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instanceId, prdFile, currentContent, command, selection, previousCommand } = body;

    // Validate required fields
    if (!instanceId || typeof instanceId !== 'string') {
      return NextResponse.json({ error: 'instanceId is required' }, { status: 400 });
    }

    if (!prdFile || typeof prdFile !== 'string') {
      return NextResponse.json({ error: 'prdFile is required' }, { status: 400 });
    }

    if (!currentContent || typeof currentContent !== 'string') {
      return NextResponse.json({ error: 'currentContent is required' }, { status: 400 });
    }

    if (!command || typeof command !== 'string') {
      return NextResponse.json({ error: 'command is required' }, { status: 400 });
    }

    // Validate lengths
    if (currentContent.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters` },
        { status: 400 }
      );
    }

    if (command.length > MAX_COMMAND_LENGTH) {
      return NextResponse.json(
        { error: `Command exceeds maximum length of ${MAX_COMMAND_LENGTH} characters` },
        { status: 400 }
      );
    }

    // Check for undo/accept commands (these are handled client-side)
    if (COMMAND_PATTERNS.undo.test(command.trim())) {
      return NextResponse.json({
        updatedContent: currentContent,
        changes: [],
        explanation: 'This command should be handled client-side.',
      });
    }

    if (COMMAND_PATTERNS.accept.test(command.trim())) {
      return NextResponse.json({
        updatedContent: currentContent,
        changes: [],
        explanation: 'This command should be handled client-side.',
      });
    }

    // Get selected text if selection provided
    let selectedText = '';
    if (selection && typeof selection.start === 'number' && typeof selection.end === 'number') {
      selectedText = currentContent.substring(selection.start, selection.end);
    }

    // Build the AI prompt
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(
      currentContent,
      command,
      selectedText,
      selection,
      previousCommand
    );

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    });

    // Extract the response content
    const responseContent = response.content[0];
    if (responseContent.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const aiResponse = responseContent.text;

    // Parse the response
    const result = parseAIResponse(aiResponse, currentContent);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Editor command error:', error);

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

function buildSystemPrompt(): string {
  return `You are an expert PRD (Product Requirements Document) editor. Your task is to apply user commands to modify PRD content.

RULES:
1. ALWAYS return the COMPLETE updated PRD content - never truncate or abbreviate
2. Preserve the overall structure and formatting of the PRD
3. Make only the requested changes - don't add unsolicited improvements
4. Keep the same markdown formatting style
5. Be precise with edits - change exactly what was requested

RESPONSE FORMAT:
Return your response in this exact format:

<explanation>
Brief explanation of what changes you made (1-2 sentences)
</explanation>

<updated_content>
The complete updated PRD content goes here
</updated_content>

Common commands you'll receive:
- "add section about X" - Add a new section about the topic
- "remove the part about Y" - Delete content related to Y
- "change X to Y" - Replace X with Y
- "make this more detailed" - Expand the content with more specifics
- "simplify" - Make the content clearer and more concise
- "fix grammar" - Correct grammatical errors
- "improve this section" - Enhance the quality of the selected section
- "reorganize this section" - Restructure content for clarity
- "rewrite" - Completely rewrite the selected content
- "improve list items" - Make list items more actionable/specific
- "fill in placeholder content" - Complete [placeholder] sections
- "expand this section" - Add more detail to selected content

Selection-based commands:
When text is selected, focus your changes on that specific area while preserving the rest of the document exactly as is. The selection context will be provided to help you understand where in the document the change should occur.

If the command is unclear, make your best interpretation and explain your changes.`;
}

function buildUserPrompt(
  content: string,
  command: string,
  selectedText: string,
  selection?: { start: number; end: number },
  previousCommand?: string
): string {
  let prompt = `Here is the current PRD content:

\`\`\`markdown
${content}
\`\`\`

`;

  if (selectedText && selection) {
    // Find the section context around the selection
    const lines = content.split('\n');
    let currentLine = 0;
    let charCount = 0;
    let sectionHeader = '';

    for (const line of lines) {
      charCount += line.length + 1; // +1 for newline
      if (line.startsWith('#')) {
        sectionHeader = line;
      }
      if (charCount >= selection.start) {
        break;
      }
      currentLine++;
    }

    prompt += `The user has selected the following text (in section "${sectionHeader || 'Document'}"):
\`\`\`
${selectedText}
\`\`\`

Selection position: line ${currentLine + 1}, characters ${selection.start}-${selection.end}

IMPORTANT: The command should primarily affect the SELECTED TEXT. Make changes to that specific area while preserving the rest of the document.

`;
  }

  if (previousCommand) {
    prompt += `This is a refinement of a previous command: "${previousCommand}"
The user wants to adjust the previous changes with this new instruction.

`;
  }

  prompt += `User command: "${command}"

Please apply this command to the PRD and return the updated content in the specified format.
${selectedText ? 'Focus your changes on the selected text area.' : ''}`;

  return prompt;
}

function parseAIResponse(response: string, originalContent: string): {
  updatedContent: string;
  changes: DiffLine[];
  explanation: string;
} {
  // Extract explanation
  const explanationMatch = response.match(/<explanation>([\s\S]*?)<\/explanation>/);
  const explanation = explanationMatch
    ? explanationMatch[1].trim()
    : 'Changes applied as requested.';

  // Extract updated content
  const contentMatch = response.match(/<updated_content>([\s\S]*?)<\/updated_content>/);
  const updatedContent = contentMatch
    ? contentMatch[1].trim()
    : response.trim(); // Fallback to entire response if tags not found

  // Compute diff
  const changes = computeDiff(originalContent, updatedContent);

  return {
    updatedContent,
    changes,
    explanation,
  };
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
