import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ConversationData {
  id: string;
  instanceId: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instancePath, conversationId, messages } = body;

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

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Create planning history directory
    const historyDir = path.join(instancePath, '.state', 'planning_history');
    await fs.mkdir(historyDir, { recursive: true });

    const conversationPath = path.join(historyDir, `${conversationId}.json`);

    // Read existing conversation or create new one
    let conversation: ConversationData;
    try {
      const existing = await fs.readFile(conversationPath, 'utf-8');
      conversation = JSON.parse(existing);
      conversation.messages = messages;
      conversation.updatedAt = new Date().toISOString();
    } catch {
      // Create new conversation
      conversation = {
        id: conversationId,
        instanceId: path.basename(instancePath),
        messages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Save conversation
    await fs.writeFile(
      conversationPath,
      JSON.stringify(conversation, null, 2),
      'utf-8'
    );

    console.log('[Save] Saved conversation:', conversationId);

    return NextResponse.json({
      success: true,
      conversationId,
      messageCount: messages.length,
    });
  } catch (error) {
    console.error('[Save] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save conversation' },
      { status: 500 }
    );
  }
}
