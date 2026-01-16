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

const PRD_SYSTEM_PROMPT = `You are an expert software architect and technical writer. Your task is to draft a Product Requirements Document (PRD) based on the planning conversation.

Format the PRD with the following sections:
# PRD: [Feature Name]

## Overview
[Clear description of what this builds - 2-3 sentences]

## Goals
[3-5 bullet points of what success looks like]

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

## Priority
[High/Medium/Low]

Be specific and technical. Include actual file paths, component names, and API endpoints where applicable.`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instancePath, messages } = body;

    if (!instancePath) {
      return NextResponse.json(
        { error: 'Instance path is required' },
        { status: 400 }
      );
    }

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

    // Build conversation text
    const conversationText = messages
      .slice(-30)
      .map((m: Message) => `${m.role === 'user' ? 'User' : 'Claude'}: ${m.content}`)
      .join('\n\n');

    const userPrompt = `Based on this planning conversation, draft a comprehensive PRD:\n\n${conversationText}`;

    // Call Claude to draft the PRD
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: PRD_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const prdContent = content.text;

    // Extract title from PRD content
    const titleMatch = prdContent.match(/^#\s*PRD:\s*(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled PRD';

    // Generate safe filename
    const safeFilename = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) + '.md';

    // Save the PRD
    const prdDir = path.join(instancePath, 'prds');
    await fs.mkdir(prdDir, { recursive: true });

    const filePath = path.join(prdDir, safeFilename);
    await fs.writeFile(filePath, prdContent, 'utf-8');

    console.log('[Draft PRD] Saved PRD to:', filePath);

    return NextResponse.json({
      success: true,
      prd: prdContent,
      filename: safeFilename,
      path: filePath,
    });
  } catch (error) {
    console.error('[Draft PRD] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to draft PRD' },
      { status: 500 }
    );
  }
}
