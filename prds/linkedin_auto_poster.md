# PRD: LinkedIn Auto-Poster with AI Marketing Campaign Generator

## Overview

Build an AI-powered LinkedIn content creation and scheduling tool. Users describe an app/product they've built, and the AI generates a complete marketing campaign with multiple LinkedIn posts. Posts can be scheduled, previewed, and either auto-posted via browser automation or copied for manual posting.

## Goals

1. Generate full marketing campaigns from a simple app description
2. Create varied, engaging LinkedIn post content (text, hooks, CTAs)
3. Schedule posts across days/weeks for consistent presence
4. Provide post previews that match LinkedIn's actual appearance
5. Track which posts have been published
6. Support multiple campaigns for different products

## Target Directory

Create all code in `/output/src/`

## User Stories

### As a user, I want to:
1. Describe my app/product in a few sentences and get a full marketing campaign
2. Choose campaign style (launch announcement, feature highlights, testimonials, thought leadership)
3. Preview posts exactly as they'll appear on LinkedIn
4. Edit AI-generated posts before scheduling
5. Set a posting schedule (e.g., Mon/Wed/Fri at 9am)
6. Get reminders when it's time to post
7. Copy posts to clipboard with one click for manual posting
8. Track which posts are published vs pending
9. Generate variations of posts for A/B testing
10. Save successful post templates for reuse

## Technical Requirements

### Stack
- **Language**: Node.js with TypeScript
- **Framework**: Next.js 14 (App Router)
- **Database**: SQLite with Prisma (simple local storage)
- **AI**: OpenAI GPT-4 for content generation
- **UI**: Tailwind CSS + shadcn/ui
- **Scheduling**: node-cron for local reminders
- **Authentication**: Simple password (single user)

### Environment Variables
```env
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE
DATABASE_URL="file:./linkedin.db"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Core Features

#### 1. Campaign Generator

**Input Form**
```typescript
interface CampaignInput {
  productName: string;
  productDescription: string;       // What does it do?
  targetAudience: string;           // Who is it for?
  uniqueValue: string;              // What makes it special?
  campaignType: 'launch' | 'features' | 'testimonials' | 'thought_leadership' | 'mixed';
  numberOfPosts: number;            // 5-20 posts
  tone: 'professional' | 'casual' | 'bold' | 'educational';
  includeEmojis: boolean;
  includeHashtags: boolean;
}
```

**AI Generation Prompt Structure**
```
You are a LinkedIn marketing expert. Generate {numberOfPosts} LinkedIn posts for:

Product: {productName}
Description: {productDescription}
Target Audience: {targetAudience}
Unique Value: {uniqueValue}

Campaign Type: {campaignType}
Tone: {tone}

For each post, create:
1. A compelling hook (first line that grabs attention)
2. Main content (2-4 short paragraphs, use line breaks)
3. Call-to-action
4. Relevant hashtags (if enabled)

Vary the post types:
- Story/personal experience
- Tips/how-to
- Question/engagement bait
- Announcement/news
- Behind-the-scenes
- Results/social proof

Each post should be 150-300 words, optimized for LinkedIn's algorithm.
```

#### 2. Post Editor

**Post Data Model**
```typescript
interface Post {
  id: string;
  campaignId: string;

  // Content
  content: string;
  hook: string;              // First line (for preview)
  hashtags: string[];

  // Media (optional)
  imageUrl?: string;

  // Scheduling
  scheduledFor?: Date;
  status: 'draft' | 'scheduled' | 'published' | 'skipped';
  publishedAt?: Date;

  // Metadata
  postType: 'story' | 'tips' | 'question' | 'announcement' | 'behindScenes' | 'results';
  characterCount: number;

  createdAt: Date;
  updatedAt: Date;
}
```

**Editor Features**
- Rich text editing (bold, italic, line breaks)
- Character counter (LinkedIn limit: 3000 chars, ideal: 150-300)
- Hook strength indicator
- Hashtag suggestions
- Emoji picker
- Image upload/URL
- LinkedIn preview (shows exactly how it will look)

#### 3. Scheduling System

**Schedule Options**
- Specific date/time picker
- Recurring schedule (e.g., every Monday at 9am)
- Bulk scheduling wizard (spread posts across days)
- Time zone support

**Optimal Posting Times (pre-configured)**
- Tuesday-Thursday: 8-10am, 12pm, 5-6pm
- Avoid weekends and Monday mornings

**Notification System**
- Browser notifications when it's time to post
- Email reminders (optional)
- Dashboard shows "Post Now" for due posts

#### 4. Publishing Workflow

Since LinkedIn's API is restrictive for personal posting, support two modes:

**Mode 1: Manual Copy (Default)**
1. Dashboard shows scheduled post is due
2. User clicks "Ready to Post"
3. Post content copied to clipboard
4. Opens LinkedIn in new tab (compose window)
5. User pastes and posts
6. User clicks "Mark as Published"

**Mode 2: Browser Extension (Stretch Goal)**
- Chrome extension that can post directly
- Uses browser automation to fill LinkedIn compose
- Still requires user to click "Post" for safety

#### 5. Analytics & Tracking

**Track Per Post**
- Published: Yes/No
- Scheduled time vs actual post time
- Notes field for recording engagement (likes, comments)

**Campaign Dashboard**
- Posts published vs remaining
- Calendar view of schedule
- Publishing streak

### File Structure
```
output/src/
├── app/
│   ├── page.tsx                     # Dashboard
│   ├── campaigns/
│   │   ├── page.tsx                 # Campaign list
│   │   ├── new/page.tsx             # Create campaign wizard
│   │   └── [id]/page.tsx            # Campaign detail & posts
│   ├── posts/
│   │   ├── [id]/page.tsx            # Post editor
│   │   └── [id]/preview/page.tsx    # LinkedIn preview
│   ├── schedule/
│   │   └── page.tsx                 # Calendar view
│   ├── templates/
│   │   └── page.tsx                 # Saved templates
│   ├── api/
│   │   ├── campaigns/
│   │   │   ├── route.ts             # Campaign CRUD
│   │   │   └── [id]/generate/route.ts # AI generation
│   │   ├── posts/
│   │   │   ├── route.ts             # Post CRUD
│   │   │   └── [id]/publish/route.ts
│   │   └── ai/
│   │       ├── generate/route.ts    # Generate posts
│   │       └── improve/route.ts     # Improve single post
│   └── layout.tsx
├── components/
│   ├── campaigns/
│   │   ├── CampaignForm.tsx
│   │   ├── CampaignCard.tsx
│   │   └── CampaignProgress.tsx
│   ├── posts/
│   │   ├── PostEditor.tsx
│   │   ├── PostCard.tsx
│   │   ├── LinkedInPreview.tsx      # Accurate preview
│   │   ├── CharacterCounter.tsx
│   │   └── HashtagSuggester.tsx
│   ├── schedule/
│   │   ├── CalendarView.tsx
│   │   ├── SchedulePicker.tsx
│   │   └── BulkScheduler.tsx
│   ├── dashboard/
│   │   ├── UpcomingPosts.tsx
│   │   ├── PublishNow.tsx
│   │   └── CampaignStats.tsx
│   └── ui/                          # shadcn components
├── lib/
│   ├── db.ts                        # Prisma client
│   ├── openai.ts                    # OpenAI integration
│   ├── prompts.ts                   # AI prompt templates
│   └── scheduling.ts                # Cron utilities
└── prisma/
    └── schema.prisma
```

### Database Schema

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Campaign {
  id                String   @id @default(uuid())
  name              String

  // Product info
  productName       String
  productDescription String
  targetAudience    String
  uniqueValue       String

  // Settings
  campaignType      String
  tone              String
  includeEmojis     Boolean  @default(true)
  includeHashtags   Boolean  @default(true)

  // Status
  status            String   @default("draft") // draft, active, completed

  posts             Post[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model Post {
  id                String   @id @default(uuid())
  campaignId        String
  campaign          Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  content           String
  hook              String?
  hashtags          String   @default("[]") // JSON array
  imageUrl          String?

  postType          String?
  characterCount    Int      @default(0)

  scheduledFor      DateTime?
  status            String   @default("draft") // draft, scheduled, published, skipped
  publishedAt       DateTime?

  // User notes
  notes             String?
  engagement        String?  // JSON: {likes: 0, comments: 0}

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model Template {
  id                String   @id @default(uuid())
  name              String
  content           String
  postType          String?
  tags              String   @default("[]") // JSON array

  createdAt         DateTime @default(now())
}
```

## Acceptance Criteria

### Must Have (MVP)
- [ ] Campaign creation form with all input fields
- [ ] AI generates 5-20 LinkedIn posts from description
- [ ] Post editor with character count and basic formatting
- [ ] LinkedIn-style preview component (accurate visual)
- [ ] Copy to clipboard functionality
- [ ] Date/time scheduling for posts
- [ ] Dashboard showing upcoming posts
- [ ] Mark posts as published
- [ ] Basic campaign progress tracking

### Should Have
- [ ] Bulk scheduling wizard (spread posts across days)
- [ ] Calendar view of scheduled posts
- [ ] Regenerate individual posts with AI
- [ ] "Improve this post" AI feature
- [ ] Hashtag suggestions based on content
- [ ] Save post as template
- [ ] Browser notifications for due posts
- [ ] Campaign duplication

### Nice to Have (v2)
- [ ] Chrome extension for direct posting
- [ ] Image generation for posts (DALL-E)
- [ ] A/B test variations
- [ ] Analytics tracking (manual input of likes/comments)
- [ ] Carousel post support
- [ ] Export campaign to PDF

## Out of Scope

- Direct LinkedIn API integration (too restrictive)
- Multi-user support
- Team collaboration features
- Automated engagement (likes, comments)
- LinkedIn analytics integration
- Other social platforms (Twitter, etc.)

## AI Prompt Templates

### Campaign Generation
```
You are a LinkedIn marketing expert who helps founders and developers promote their products.

Generate a {numberOfPosts}-post LinkedIn marketing campaign for:

**Product:** {productName}
**What it does:** {productDescription}
**Who it's for:** {targetAudience}
**What makes it special:** {uniqueValue}

**Campaign Style:** {campaignType}
**Tone:** {tone}
**Emojis:** {includeEmojis ? "Yes, use sparingly" : "No"}
**Hashtags:** {includeHashtags ? "Include 3-5 relevant hashtags" : "No hashtags"}

Create a mix of post types:
1. Hook-based story (personal experience building this)
2. Problem/solution post
3. Tips/educational content
4. Behind-the-scenes
5. Social proof/results
6. Direct product announcement
7. Question to drive engagement

For EACH post, output JSON:
{
  "hook": "First line that grabs attention",
  "content": "Full post content with line breaks",
  "hashtags": ["#tag1", "#tag2"],
  "postType": "story|tips|question|announcement|behindScenes|results",
  "suggestedDay": 1-{numberOfPosts}
}

LinkedIn best practices to follow:
- Start with a strong hook (curiosity, bold claim, or question)
- Use short paragraphs (1-2 sentences each)
- Include line breaks for readability
- End with a clear CTA or question
- Keep posts 150-300 words for best engagement
- Be authentic and conversational
```

### Post Improvement
```
Improve this LinkedIn post while keeping the core message:

Original: {content}

Make it:
- More engaging (stronger hook)
- Better formatted (line breaks, readability)
- More conversational
- Include a clearer call-to-action

Return the improved version only.
```

## UI/UX Notes

### LinkedIn Preview Component
Must accurately replicate:
- LinkedIn's font (system font stack)
- Profile picture placeholder
- "See more" truncation at ~210 characters
- Hashtag styling (blue, clickable look)
- Engagement buttons (Like, Comment, Share)
- Post card styling with proper shadows/borders

### Dashboard Priority
1. "Post Now" section - Posts due today at top
2. Upcoming this week
3. Campaign progress bars
4. Quick actions (new campaign, view schedule)

## Success Metrics

- Campaign generation completes in <30 seconds
- Generated posts require minimal editing (<20% changed)
- UI matches LinkedIn preview within 95% accuracy
- All pages load in <2 seconds
- Zero TypeScript or ESLint errors

## Priority

**Medium-High** - Marketing tool to promote other products.

## Estimated Complexity

**Medium** - Next.js app with OpenAI integration, focused UI work.

Expected implementation time: 6-10 iterations
