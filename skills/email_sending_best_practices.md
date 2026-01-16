# Skill: Email Sending Best Practices

## When to Apply
Apply this skill when implementing email functionality including:
- Transactional emails (password reset, notifications)
- Marketing/outreach emails
- Email tracking (opens, clicks)
- Bulk email campaigns

## Guidelines

### 1. Validate Email Addresses Before Sending

Don't waste API calls on invalid emails.

```typescript
// BAD - No validation
async function sendEmail(to: string, subject: string, body: string) {
  return await resend.emails.send({ from, to, subject, html: body });
}

// GOOD - Validate first
async function sendEmail(to: string, subject: string, body: string) {
  if (!isValidEmail(to)) {
    return { success: false, error: 'Invalid email address format' };
  }

  try {
    const result = await resend.emails.send({ from, to, subject, html: body });
    return { success: true, id: result.data?.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Basic validation - catches obvious issues
function isValidEmail(email: string): boolean {
  // Check format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return false;
  }

  // Check length (RFC 5321: max 254 chars)
  if (email.length > 254) {
    return false;
  }

  // Check for common typos
  const domain = email.split('@')[1].toLowerCase();
  const typos: Record<string, string> = {
    'gmial.com': 'gmail.com',
    'gmal.com': 'gmail.com',
    'gamil.com': 'gmail.com',
    'yahooo.com': 'yahoo.com',
  };

  if (typos[domain]) {
    console.warn(`Possible typo in email domain: ${domain} -> ${typos[domain]}`);
  }

  return true;
}
```

### 2. Handle Email Provider Errors Gracefully

Different error types require different handling.

```typescript
interface SendResult {
  success: boolean;
  id?: string;
  error?: {
    code: 'INVALID_EMAIL' | 'RATE_LIMITED' | 'BOUNCE' | 'API_ERROR' | 'UNKNOWN';
    message: string;
    retryable: boolean;
  };
}

async function sendEmail(options: EmailOptions): Promise<SendResult> {
  try {
    const { data, error } = await resend.emails.send(options);

    if (error) {
      return {
        success: false,
        error: classifyError(error),
      };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    // Network errors, timeouts, etc.
    return {
      success: false,
      error: {
        code: 'UNKNOWN',
        message: error instanceof Error ? error.message : 'Unknown error',
        retryable: true, // Network errors are usually retryable
      },
    };
  }
}

function classifyError(error: any): SendResult['error'] {
  const message = error.message?.toLowerCase() || '';

  if (message.includes('rate limit')) {
    return { code: 'RATE_LIMITED', message: error.message, retryable: true };
  }
  if (message.includes('invalid') || message.includes('not found')) {
    return { code: 'INVALID_EMAIL', message: error.message, retryable: false };
  }
  if (message.includes('bounce')) {
    return { code: 'BOUNCE', message: error.message, retryable: false };
  }

  return { code: 'API_ERROR', message: error.message, retryable: true };
}
```

### 3. Implement Proper Rate Limiting

Don't hammer the email provider.

```typescript
// BAD - Blast all emails at once
async function sendBulkEmails(emails: EmailOptions[]): Promise<void> {
  await Promise.all(emails.map(email => sendEmail(email)));
  // This could hit rate limits with 100+ emails
}

// GOOD - Controlled concurrency with backoff
async function sendBulkEmails(
  emails: EmailOptions[],
  options: { concurrency?: number; delayMs?: number } = {}
): Promise<SendResult[]> {
  const { concurrency = 10, delayMs = 100 } = options;
  const results: SendResult[] = [];

  for (let i = 0; i < emails.length; i += concurrency) {
    const batch = emails.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map(email => sendEmail(email))
    );
    results.push(...batchResults);

    // Check for rate limiting
    const rateLimited = batchResults.some(r => r.error?.code === 'RATE_LIMITED');
    if (rateLimited) {
      console.log('Rate limited, backing off...');
      await sleep(5000); // Wait 5 seconds on rate limit
    } else if (i + concurrency < emails.length) {
      await sleep(delayMs); // Small delay between batches
    }
  }

  return results;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
```

### 4. Track Email Status Properly

Update status through the email lifecycle.

```typescript
enum EmailStatus {
  QUEUED = 'queued',       // In queue, not sent yet
  SENDING = 'sending',     // Currently being sent
  SENT = 'sent',           // API accepted the email
  DELIVERED = 'delivered', // Confirmed delivered
  BOUNCED = 'bounced',     // Hard bounce
  FAILED = 'failed',       // Permanent failure
}

async function sendAndTrack(emailId: string): Promise<void> {
  // Mark as sending
  await prisma.email.update({
    where: { id: emailId },
    data: { status: EmailStatus.SENDING },
  });

  const email = await prisma.email.findUnique({ where: { id: emailId } });
  if (!email) return;

  const result = await sendEmail({
    to: email.to,
    subject: email.subject,
    html: email.body,
  });

  if (result.success) {
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: EmailStatus.SENT,
        sentAt: new Date(),
        externalId: result.id,
      },
    });
  } else if (result.error?.retryable) {
    // Reset to queued for retry
    await prisma.email.update({
      where: { id: emailId },
      data: { status: EmailStatus.QUEUED },
    });
  } else {
    // Permanent failure
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: EmailStatus.FAILED,
        errorMessage: result.error?.message,
      },
    });
  }
}
```

### 5. Secure Your Tracking Endpoints

Tracking endpoints are publicly accessible - secure them.

```typescript
// BAD - No validation
app.get('/api/track/open/:id', async (req, res) => {
  await recordEmailOpen(req.params.id);
  res.sendFile('pixel.gif');
});

// GOOD - Rate limited with validation
const trackingLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 100, // 100 requests per minute per IP
});

app.get('/api/track/open/:id', trackingLimiter, async (req, res) => {
  const { id } = req.params;

  // Validate UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).send('Invalid tracking ID');
  }

  // Record open (don't await - respond immediately)
  recordEmailOpen(id).catch(console.error);

  // Return tracking pixel
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.send(TRACKING_PIXEL);
});
```

### 6. Prevent Open Redirect in Click Tracking

Validate destination URLs.

```typescript
// BAD - Open redirect vulnerability
app.get('/api/track/click/:id', async (req, res) => {
  const url = req.query.url as string;
  await recordEmailClick(req.params.id);
  res.redirect(url); // Attacker could redirect to malicious site!
});

// GOOD - Validate the redirect URL
const ALLOWED_REDIRECT_PROTOCOLS = ['https:', 'http:'];
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0'];

app.get('/api/track/click/:id', async (req, res) => {
  const rawUrl = req.query.url as string;

  if (!rawUrl) {
    return res.status(400).send('Missing URL parameter');
  }

  try {
    const url = new URL(rawUrl);

    // Check protocol
    if (!ALLOWED_REDIRECT_PROTOCOLS.includes(url.protocol)) {
      return res.status(400).send('Invalid URL protocol');
    }

    // Check for localhost/internal redirects
    if (BLOCKED_HOSTS.some(h => url.hostname.includes(h))) {
      return res.status(400).send('Invalid redirect destination');
    }

    // Record click then redirect
    await recordEmailClick(req.params.id);
    res.redirect(url.toString());
  } catch (error) {
    return res.status(400).send('Invalid URL');
  }
});
```

### 7. Include Required Email Elements

Don't forget legal requirements.

```typescript
function buildEmail(content: string, options: { trackingId: string }): string {
  let html = content;

  // Add tracking pixel
  html += `\n<img src="${BASE_URL}/api/track/open/${options.trackingId}" width="1" height="1" alt="" style="display:block" />`;

  // Add unsubscribe footer (CAN-SPAM requirement)
  html += `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
      <p>You're receiving this email because you're a contact of ours.</p>
      <p><a href="${BASE_URL}/unsubscribe?id=${options.trackingId}">Unsubscribe</a> | <a href="${BASE_URL}/preferences?id=${options.trackingId}">Email preferences</a></p>
      <p>Company Name, 123 Street, City, State 12345</p>
    </div>
  `;

  return html;
}
```

## Common Mistakes to Avoid

1. **Not validating emails** - Invalid emails waste API calls and hurt sender reputation
2. **Ignoring rate limits** - Will cause emails to fail and possibly get your account suspended
3. **Open redirects** - Click tracking endpoints need URL validation
4. **No retry logic** - Transient failures should be retried
5. **Blocking on tracking** - Recording opens/clicks should not delay the response
6. **Missing unsubscribe** - Required by CAN-SPAM; also just good practice
7. **Caching tracking pixels** - `Cache-Control: no-store` prevents false opens
8. **Hardcoding sender info** - Use environment variables for from address, company info
