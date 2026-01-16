# Skill: Server-Sent Events (SSE) Streaming Patterns

## When to Apply
Apply this skill when implementing:
- Real-time chat/message streaming from LLMs (Claude, GPT)
- Live updates to the client
- Progress indicators for long operations
- Any scenario requiring server-push updates

## Guidelines

### 1. Server-Side SSE Implementation

Proper SSE response format:

```typescript
// app/api/stream/route.ts
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial connection confirmation
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
        );

        // Stream content
        for await (const chunk of someAsyncIterator()) {
          // SSE format: "data: <content>\n\n"
          const message = JSON.stringify({ type: 'content', data: chunk });
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        }

        // Signal completion
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();

      } catch (error) {
        // Send error to client before closing
        const errorMessage = JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        controller.enqueue(encoder.encode(`data: ${errorMessage}\n\n`));
        controller.close();
      }
    },

    cancel() {
      // Handle client disconnect
      console.log('Client disconnected');
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',  // Disable nginx buffering
    },
  });
}
```

### 2. Client-Side SSE Consumption

Use fetch with proper stream handling:

```typescript
// BAD - No cleanup, no error handling
const response = await fetch('/api/stream', { method: 'POST' });
const reader = response.body?.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // process value
}

// GOOD - With AbortController and proper cleanup
async function streamResponse(
  url: string,
  body: object,
  onChunk: (data: unknown) => void,
  onError: (error: Error) => void,
  onComplete: () => void
): Promise<() => void> {
  const controller = new AbortController();

  const fetchPromise = (async () => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Stream request failed');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Process any remaining buffer
          if (buffer.trim()) {
            processSSEBuffer(buffer, onChunk);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';  // Keep incomplete message

        for (const line of lines) {
          processSSEBuffer(line, onChunk);
        }
      }

      onComplete();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Client intentionally aborted
        return;
      }
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  })();

  // Return cleanup function
  return () => {
    controller.abort();
  };
}

function processSSEBuffer(data: string, onChunk: (data: unknown) => void) {
  for (const line of data.split('\n')) {
    if (line.startsWith('data: ')) {
      const content = line.slice(6);
      if (content === '[DONE]') {
        return;
      }
      try {
        const parsed = JSON.parse(content);
        onChunk(parsed);
      } catch {
        // Not JSON, could be raw text
        onChunk({ content });
      }
    }
  }
}
```

### 3. React Component Integration

Proper cleanup in React:

```typescript
function ChatComponent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    // Cancel any existing stream
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    setIsLoading(true);
    setStreamingContent('');

    // Add user message immediately
    const userMessage = { id: generateId(), role: 'user', content };
    setMessages(prev => [...prev, userMessage]);

    const cleanup = await streamResponse(
      '/api/chat',
      { message: content },
      (data) => {
        // Handle incoming chunks
        if (data.content) {
          setStreamingContent(prev => prev + data.content);
        }
      },
      (error) => {
        setIsLoading(false);
        setError(error.message);
      },
      () => {
        // On complete, move streaming content to messages
        setMessages(prev => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant',
            content: streamingContentRef.current,
          },
        ]);
        setStreamingContent('');
        setIsLoading(false);
      }
    );

    cleanupRef.current = cleanup;
  }, []);

  return (
    // ... component JSX
  );
}
```

### 4. Error Recovery Patterns

Handle transient failures:

```typescript
async function streamWithRetry(
  url: string,
  body: object,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    onChunk: (data: unknown) => void;
    onError: (error: Error, willRetry: boolean) => void;
    onComplete: () => void;
  }
): Promise<void> {
  const { maxRetries = 3, retryDelay = 1000 } = options;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      await new Promise<void>((resolve, reject) => {
        streamResponse(
          url,
          body,
          options.onChunk,
          (error) => {
            const willRetry = attempts < maxRetries - 1;
            options.onError(error, willRetry);
            reject(error);
          },
          () => {
            options.onComplete();
            resolve();
          }
        );
      });
      return;  // Success
    } catch (error) {
      attempts++;
      if (attempts < maxRetries) {
        await new Promise(r => setTimeout(r, retryDelay * attempts));
      }
    }
  }
}
```

### 5. Progress Events

For long operations, send progress updates:

```typescript
// Server
async function* processWithProgress(items: Item[]) {
  for (let i = 0; i < items.length; i++) {
    const result = await processItem(items[i]);

    yield {
      type: 'progress',
      current: i + 1,
      total: items.length,
      percent: Math.round(((i + 1) / items.length) * 100),
    };

    yield {
      type: 'item',
      data: result,
    };
  }
}

// Client
interface ProgressEvent {
  type: 'progress';
  current: number;
  total: number;
  percent: number;
}

function isProgressEvent(data: unknown): data is ProgressEvent {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    data.type === 'progress'
  );
}

// In handler
onChunk: (data) => {
  if (isProgressEvent(data)) {
    setProgress(data.percent);
  } else if (data.type === 'item') {
    setItems(prev => [...prev, data.data]);
  }
}
```

### 6. Heartbeat for Long Connections

Keep connections alive:

```typescript
// Server - send heartbeat every 15 seconds
const stream = new ReadableStream({
  async start(controller) {
    const heartbeatInterval = setInterval(() => {
      controller.enqueue(encoder.encode(': heartbeat\n\n'));
    }, 15000);

    try {
      // ... stream content
    } finally {
      clearInterval(heartbeatInterval);
    }
  },
});
```

## Common Mistakes to Avoid

1. **No AbortController cleanup** - Memory leaks and zombie connections
2. **Not handling partial chunks** - SSE data can be split across reads
3. **Missing error events** - Client needs to know about failures
4. **No reconnection logic** - Network issues happen
5. **Forgetting heartbeats** - Proxies may close idle connections
6. **Not disabling buffering** - Nginx/proxies buffer by default
7. **Using EventSource for POST** - Native EventSource only supports GET

## Testing SSE

```typescript
// Mock SSE for tests
function createMockSSEResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  let index = 0;

  const stream = new ReadableStream({
    async pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(`data: ${chunks[index]}\n\n`));
        index++;
      } else {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

// In test
jest.spyOn(global, 'fetch').mockResolvedValue(
  createMockSSEResponse(['{"content":"Hello"}', '{"content":" World"}'])
);
```
