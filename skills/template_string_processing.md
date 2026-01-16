# Skill: Safe Template String Processing

## When to Apply
Apply this skill when implementing template systems, string replacement, or any user-facing text personalization including:
- Email template variables ({{name}}, {{company}})
- Dynamic content generation
- String interpolation with user data
- URL parameter construction

## Guidelines

### 1. Replace ALL Occurrences

The most common bug: using `String.replace()` which only replaces the first match.

```typescript
// BAD - Only replaces first occurrence
function replaceVariables(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(`{{${key}}}`, value);
  }
  return result;
}

// Input: "Hi {{name}}, welcome {{name}}!"
// Output: "Hi John, welcome {{name}}!"  // BUG!
```

```typescript
// GOOD - Replaces all occurrences
function replaceVariables(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

// Input: "Hi {{name}}, welcome {{name}}!"
// Output: "Hi John, welcome John!"
```

Or use a regex with global flag:
```typescript
// GOOD - Regex with global flag
function replaceVariables(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return vars[varName] ?? match; // Keep original if no value
  });
}
```

### 2. Escape HTML When Inserting User Data

User data in HTML templates can lead to XSS vulnerabilities.

```typescript
// BAD - XSS vulnerability
const html = `<p>Hello, {{name}}!</p>`;
const result = replaceVariables(html, { name: '<script>alert("xss")</script>' });
// Output: <p>Hello, <script>alert("xss")</script>!</p>  // Dangerous!
```

```typescript
// GOOD - Escape HTML entities
function escapeHtml(str: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (char) => escapeMap[char]);
}

function replaceVariablesHtml(template: string, vars: Record<string, string>): string {
  const escapedVars = Object.fromEntries(
    Object.entries(vars).map(([k, v]) => [k, escapeHtml(v)])
  );
  return template.replaceAll(/\{\{(\w+)\}\}/g, (match, varName) => {
    return escapedVars[varName] ?? match;
  });
}
```

### 3. URL-Encode When Building URLs

When inserting values into URLs, always encode them.

```typescript
// BAD - URL can break with special characters
const trackingUrl = `${baseUrl}/track?id=${trackingId}&name=${userName}`;
// If userName is "John Doe", URL is malformed

// GOOD - Encode all dynamic values
const trackingUrl = `${baseUrl}/track?id=${encodeURIComponent(trackingId)}&name=${encodeURIComponent(userName)}`;

// BETTER - Use URLSearchParams
const url = new URL(`${baseUrl}/track`);
url.searchParams.set('id', trackingId);
url.searchParams.set('name', userName);
const trackingUrl = url.toString();
```

### 4. Provide Meaningful Fallbacks

Don't leave placeholders visible to end users.

```typescript
// BAD - Shows ugly placeholders
result = result.replace('{{name}}', name || '{{name}}');

// ALSO BAD - Empty string looks broken
result = result.replace('{{name}}', name || '');
// Output: "Hi ," - missing name is confusing

// GOOD - Context-appropriate fallback
result = result.replace('{{name}}', name || 'there');
// Output: "Hi there," - grammatically correct
```

### 5. Validate Template Syntax

Catch template errors before runtime.

```typescript
function validateTemplate(template: string, availableVars: string[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const usedVars = new Set<string>();

  // Find all variable references
  const matches = template.matchAll(/\{\{(\w+)\}\}/g);
  for (const match of matches) {
    const varName = match[1];
    usedVars.add(varName);

    if (!availableVars.includes(varName)) {
      errors.push(`Unknown variable: {{${varName}}}`);
    }
  }

  // Check for unclosed braces
  const unclosed = template.match(/\{\{(?![^}]*\}\})/g);
  if (unclosed) {
    errors.push(`Unclosed template braces found`);
  }

  return { valid: errors.length === 0, errors };
}
```

### 6. Handle Missing Variables Gracefully

Decide on a strategy and be consistent.

```typescript
type MissingVarStrategy = 'keep' | 'remove' | 'placeholder' | 'throw';

function replaceVariables(
  template: string,
  vars: Record<string, string>,
  options: { onMissing: MissingVarStrategy } = { onMissing: 'placeholder' }
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    const value = vars[varName];

    if (value !== undefined) {
      return value;
    }

    switch (options.onMissing) {
      case 'keep':
        return match; // Keep {{varName}}
      case 'remove':
        return ''; // Remove entirely
      case 'placeholder':
        return `[${varName}]`; // Show [varName]
      case 'throw':
        throw new Error(`Missing template variable: ${varName}`);
    }
  });
}
```

## Examples

### Bad Example - Multiple Issues
```typescript
function personalizeEmail(template: string, lead: Lead): string {
  let result = template;
  result = result.replace('{{companyName}}', lead.companyName);
  result = result.replace('{{name}}', lead.contactName);
  result = result.replace('{{title}}', lead.contactTitle);

  const trackingUrl = `${BASE_URL}/track?id=${lead.id}&email=${lead.email}`;
  result = result.replace('{{trackingUrl}}', trackingUrl);

  return result;
}
```
Issues:
1. Only replaces first occurrence of each variable
2. No fallbacks for missing values
3. No HTML escaping
4. URL not properly encoded

### Good Example - Robust Implementation
```typescript
function personalizeEmail(template: string, lead: Lead): string {
  const vars: Record<string, string> = {
    companyName: escapeHtml(lead.companyName),
    name: escapeHtml(lead.contactName || 'there'),
    title: escapeHtml(lead.contactTitle || 'your team'),
  };

  // Build tracking URL safely
  const trackingUrl = new URL(`${BASE_URL}/track`);
  trackingUrl.searchParams.set('id', lead.id);
  trackingUrl.searchParams.set('email', lead.email);
  vars.trackingUrl = trackingUrl.toString();

  // Replace all occurrences
  return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return vars[varName] ?? `[${varName}]`;
  });
}
```

## Common Mistakes to Avoid

1. **Using `replace()` instead of `replaceAll()`** - Will only replace the first occurrence
2. **Not escaping HTML** - Leads to XSS vulnerabilities in email/web templates
3. **Not URL-encoding** - Breaks URLs with special characters
4. **Empty string fallbacks** - Creates grammatically incorrect text
5. **Silent failures for missing vars** - User sees broken template
6. **No template validation** - Typos in variable names go unnoticed
7. **Case sensitivity issues** - `{{Name}}` vs `{{name}}` should be handled consistently
