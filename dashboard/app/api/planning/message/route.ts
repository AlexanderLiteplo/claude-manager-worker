import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

// Generate a conversation ID
function generateConversationId(): string {
  return 'conv_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 11);
}

// Build system prompt for planning assistant
function buildSystemPrompt(context: {
  instanceName: string;
  existingPrds: string[];
  skills: string[];
}): string {
  let prompt = `You are an expert software architect helping to plan a software implementation for the project "${context.instanceName}".

Your role is to help the user:
1. Clarify requirements and understand what they want to build
2. Discuss technical approaches and trade-offs
3. Identify potential edge cases and challenges
4. Help structure their ideas into a clear plan
5. Eventually help draft PRDs (Product Requirements Documents) for implementation

Be concise but thorough. Ask clarifying questions when needed. When the user seems ready, offer to generate PRDs for their features.`;

  // Add context about existing PRDs
  if (context.existingPrds.length > 0) {
    prompt += `\n\nExisting PRDs in this project:\n${context.existingPrds.map(prd => `- ${prd}`).join('\n')}`;
  }

  // Add context about available skills
  if (context.skills.length > 0) {
    prompt += `\n\nAvailable skills/patterns that can be used:\n${context.skills.map(skill => `- ${skill.replace('.md', '')}`).join('\n')}`;
  }

  return prompt;
}

// Convert messages to Anthropic format
function buildMessages(previousMessages: Array<{ role: string; content: string }>, newMessage: string): Array<{ role: 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Add previous messages
  for (const msg of previousMessages) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    });
  }

  // Add new user message
  messages.push({
    role: 'user',
    content: newMessage,
  });

  return messages;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instanceId, message, conversationId, context } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Generate or use existing conversation ID
    const convId = conversationId || generateConversationId();

    // Build system prompt
    const systemPrompt = buildSystemPrompt({
      instanceName: context?.instanceName || instanceId || 'Unknown',
      existingPrds: context?.existingPrds || [],
      skills: context?.skills || [],
    });

    // Build messages array
    const messages = buildMessages(
      context?.previousMessages || [],
      message
    );

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send conversation ID first
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversationId: convId })}\n\n`));

          // Start streaming with Anthropic SDK
          const anthropicStream = await anthropic.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: systemPrompt,
            messages: messages,
          });

          // Stream content to client
          for await (const event of anthropicStream) {
            if (event.type === 'content_block_delta') {
              const delta = event.delta;
              if ('text' in delta) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta.text })}\n\n`));
              }
            }
          }

          // Signal completion
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

        } catch (error) {
          console.error('[Planning API] Anthropic streaming error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[Planning API] Error in planning message route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process message' },
      { status: 500 }
    );
  }
}
