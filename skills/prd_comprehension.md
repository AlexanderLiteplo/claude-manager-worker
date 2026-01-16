# Skill: PRD Comprehension and Verification

## When to Apply
Apply this skill **before writing any code** when starting a new project or iteration. This is the most critical skill - building the wrong project wastes all effort.

## Guidelines

### 1. Read the PRD Title First

The title tells you exactly what to build. If the title says "LinkedIn Auto-Poster", you're building a LinkedIn tool, not an email system.

```
PRD Title: "LinkedIn Auto-Poster with AI Marketing Campaign Generator"

What this means:
- Platform: LinkedIn (NOT email, NOT Twitter, NOT generic CRM)
- Feature: Auto-posting (scheduling and publishing posts)
- Technology: AI-powered (needs OpenAI/LLM integration)
- Purpose: Marketing campaigns (generating promotional content)

What this does NOT mean:
- Lead generation
- Email outreach
- CRM functionality
- Analytics dashboard
```

### 2. Identify the Core Domain

Before writing any code, answer: "What are the main NOUNS in this system?"

For "LinkedIn Auto-Poster":
- **Campaign** - A collection of posts for a product
- **Post** - A LinkedIn post with content, hook, hashtags
- **Template** - Reusable post formats

NOT:
- Lead (that's a CRM/sales tool)
- Email (that's an email marketing tool)
- User/Auth (secondary concern)

### 3. Identify the Core Actions

What are the main VERBS in this system?

For "LinkedIn Auto-Poster":
- **Generate** posts using AI
- **Schedule** posts for specific times
- **Preview** posts in LinkedIn style
- **Copy** content to clipboard
- **Mark** posts as published

NOT:
- Score leads
- Send emails
- Track opens/clicks

### 4. Extract the Tech Stack from PRD

The PRD specifies exact technologies. Use them.

```markdown
## From PRD - Technical Requirements

### Stack
- **Language**: Node.js with TypeScript  ✓
- **Framework**: Next.js 14 (App Router)  ✓
- **Database**: SQLite with Prisma        ✓
- **AI**: OpenAI GPT-4                    ← CRITICAL - not Resend!
- **UI**: Tailwind CSS + shadcn/ui        ✓
- **Scheduling**: node-cron               ← Not email tracking
```

### 5. Verify Schema Against PRD Before Coding

The PRD often includes exact schema definitions. Use them.

```prisma
// PRD says Campaign has these fields:
model Campaign {
  productName        String    // ← Product being marketed
  productDescription String    // ← What the product does
  targetAudience     String    // ← Who it's for
  uniqueValue        String    // ← What makes it special
  campaignType       String    // ← launch, features, testimonials
  tone               String    // ← professional, casual, bold
  // ...
}

// If your schema has "contactEmail", "leadScore", "industry"
// you're building the wrong project!
```

### 6. Cross-Check Your Implementation Plan

Before starting Iteration 0, verify:

| PRD Requirement | Your Plan |
|-----------------|-----------|
| OpenAI for AI generation | ✓ lib/openai.ts |
| LinkedIn preview component | ✓ LinkedInPreview.tsx |
| Character counter (3000 limit) | ✓ CharacterCounter.tsx |
| Copy to clipboard | ✓ Copy button in PostEditor |

If your plan has items not in the PRD (email tracking, lead scoring), STOP.

## Examples

### Bad: Misreading the PRD

```
PRD: "LinkedIn Auto-Poster with AI Marketing Campaign Generator"

Developer thinks: "Marketing campaign... that means email campaigns!"
Developer builds: Email lead generator with Resend API

WRONG - "Marketing campaign" in context of LinkedIn means post campaigns
```

### Good: Correct PRD Interpretation

```
PRD: "LinkedIn Auto-Poster with AI Marketing Campaign Generator"

Developer thinks: "LinkedIn posts, AI generation, campaign = multiple posts"
Developer plans:
1. Campaign model with product details
2. Post model with LinkedIn-specific fields (hook, hashtags)
3. OpenAI integration for content generation
4. LinkedIn preview component
5. Copy to clipboard functionality

CORRECT - All features relate to LinkedIn posting
```

## Verification Checklist

Before writing ANY code, verify:

- [ ] I read the PRD title and understand the platform (LinkedIn, not email)
- [ ] I identified the core domain objects (Campaign, Post, not Lead, Email)
- [ ] I identified the core actions (generate, schedule, preview, copy)
- [ ] My tech stack matches the PRD (OpenAI, not Resend)
- [ ] My schema matches the PRD models
- [ ] My file structure matches the PRD requirements
- [ ] I'm NOT building features from a different project

## Common Mistakes to Avoid

1. **Confusing similar terms** - "Campaign" in email marketing vs "Campaign" in LinkedIn posting
2. **Using familiar patterns** - Don't default to what you've built before
3. **Skipping PRD sections** - The Technical Requirements section is critical
4. **Adding unrequested features** - Email tracking wasn't requested
5. **Context confusion** - Don't mix up requirements from different projects

## When in Doubt

If you're unsure what to build:
1. Re-read the PRD title
2. Look at the "User Stories" section
3. Check the "Acceptance Criteria"
4. Look at the "File Structure" section

The PRD contains everything you need. Read it carefully.

## Critical Distinction: Editing vs Generating

A common mistake is confusing these two fundamentally different features:

### PRD says "Editor"
**Key indicators:**
- "Open any PRD in a live editor"
- "Edit markdown directly"
- "Version history"
- "Revert to previous versions"
- File path contains `/[prdFile]/` - editing specific files

**What to build:**
- Load EXISTING files
- Allow modifications
- Save changes
- Track versions
- Show diffs

### PRD says "Generator"
**Key indicators:**
- "Create new PRD"
- "Generate from prompt"
- "AI writes the content"
- File path contains `/new` or no file parameter

**What to build:**
- Empty starting state
- AI creates content from scratch
- Save as new file

### Case Study: Review #13 Error

```
PRD Title: "Live PRD Editor with AI Assistance"

PRD User Story: "Open any PRD in a live editor"
PRD Acceptance: "Revert to any previous version"
PRD File Structure: "/prd-editor/[instanceId]/[prdFile]/page.tsx"

Incorrect interpretation: Built a PRD Generator
Correct interpretation: Should have built an Editor for existing PRDs

Key insight: The file path `/[prdFile]/` means we're operating on
a SPECIFIC EXISTING file, not creating new ones.
```

## File Path Indicators

Pay attention to dynamic route segments:

| Route Structure | Meaning |
|-----------------|---------|
| `/editor/[fileId]/page.tsx` | Editing a specific file (fileId is the target) |
| `/generator/page.tsx` | Creating something new (no file specified) |
| `/[instanceId]/[prdFile]/page.tsx` | Editing prdFile within instance |
| `/[instanceId]/new/page.tsx` | Creating new item in instance |

**The presence of a file parameter in the route strongly suggests editing, not generating.**
