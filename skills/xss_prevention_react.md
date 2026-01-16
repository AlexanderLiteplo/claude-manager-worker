# Skill: XSS Prevention in React Components

## When to Apply
Apply this skill when rendering any content that originates from:
- User input (messages, comments, names)
- API responses that contain user-generated content
- URL parameters
- Database fields with user data
- Any external source

## Guidelines

### 1. Understand React's Default Protections

React automatically escapes content in JSX text nodes:

```tsx
// SAFE - React escapes this automatically
const username = '<script>alert("xss")</script>';
return <div>{username}</div>;
// Renders as: <div>&lt;script&gt;alert("xss")&lt;/script&gt;</div>
```

However, there are MANY cases where React does NOT protect you:

### 2. Dangerous Patterns to Avoid

#### Using `dangerouslySetInnerHTML`
```tsx
// DANGEROUS - XSS vulnerability!
const userContent = '<img src=x onerror="alert(1)">';
return <div dangerouslySetInnerHTML={{ __html: userContent }} />;

// If you MUST use it, sanitize first
import DOMPurify from 'dompurify';
return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />;
```

#### Dynamic href/src attributes
```tsx
// DANGEROUS - javascript: URLs bypass React escaping
const userUrl = 'javascript:alert(1)';
return <a href={userUrl}>Click me</a>;  // XSS!

// SAFE - Validate URL protocol
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

const safeUrl = isSafeUrl(userUrl) ? userUrl : '#';
return <a href={safeUrl}>Click me</a>;
```

#### DOM manipulation
```tsx
// DANGEROUS - Direct DOM manipulation bypasses React
const handleClick = () => {
  document.getElementById('target').innerHTML = userContent;  // XSS!
};

// SAFE - Use React state instead
const [content, setContent] = useState('');
return <div>{content}</div>;
```

#### Style injection
```tsx
// DANGEROUS - CSS injection can be exploited
const userStyle = 'background: url("javascript:alert(1)")';
return <div style={{ background: userStyle }}>Content</div>;

// SAFE - Use allowlist of CSS properties and validate values
const allowedBackgrounds = ['red', 'blue', 'green', '#fff'];
const safeBackground = allowedBackgrounds.includes(userStyle) ? userStyle : 'white';
```

### 3. Content Rendering Patterns

When rendering user content that might contain formatting:

```tsx
// BAD - Custom parsing without escaping
function renderContent(text: string) {
  // This is vulnerable because the regex replacement doesn't escape
  return text.replace(/`([^`]+)`/g, '<code>$1</code>');
}
// Returns raw HTML string that could contain XSS

// GOOD - Use React elements, not HTML strings
function renderContent(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyIndex = 0;

  const codeRegex = /`([^`]+)`/g;
  let match;

  while ((match = codeRegex.exec(text)) !== null) {
    // Add text before match (React auto-escapes this)
    if (match.index > lastIndex) {
      parts.push(
        <span key={keyIndex++}>{text.slice(lastIndex, match.index)}</span>
      );
    }

    // Add code element (content is auto-escaped by React)
    parts.push(
      <code key={keyIndex++} className="inline-code">
        {match[1]}
      </code>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={keyIndex++}>{text.slice(lastIndex)}</span>);
  }

  return parts;
}
```

### 4. HTML Escaping Utility

When you need to escape HTML for non-React contexts:

```typescript
// lib/sanitize.ts

// Basic HTML escape for display
export function escapeHtml(str: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => escapeMap[char]);
}

// For attributes specifically (more thorough)
export function escapeAttribute(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`/g, '&#96;')
    .replace(/\//g, '&#47;');
}

// URL encoding for URL parameters
export function encodeUrlParam(str: string): string {
  return encodeURIComponent(str);
}
```

### 5. Third-Party Markdown/Rich Text

If you need to render markdown or rich text:

```tsx
// Use a well-tested library with XSS protection
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Default is safe - no HTML passthrough
<ReactMarkdown remarkPlugins={[remarkGfm]}>
  {userMarkdown}
</ReactMarkdown>

// DANGEROUS - Don't enable raw HTML without sanitization
// rehypeRaw is dangerous with user content!
```

Or use DOMPurify for HTML:

```tsx
import DOMPurify from 'dompurify';

function SafeHtml({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'class'],
  });

  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}
```

### 6. Copy to Clipboard Safety

When copying user content:

```tsx
// SAFE - navigator.clipboard.writeText handles escaping
const handleCopy = async () => {
  await navigator.clipboard.writeText(userContent);
};

// BUT be careful with clipboard read
// Don't paste clipboard content directly into DOM without validation
```

### 7. URL Parameter Handling

```tsx
// BAD - Using URL params directly
const searchParams = useSearchParams();
const redirect = searchParams.get('redirect');
window.location.href = redirect;  // Open redirect vulnerability!

// GOOD - Validate URLs
const searchParams = useSearchParams();
const redirect = searchParams.get('redirect');

function isAllowedRedirect(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    // Only allow same-origin redirects
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

if (redirect && isAllowedRedirect(redirect)) {
  router.push(redirect);
} else {
  router.push('/');
}
```

## Common Mistakes to Avoid

1. **Assuming React escapes everything** - It doesn't escape URLs, styles, or `innerHTML`
2. **Custom HTML generation** - Always return React elements, not HTML strings
3. **URL validation only checking `http/https`** - `javascript:` URLs need explicit blocking
4. **Forgetting about event handlers** - `onclick` attributes can contain code
5. **Not sanitizing markdown** - Markdown can contain HTML, scripts
6. **Copy/paste from clipboard** - Don't trust clipboard content
7. **SVG content** - SVGs can contain scripts

## Testing for XSS

Test your components with these payloads:

```typescript
const xssPayloads = [
  '<script>alert(1)</script>',
  '<img src=x onerror="alert(1)">',
  '<svg onload="alert(1)">',
  'javascript:alert(1)',
  '<a href="javascript:alert(1)">click</a>',
  '"><script>alert(1)</script>',
  "'-alert(1)-'",
  '<iframe src="javascript:alert(1)">',
];

// In tests, verify none of these execute
```

## Example: Safe Message Rendering

```tsx
import { memo } from 'react';

interface MessageProps {
  content: string;
  author: string;
}

// Safe rendering with inline code support
function renderSafeContent(text: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let key = 0;

  // Split by code blocks (```...```)
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Text before code block (React auto-escapes)
    if (match.index > lastIndex) {
      result.push(
        <span key={key++}>
          {renderInlineCode(text.slice(lastIndex, match.index))}
        </span>
      );
    }

    // Code block (content is auto-escaped)
    result.push(
      <pre key={key++} className="code-block">
        <code>{match[2]}</code>
      </pre>
    );

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    result.push(
      <span key={key++}>
        {renderInlineCode(text.slice(lastIndex))}
      </span>
    );
  }

  return result;
}

function renderInlineCode(text: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let key = 0;
  let lastIndex = 0;

  const inlineRegex = /`([^`]+)`/g;
  let match;

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      // Plain text - React escapes this
      result.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    // Inline code - React escapes the content
    result.push(<code key={key++}>{match[1]}</code>);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    result.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return result.length > 0 ? result : [<span key={0}>{text}</span>];
}

function MessageComponent({ content, author }: MessageProps) {
  return (
    <div className="message">
      {/* Author is escaped by React */}
      <div className="author">{author}</div>

      {/* Content is safely rendered via React elements */}
      <div className="content">
        {renderSafeContent(content)}
      </div>
    </div>
  );
}

export const Message = memo(MessageComponent);
```
