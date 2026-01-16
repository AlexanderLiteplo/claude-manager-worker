import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function GET() {
  try {
    // Note: The Anthropic SDK doesn't directly expose usage/billing endpoints
    // We'll need to make a small test call to check if the API key is valid
    // and return basic information

    // Make a minimal API call to test connectivity
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }],
    });

    // Extract usage information from the response
    const usage = response.usage;

    return NextResponse.json({
      status: 'active',
      model: response.model,
      usage: {
        inputTokens: usage?.input_tokens || 0,
        outputTokens: usage?.output_tokens || 0,
        totalTokens: (usage?.input_tokens || 0) + (usage?.output_tokens || 0),
      },
      // Note: Anthropic doesn't provide remaining credits via API
      // This would need to be fetched from their dashboard manually
      message: 'API key is valid and working',
    });
  } catch (error: any) {
    // Check for rate limit errors
    if (error?.status === 429) {
      return NextResponse.json({
        status: 'rate_limited',
        error: 'Rate limit exceeded',
        message: error.message,
      }, { status: 429 });
    }

    // Check for authentication errors
    if (error?.status === 401) {
      return NextResponse.json({
        status: 'unauthorized',
        error: 'Invalid API key',
        message: 'Please check your Anthropic API key',
      }, { status: 401 });
    }

    // Other errors
    return NextResponse.json({
      status: 'error',
      error: error.message || 'Failed to fetch API usage',
    }, { status: 500 });
  }
}
