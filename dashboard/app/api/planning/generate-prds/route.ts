import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const anthropic = new Anthropic();

// Validate that path is within allowed directories
const ALLOWED_BASES = [
  path.join(os.homedir(), 'claude-managers'),
];

function isPathAllowed(testPath: string): boolean {
  const normalizedPath = path.normalize(path.resolve(testPath));
  return ALLOWED_BASES.some(basePath =>
    normalizedPath.startsWith(path.normalize(basePath))
  );
}

// System prompt for PRD generation
const PRD_GENERATION_SYSTEM_PROMPT = `You are an expert software architect and technical writer. Your task is to analyze the conversation and generate detailed PRDs (Product Requirements Documents) for the project.

## PRD Format

For each distinct feature or component that needs to be built, create a separate PRD following this structure:

# PRD: [Feature Name]

## Overview
[Clear description of what this builds - 2-3 sentences]

## Goals
[3-5 bullet points of what success looks like]

## Target Directory
[Where the code should be written]

## User Stories
[3-8 user stories in the format: "As a [role], I want to [action] so that [benefit]"]

## Technical Requirements

### Architecture
[File structure showing what files to create/modify]

### Implementation Details
[Specific code examples, API endpoints, database schema if needed]

### Dependencies
[External libraries, services, prerequisites]

## Acceptance Criteria
[5-10 specific, testable criteria as checkboxes]
- [ ] Criterion 1
- [ ] Criterion 2
...

## Out of Scope (v1)
[What we're NOT building in this version - helps prevent scope creep]

## Priority
[High/Medium/Low]

## Estimated Complexity
[Simple/Medium/High - based on number of files, integrations, etc.]

---

## Response Format

You MUST respond with valid JSON in exactly this format:

\`\`\`json
{
  "plan": {
    "title": "Overall Project Title",
    "summary": "1-2 sentence summary of what will be built",
    "prds": [
      {
        "id": "prd_unique_id",
        "filename": "feature_name.md",
        "title": "Feature Name",
        "content": "Full PRD markdown content following the format above",
        "priority": "high|medium|low",
        "dependencies": ["other_prd_id"],
        "estimatedIterations": 25
      }
    ],
    "estimatedComplexity": "simple|medium|complex",
    "suggestedOrder": [0, 1, 2]
  }
}
\`\`\`

## Guidelines

1. **Break down complex projects** - If the user wants multiple features, create separate PRDs for each
2. **Be specific** - Include actual file paths, component names, API endpoints
3. **Consider dependencies** - If PRD B depends on PRD A, note that in dependencies
4. **Estimate realistically** - estimatedIterations should reflect actual work needed
5. **Keep scope manageable** - Each PRD should be completable in a reasonable time
6. **Include edge cases** - Think about error handling, loading states, etc.
7. **Use modern patterns** - TypeScript, React hooks, proper error handling`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface GeneratedPRD {
  id: string;
  filename: string;
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
  dependencies: string[];
  estimatedIterations: number;
}

interface GeneratedPlan {
  title: string;
  summary: string;
  prds: GeneratedPRD[];
  estimatedComplexity: 'simple' | 'medium' | 'complex';
  suggestedOrder: number[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instancePath, conversationId, messages, userRequest } = body;

    console.log('[Generate PRDs] Received request:', {
      instancePath,
      conversationId,
      messageCount: messages?.length,
    });

    // Validate required fields
    if (!instancePath) {
      return NextResponse.json(
        { error: 'Instance path is required' },
        { status: 400 }
      );
    }

    // Validate path is allowed
    if (!isPathAllowed(instancePath)) {
      return NextResponse.json(
        { error: 'Invalid instance path' },
        { status: 403 }
      );
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Conversation messages are required' },
        { status: 400 }
      );
    }

    // Build the user prompt from conversation
    const conversationText = messages
      .slice(-50) // Limit to last 50 messages
      .map((m: Message) => `${m.role === 'user' ? 'User' : 'Claude'}: ${m.content}`)
      .join('\n\n');

    const userPrompt = `## Conversation to Analyze

${conversationText}

${userRequest ? `\n## Additional User Request\n\n${userRequest}` : ''}

## Your Task

Based on this planning conversation, generate comprehensive PRDs that capture what the user wants to build. Break it down into logical, implementable features. Return your response as valid JSON.`;

    console.log('[Generate PRDs] Calling Anthropic API...');

    // Call Claude to generate PRDs
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      system: PRD_GENERATION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract content from response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    console.log('[Generate PRDs] Received response, parsing JSON...');

    // Parse JSON from response (Claude might wrap it in markdown code blocks)
    let jsonText = content.text;
    const jsonMatch = jsonText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    } else {
      // Try to find JSON without code blocks
      const jsonStartIndex = jsonText.indexOf('{');
      const jsonEndIndex = jsonText.lastIndexOf('}');
      if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
        jsonText = jsonText.slice(jsonStartIndex, jsonEndIndex + 1);
      }
    }

    let generatedPlan: { plan: GeneratedPlan };
    try {
      generatedPlan = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[Generate PRDs] JSON parse error:', parseError);
      console.error('[Generate PRDs] Raw response:', content.text.substring(0, 500));
      throw new Error('Failed to parse PRD generation response as JSON');
    }

    if (!generatedPlan.plan || !generatedPlan.plan.prds) {
      throw new Error('Invalid PRD generation response structure');
    }

    console.log('[Generate PRDs] Generated', generatedPlan.plan.prds.length, 'PRDs');

    // Save PRDs to files
    const prdDir = path.join(instancePath, 'prds');
    await fs.mkdir(prdDir, { recursive: true });

    const savedPrds: Array<GeneratedPRD & { path: string }> = [];
    for (const prd of generatedPlan.plan.prds) {
      // Ensure filename is safe
      const safeFilename = prd.filename.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filePath = path.join(prdDir, safeFilename);

      // Write PRD content to file
      await fs.writeFile(filePath, prd.content, 'utf-8');

      savedPrds.push({
        ...prd,
        filename: safeFilename,
        path: filePath,
      });

      console.log('[Generate PRDs] Saved PRD:', filePath);
    }

    // Save plan metadata
    const stateDir = path.join(instancePath, '.state');
    await fs.mkdir(stateDir, { recursive: true });

    const planMetaPath = path.join(stateDir, 'generated_plan.json');
    const planMeta = {
      ...generatedPlan.plan,
      prds: savedPrds,
      generatedAt: new Date().toISOString(),
      conversationId,
    };

    await fs.writeFile(planMetaPath, JSON.stringify(planMeta, null, 2), 'utf-8');

    console.log('[Generate PRDs] Saved plan metadata:', planMetaPath);

    return NextResponse.json({
      success: true,
      plan: planMeta,
    });
  } catch (error) {
    console.error('[Generate PRDs] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate PRDs',
      },
      { status: 500 }
    );
  }
}
