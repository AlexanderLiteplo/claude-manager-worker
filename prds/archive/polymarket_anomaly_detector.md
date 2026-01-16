# PRD: Polymarket Anomaly Detector

## Overview

Build a real-time anomaly detection dashboard for Polymarket that identifies suspicious betting patterns that may indicate insider trading or unusual market activity. The website should be visually polished for Twitter screenshots when reporting anomalies.

## Goals

1. Detect statistical anomalies in Polymarket betting behavior
2. Surface potential insider trading signals (fresh wallets, large contrarian bets)
3. Quantify anomaly severity with clear metrics (percentiles, z-scores)
4. Provide a beautiful, screenshot-friendly UI for Twitter reporting
5. Filter out sports betting - focus on political/world events only

## Target Deployment

- **Frontend**: Vercel (Next.js)
- **Backend**: Vercel Serverless Functions or simple API routes
- **Database**: Optional - can start with in-memory/file-based caching

## User Stories

### As a market watcher, I want to:
1. See a real-time feed of anomalous bets on Polymarket
2. Understand WHY each bet is considered anomalous
3. See how extreme the anomaly is (percentile ranking, z-score)
4. Filter by anomaly type (fresh wallet, large contrarian, etc.)
5. Take clean screenshots for Twitter threads
6. Exclude all sports-related markets

## Anomaly Detection Types

### 1. Fresh Wallet Large Bets
- Wallet created recently (< 7 days)
- Places significant bet (> $1000) on low probability outcome (< 20%)
- Stands to gain significant returns if correct

### 2. Contrarian Whale Bets
- Large bet (> $5000) against market consensus
- Bet moves market price significantly
- Goes against recent trend direction

### 3. Unusual Volume Spikes
- Market sees 3x+ normal volume in short period
- Concentrated in one direction (all buying YES or NO)
- No obvious news catalyst

### 4. Pattern Anomalies
- Multiple fresh wallets betting same direction
- Coordinated timing (bets within minutes of each other)
- Similar bet sizes suggesting coordination

### 5. Smart Money Signals
- Wallets with historically high win rates placing bets
- Large positions from wallets that previously caught "insider" moves

## Technical Requirements

### Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Data Fetching**: Server Components + API routes
- **Charts**: Recharts or similar for visualizations

### Project Structure
```
src/
  app/
    page.tsx                 # Main dashboard
    api/
      anomalies/route.ts     # Anomaly detection endpoint
      markets/route.ts       # Market data endpoint
    layout.tsx
    globals.css
  components/
    AnomalyCard.tsx          # Individual anomaly display
    AnomalyFeed.tsx          # Real-time feed of anomalies
    AnomalySeverity.tsx      # Bell curve / percentile viz
    MarketFilter.tsx         # Filter controls
    Header.tsx
  lib/
    polymarket.ts            # Polymarket API client
    anomalyDetection.ts      # Anomaly detection algorithms
    types.ts                 # TypeScript types
    utils.ts
  hooks/
    useAnomalies.ts          # Real-time anomaly hook
```

### Polymarket Integration
- Use Polymarket's public API/subgraph
- Fetch market data, trade history, wallet info
- Poll for updates every 30-60 seconds
- Cache results to avoid rate limiting

### Anomaly Scoring System
Each anomaly should have:
- **Severity Score**: 0-100 (higher = more unusual)
- **Percentile**: Where this falls on the distribution
- **Z-Score**: Standard deviations from mean
- **Confidence**: How sure we are this is anomalous

Display as:
- Color coding (green → yellow → orange → red)
- Bell curve visualization showing where bet falls
- Human-readable explanation ("This bet is in the 99.2nd percentile of unusual activity")

## UI/UX Requirements

### Dashboard Layout
```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Polymarket Anomaly Detector          [Filters] [Refresh]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🚨 HIGH SEVERITY ANOMALY                            │   │
│  │ Market: "Will X happen by 2024?"                    │   │
│  │                                                     │   │
│  │ Fresh wallet (2 days old) bet $15,000 on NO (12%)  │   │
│  │                                                     │   │
│  │ ████████████████████░░░ 95th percentile            │   │
│  │                                                     │   │
│  │ Potential profit if correct: $125,000              │   │
│  │ Anomaly Score: 87/100                              │   │
│  │                                                     │   │
│  │ [View on Polymarket] [Copy for Twitter]            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠️ MEDIUM SEVERITY                                  │   │
│  │ ...                                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Visual Design
- Dark mode by default (looks good in screenshots)
- High contrast for readability
- Clean, minimal design
- Prominent anomaly severity indicators
- Bell curve / distribution visualizations
- Timestamp for each anomaly

### Screenshot-Friendly Features
- Clean card design that crops well
- No unnecessary UI chrome
- Clear branding/watermark
- Export/share button that copies clean image

## Data Models

```typescript
interface Market {
  id: string;
  question: string;
  category: string;
  outcomes: Outcome[];
  volume: number;
  liquidity: number;
  endDate: Date;
}

interface Outcome {
  id: string;
  name: string;
  price: number; // 0-1 representing probability
}

interface Bet {
  id: string;
  marketId: string;
  outcome: string;
  amount: number;
  price: number;
  wallet: string;
  timestamp: Date;
}

interface Wallet {
  address: string;
  createdAt: Date;
  totalBets: number;
  totalVolume: number;
  winRate: number;
}

interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: number; // 0-100
  percentile: number;
  zScore: number;
  confidence: number;
  market: Market;
  bet: Bet;
  wallet: Wallet;
  explanation: string;
  detectedAt: Date;
}

type AnomalyType =
  | 'fresh_wallet_large_bet'
  | 'contrarian_whale'
  | 'volume_spike'
  | 'coordinated_betting'
  | 'smart_money';
```

## API Endpoints

### GET /api/anomalies
Returns list of detected anomalies, sorted by severity.

Query params:
- `type`: Filter by anomaly type
- `minSeverity`: Minimum severity score
- `limit`: Number of results
- `excludeSports`: true (default)

### GET /api/markets
Returns non-sports markets being monitored.

### GET /api/stats
Returns overall statistics and baseline metrics.

## Acceptance Criteria

1. [ ] Dashboard displays real-time anomaly feed
2. [ ] Each anomaly shows severity score, percentile, explanation
3. [ ] Bell curve visualization for anomaly distribution
4. [ ] Sports markets are filtered out
5. [ ] Fresh wallet detection working (< 7 days old)
6. [ ] Large contrarian bet detection working
7. [ ] Clean, dark-mode UI suitable for screenshots
8. [ ] Responsive design (but desktop-first)
9. [ ] Deploys to Vercel successfully
10. [ ] API routes function correctly
11. [ ] No API key exposure (use env vars)
12. [ ] Error handling for API failures
13. [ ] Loading states for data fetching

## Out of Scope (v1)

- User authentication
- Historical anomaly database
- Email/push notifications
- Automated Twitter posting
- Mobile app
- Real-time WebSocket updates (polling is fine)
- Backtesting anomaly detection

## Technical Notes

### Polymarket API
- Check https://docs.polymarket.com for API docs
- May need to use their subgraph (The Graph)
- Rate limiting considerations
- CLOB API for order book data

### Statistical Methods
- Calculate rolling averages for "normal" behavior
- Use standard deviation for z-scores
- Consider time-of-day patterns
- Weight by market liquidity

## Success Metrics

- Detects at least 3 anomaly types accurately
- UI renders cleanly for Twitter screenshots
- Deploys to Vercel without issues
- Anomaly explanations are human-readable
- False positive rate is reasonable
