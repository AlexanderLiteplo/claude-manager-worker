# Skill: OpenAI Integration for Content Generation

## When to Apply
Apply this skill when building features that require AI-generated content, such as:
- LinkedIn post generation
- Marketing copy creation
- Content variation/improvement
- Any GPT-4/LLM integration

## Guidelines

### 1. OpenAI Client Setup

Create a properly configured OpenAI client with error handling.

```typescript
// lib/openai.ts
import OpenAI from 'openai';

// Validate API key at module load
if (!process.env.OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY not set');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Type-safe wrapper for chat completions
export async function generateContent(
  systemPrompt: string,
  userPrompt: string,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const {
    model = 'gpt-4',
    temperature = 0.7,
    maxTokens = 2000,
  } = options;

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      console.error('OpenAI API Error:', error.status, error.message);
      throw new Error(`AI generation failed: ${error.message}`);
    }
    throw error;
  }
}
```

### 2. Structured Output with JSON

When generating multiple items (like posts), request JSON output.

```typescript
// lib/prompts.ts
export const CAMPAIGN_GENERATION_PROMPT = `
You are a LinkedIn marketing expert. Generate LinkedIn posts for a marketing campaign.

For EACH post, output valid JSON in this exact format:
{
  "posts": [
    {
      "hook": "First line that grabs attention",
      "content": "Full post content with line breaks",
      "hashtags": ["#tag1", "#tag2"],
      "postType": "story|tips|question|announcement|behindScenes|results",
      "suggestedDay": 1
    }
  ]
}

LinkedIn best practices to follow:
- Start with a strong hook (curiosity, bold claim, or question)
- Use short paragraphs (1-2 sentences each)
- Include line breaks for readability
- End with a clear CTA or question
- Keep posts 150-300 words for best engagement
`;

// Parsing the response safely
export async function generateCampaignPosts(
  campaignInput: CampaignInput
): Promise<GeneratedPost[]> {
  const userPrompt = `
    Generate ${campaignInput.numberOfPosts} LinkedIn posts for:

    Product: ${campaignInput.productName}
    Description: ${campaignInput.productDescription}
    Target Audience: ${campaignInput.targetAudience}
    Unique Value: ${campaignInput.uniqueValue}

    Campaign Type: ${campaignInput.campaignType}
    Tone: ${campaignInput.tone}
    Include Emojis: ${campaignInput.includeEmojis ? 'Yes, use sparingly' : 'No'}
    Include Hashtags: ${campaignInput.includeHashtags ? 'Yes, 3-5 per post' : 'No'}
  `;

  const response = await generateContent(
    CAMPAIGN_GENERATION_PROMPT,
    userPrompt,
    { temperature: 0.8 } // Higher for creativity
  );

  try {
    const parsed = JSON.parse(response);
    return parsed.posts;
  } catch (error) {
    console.error('Failed to parse AI response:', response);
    throw new Error('AI returned invalid JSON');
  }
}
```

### 3. Error Handling Patterns

Handle OpenAI-specific errors gracefully.

```typescript
import OpenAI from 'openai';

async function generateWithRetry(
  prompt: string,
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateContent(SYSTEM_PROMPT, prompt);
    } catch (error) {
      lastError = error as Error;

      if (error instanceof OpenAI.APIError) {
        // Rate limit - wait and retry
        if (error.status === 429) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`Rate limited, waiting ${waitTime}ms...`);
          await new Promise(r => setTimeout(r, waitTime));
          continue;
        }

        // Server error - retry
        if (error.status >= 500) {
          continue;
        }

        // Client error (bad request, auth) - don't retry
        if (error.status >= 400 && error.status < 500) {
          throw error;
        }
      }
    }
  }

  throw lastError || new Error('Generation failed after retries');
}
```

### 4. Token Management

Be aware of token limits and costs.

```typescript
// Rough estimation: 1 token ≈ 4 characters
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

async function generateWithTokenAwareness(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const inputTokens = estimateTokens(systemPrompt + userPrompt);

  // GPT-4 has 8K context by default
  const MAX_CONTEXT = 8000;
  const MAX_OUTPUT = 2000;

  if (inputTokens > MAX_CONTEXT - MAX_OUTPUT) {
    throw new Error('Prompt too long - reduce input size');
  }

  return generateContent(systemPrompt, userPrompt, {
    maxTokens: Math.min(MAX_OUTPUT, MAX_CONTEXT - inputTokens),
  });
}
```

### 5. API Route Integration

Properly integrate with Next.js API routes.

```typescript
// app/api/ai/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateCampaignPosts } from '@/lib/prompts';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    if (!body.productName || !body.productDescription) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate posts
    const posts = await generateCampaignPosts(body);

    // Create campaign and posts in database
    const campaign = await prisma.campaign.create({
      data: {
        name: `${body.productName} Campaign`,
        productName: body.productName,
        productDescription: body.productDescription,
        targetAudience: body.targetAudience,
        uniqueValue: body.uniqueValue,
        campaignType: body.campaignType,
        tone: body.tone,
        includeEmojis: body.includeEmojis,
        includeHashtags: body.includeHashtags,
        posts: {
          create: posts.map((post, index) => ({
            content: post.content,
            hook: post.hook,
            hashtags: JSON.stringify(post.hashtags),
            postType: post.postType,
            characterCount: post.content.length,
          })),
        },
      },
      include: { posts: true },
    });

    return NextResponse.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Generation failed',
      },
      { status: 500 }
    );
  }
}
```

## Common Mistakes to Avoid

1. **Not validating API key** - Check at startup, not per-request
2. **No error handling** - OpenAI calls can fail for many reasons
3. **Ignoring rate limits** - Implement exponential backoff
4. **Expecting perfect JSON** - Always wrap JSON.parse in try/catch
5. **No token awareness** - Long prompts can exceed context limits
6. **Hardcoding model** - Make it configurable via environment
7. **No retry logic** - Network issues happen; retry gracefully
8. **Blocking UI** - Show loading states during generation

## Environment Variables

```env
# Required
OPENAI_API_KEY=sk-proj-...

# Optional tuning
OPENAI_MODEL=gpt-4           # or gpt-3.5-turbo for cost savings
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7
```

## Testing Without API Calls

For development without using tokens:

```typescript
// lib/openai.ts
const MOCK_MODE = process.env.OPENAI_MOCK === 'true';

export async function generateContent(...): Promise<string> {
  if (MOCK_MODE) {
    return JSON.stringify({
      posts: [
        {
          hook: "This is a mock post hook",
          content: "Mock content for testing...",
          hashtags: ["#mock", "#test"],
          postType: "announcement",
        },
      ],
    });
  }

  // Real implementation...
}
```
