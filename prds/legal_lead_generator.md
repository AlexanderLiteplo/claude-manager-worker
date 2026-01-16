# PRD: Legal Document Revision Lead Generator

## Overview

Build an automated lead generation system that identifies companies and individuals who pay lawyers for document revision work, then reaches out to them with personalized messages offering an AI-powered document revision service. The primary target market is energy companies needing regulatory document work, but the system should be flexible enough to target any industry.

## Goals

1. Identify potential leads through multiple data sources
2. Score and prioritize leads based on likelihood to need document revision services
3. Generate personalized outreach messages based on lead data
4. Automate email campaigns with tracking and follow-ups
5. Provide a dashboard to manage leads and track campaign performance
6. Store all lead data and outreach history for future reference

## Target Directory

Create all code in `/output/src/`

## User Stories

### As a user, I want to:
1. Import leads from CSV files or manual entry
2. Automatically enrich lead data from public sources
3. Search for new leads based on industry, company size, and regulatory activity
4. Generate personalized outreach emails with one click
5. Schedule and send email campaigns
6. Track email opens, clicks, and responses
7. Manage follow-up sequences automatically
8. See analytics on campaign performance
9. Export leads and campaign data

## Technical Requirements

### Stack
- **Language**: Node.js with TypeScript
- **Framework**: Next.js 14 (App Router) for full-stack
- **Database**: PostgreSQL with Prisma ORM
- **Email**: Resend API for transactional emails
- **Scraping**: Cheerio + Puppeteer for web data
- **Queue**: BullMQ for background jobs
- **UI**: Tailwind CSS + shadcn/ui components
- **Authentication**: Simple password auth (single user for now)

### Core Features

#### 1. Lead Sources & Discovery

**Manual Import**
- CSV upload with field mapping
- Manual lead entry form
- Bulk operations (tag, delete, archive)

**Automated Discovery (v2 - stretch goal)**
- FERC (Federal Energy Regulatory Commission) filings search
- State PUC (Public Utility Commission) docket monitoring
- LinkedIn Sales Navigator integration (if API access)
- Company website scraping for legal team contacts

**Lead Data Model**
```typescript
interface Lead {
  id: string;
  // Company info
  companyName: string;
  industry: string;
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  website?: string;
  linkedinUrl?: string;

  // Contact info
  contactName?: string;
  contactTitle?: string;
  contactEmail: string;
  contactPhone?: string;
  contactLinkedIn?: string;

  // Lead scoring
  score: number; // 0-100
  scoreFactors: Record<string, number>;

  // Status
  status: 'new' | 'contacted' | 'responded' | 'interested' | 'not_interested' | 'converted' | 'archived';

  // Metadata
  source: string;
  tags: string[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2. Lead Scoring

Score leads 0-100 based on:
- Industry match (energy/utilities = high score)
- Company size (medium-large = higher score)
- Job title relevance (General Counsel, Regulatory Affairs = high)
- Recent regulatory activity (filings, rate cases = high)
- Email domain quality (corporate vs personal)

#### 3. Message Generation

**Template System**
```typescript
interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  body: string; // Supports {{variables}}
  type: 'initial' | 'followup_1' | 'followup_2' | 'followup_3';
  industry?: string; // Industry-specific templates
}
```

**Default Templates**

*Initial Outreach - Energy Company*
```
Subject: Streamline Your Regulatory Document Revisions, {{companyName}}

Hi {{contactName}},

I noticed {{companyName}} handles significant regulatory filings. Our AI-powered document revision tool helps legal teams:

- Cut document revision time by 60%
- Maintain consistent formatting across filings
- Apply learned style rules automatically
- Track changes like Microsoft Word

We built this specifically for regulatory work at energy companies. Would you be open to a 15-minute demo?

Best,
Alexander
```

*Follow-up 1 (3 days later)*
```
Subject: Re: Streamline Your Regulatory Document Revisions

Hi {{contactName}},

Just following up on my previous email. I know regulatory filings keep your team busy - that's exactly why we built this tool.

One client told us: "We used to spend 2 hours per document on revision. Now it's 20 minutes."

Worth a quick call?

Best,
Alexander
```

#### 4. Email Campaign Management

**Campaign Flow**
1. Select leads (filtered by score, status, tags)
2. Choose template sequence (initial + follow-ups)
3. Set timing (days between emails)
4. Preview personalized messages
5. Schedule or send immediately
6. Track opens, clicks, responses
7. Auto-stop sequence on response

**Tracking**
- Open tracking via pixel
- Click tracking via redirect URLs
- Response detection (email reply)
- Bounce handling
- Unsubscribe management

#### 5. Dashboard & Analytics

**Main Dashboard**
- Total leads by status (pie chart)
- Campaign performance (emails sent, opens, clicks, responses)
- Recent activity feed
- Top scoring leads

**Campaign View**
- Email funnel visualization
- A/B test results (if multiple templates)
- Best performing subject lines
- Optimal send times

### File Structure
```
output/src/
├── app/
│   ├── page.tsx                    # Dashboard
│   ├── leads/
│   │   ├── page.tsx                # Lead list
│   │   ├── [id]/page.tsx           # Lead detail
│   │   └── import/page.tsx         # CSV import
│   ├── campaigns/
│   │   ├── page.tsx                # Campaign list
│   │   ├── new/page.tsx            # Create campaign
│   │   └── [id]/page.tsx           # Campaign detail
│   ├── templates/
│   │   └── page.tsx                # Message templates
│   ├── settings/
│   │   └── page.tsx                # Settings & config
│   ├── api/
│   │   ├── leads/route.ts          # Lead CRUD
│   │   ├── campaigns/route.ts       # Campaign management
│   │   ├── templates/route.ts       # Template CRUD
│   │   ├── email/
│   │   │   ├── send/route.ts       # Send emails
│   │   │   └── track/route.ts      # Track opens/clicks
│   │   └── import/route.ts          # CSV import
│   └── layout.tsx
├── components/
│   ├── leads/
│   │   ├── LeadTable.tsx
│   │   ├── LeadCard.tsx
│   │   ├── LeadForm.tsx
│   │   ├── LeadScoreBadge.tsx
│   │   └── ImportWizard.tsx
│   ├── campaigns/
│   │   ├── CampaignBuilder.tsx
│   │   ├── EmailPreview.tsx
│   │   └── CampaignStats.tsx
│   ├── templates/
│   │   ├── TemplateEditor.tsx
│   │   └── VariableInserter.tsx
│   ├── dashboard/
│   │   ├── StatsCards.tsx
│   │   ├── LeadFunnel.tsx
│   │   └── ActivityFeed.tsx
│   └── ui/                          # shadcn components
├── lib/
│   ├── db.ts                        # Prisma client
│   ├── email.ts                     # Resend integration
│   ├── scoring.ts                   # Lead scoring logic
│   ├── templates.ts                 # Message variable replacement
│   └── tracking.ts                  # Email tracking utilities
├── prisma/
│   └── schema.prisma
└── jobs/
    ├── sendEmail.ts                 # Email send job
    └── processSequence.ts           # Sequence automation
```

### Database Schema

```prisma
model Lead {
  id              String    @id @default(uuid())
  companyName     String
  industry        String?
  companySize     String?
  website         String?
  linkedinUrl     String?

  contactName     String?
  contactTitle    String?
  contactEmail    String
  contactPhone    String?
  contactLinkedIn String?

  score           Int       @default(0)
  scoreFactors    Json?

  status          String    @default("new")
  source          String    @default("manual")
  tags            String[]
  notes           String?

  campaigns       CampaignLead[]
  emails          Email[]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model Campaign {
  id              String    @id @default(uuid())
  name            String
  status          String    @default("draft") // draft, active, paused, completed

  templateIds     String[]  // Sequence of template IDs
  delayDays       Int[]     // Days between each email

  leads           CampaignLead[]

  stats           Json?     // Cached stats

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model CampaignLead {
  id              String    @id @default(uuid())
  campaignId      String
  leadId          String

  campaign        Campaign  @relation(fields: [campaignId], references: [id])
  lead            Lead      @relation(fields: [leadId], references: [id])

  currentStep     Int       @default(0)
  status          String    @default("pending") // pending, active, responded, completed, stopped
  nextSendAt      DateTime?

  @@unique([campaignId, leadId])
}

model Template {
  id              String    @id @default(uuid())
  name            String
  subject         String
  body            String
  type            String    // initial, followup_1, etc.
  industry        String?   // Industry-specific
  isActive        Boolean   @default(true)

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model Email {
  id              String    @id @default(uuid())
  leadId          String
  lead            Lead      @relation(fields: [leadId], references: [id])

  campaignId      String?
  templateId      String?

  subject         String
  body            String

  status          String    @default("queued") // queued, sent, delivered, bounced

  sentAt          DateTime?
  openedAt        DateTime?
  clickedAt       DateTime?
  repliedAt       DateTime?

  trackingId      String    @unique @default(uuid())

  createdAt       DateTime  @default(now())
}
```

## Acceptance Criteria

### Must Have (MVP)
- [ ] Lead management (CRUD, list view with filtering/sorting)
- [ ] CSV import with field mapping wizard
- [ ] Lead scoring algorithm (configurable weights)
- [ ] Message template system with variable substitution
- [ ] Single email send with preview
- [ ] Basic campaign creation (select leads, pick templates)
- [ ] Email send via Resend API
- [ ] Open tracking via tracking pixel
- [ ] Dashboard with lead counts and recent activity
- [ ] Settings page for email configuration

### Should Have
- [ ] Multi-step campaign sequences with delays
- [ ] Click tracking for links
- [ ] Auto-stop on reply detection
- [ ] Lead status auto-update based on email engagement
- [ ] Bulk actions on leads (tag, delete, add to campaign)
- [ ] Campaign performance analytics
- [ ] Export leads/campaigns to CSV

### Nice to Have (v2)
- [ ] FERC filing search integration
- [ ] LinkedIn profile enrichment
- [ ] AI-powered message personalization (beyond templates)
- [ ] A/B testing for subject lines
- [ ] Calendar booking link integration
- [ ] Reply detection and inbox integration

## Out of Scope

- Multi-user support / team features
- CRM integrations (Salesforce, HubSpot)
- Phone/SMS outreach
- Social media automation
- Complex workflow automation
- GDPR compliance features (single user, own contacts)

## Success Metrics

- Can import 100+ leads via CSV in under 30 seconds
- Can send personalized email campaign to 50 leads in one click
- Open tracking works reliably (>95% accuracy)
- All pages load in <2 seconds
- Zero TypeScript or ESLint errors

## Environment Variables

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/leadgen"
RESEND_API_KEY="re_..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
APP_PASSWORD="your-password-here"
```

## Default Templates to Seed

Include 3 template sequences:
1. **Energy/Regulatory** - For energy companies (3 emails)
2. **General Legal** - For any company with legal team (3 emails)
3. **Law Firm** - For law firms doing document work (3 emails)

## Implementation Notes

### Email Sending Best Practices
- Use Resend's batch API for campaigns
- Implement exponential backoff for rate limits
- Track bounces and auto-update lead status
- Include unsubscribe link in all emails

### Lead Scoring Weights
```typescript
const SCORING_WEIGHTS = {
  industryMatch: 25,      // Energy/utilities = full points
  companySizeMatch: 15,   // Medium-large = full points
  titleRelevance: 20,     // GC, Regulatory Affairs = full
  emailQuality: 15,       // Corporate domain = full
  recentActivity: 25,     // Has regulatory filings = full
};
```

### Tracking Implementation
- Open tracking: 1x1 transparent pixel with unique ID
- Click tracking: Redirect through /api/email/track?id=X&url=Y
- Store tracking events in Email model

## Priority

**High** - This is a sales enablement tool needed for business development.

## Estimated Complexity

**Medium-High** - Full-stack app with email integration and background jobs.

Expected implementation time: 8-12 iterations

---

## PRIORITY UPDATE: Add Exa Labs Integration

### Exa Labs for Lead Discovery

Add automated lead discovery using Exa Labs API (https://exa.ai) to find companies and contacts who need document revision services.

**New Features to Add:**

#### 1. Exa Search Integration

```typescript
// lib/exa.ts
import Exa from 'exa-js';

const exa = new Exa(process.env.EXA_API_KEY);

interface SearchOptions {
  industry: string;      // e.g., "energy", "utilities", "legal"
  keywords: string[];    // e.g., ["regulatory filing", "FERC", "rate case"]
  companySize?: string;
  location?: string;
}

async function findLeads(options: SearchOptions): Promise<Lead[]> {
  // Search for companies with regulatory/legal document needs
  const results = await exa.searchAndContents(
    `${options.industry} companies ${options.keywords.join(' ')} regulatory filings legal documents`,
    {
      type: "auto",
      numResults: 25,
      text: true,
      highlights: true,
    }
  );

  // Extract company info and contacts from results
  return results.map(r => extractLeadFromResult(r));
}
```

#### 2. Search UI

Add a "Discover Leads" page at `/leads/discover`:
- Industry selector (energy, utilities, legal, finance)
- Keyword builder (FERC, rate case, regulatory, etc.)
- Location filter (optional)
- Company size filter (optional)
- "Search" button that queries Exa
- Results list with "Import" buttons

#### 3. Auto-Enrichment

When importing leads from Exa:
- Auto-populate company info from search results
- Extract contact emails from company pages (if found)
- Set source as "exa_search"
- Calculate initial score based on relevance

**Environment Variable:**
```env
EXA_API_KEY=your-exa-api-key
```

**New Dependencies:**
```bash
npm install exa-js
```

**New API Routes:**
- `POST /api/leads/discover` - Search Exa for leads
- `POST /api/leads/import-exa` - Import selected results as leads

This is HIGH PRIORITY - implement in the next iteration.
