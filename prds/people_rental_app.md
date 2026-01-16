# PRD: People Rental App - "Uber for Social Services"

## Overview

Build an iOS app marketplace where users can hire people for social services on-demand. Think Uber, but instead of rides, you're ordering people to come to your location for entertainment, socializing, or other social services. Service providers create profiles showcasing their offerings, and customers can browse, book, and pay seamlessly.

**Example Use Cases:**
- Hire a magician for your kid's birthday party
- Book companions to make your party seem more lively
- Get a personal chef for a dinner party
- Hire a DJ for an event
- Book a photographer for a special occasion
- Get a fitness trainer to come to your home

## Goals

1. Create a polished iOS app with React Native + Expo
2. Full user authentication (sign up, login, profiles)
3. Service provider profiles with photos, descriptions, pricing
4. Search and browse by category
5. Real-time booking system with location tracking
6. Payment processing via RevenueCat
7. Rating and review system
8. Push notifications for bookings
9. Generate fake test data with AI-generated photos

## Target Directory

Create all code in `/output/src/`

## Tech Stack

### Frontend (Mobile)
- **Framework**: React Native with Expo (SDK 52+)
- **Language**: TypeScript
- **Navigation**: Expo Router
- **State**: Zustand or React Context
- **UI**: NativeWind (Tailwind for React Native)
- **Payments**: RevenueCat SDK
- **Maps**: react-native-maps
- **Images**: expo-image

### Backend (GCloud)
- **Runtime**: Cloud Run (Node.js + Express + TypeScript)
- **Database**: Cloud SQL (PostgreSQL) or Firestore
- **Storage**: Cloud Storage (profile photos)
- **Auth**: Firebase Auth
- **Push Notifications**: Firebase Cloud Messaging

### External Services
- **Payments**: RevenueCat (handles Apple Pay, subscriptions)
- **Image Generation**: OpenAI DALL-E (for test user photos)
- **Maps**: Google Maps Platform

## User Stories

### As a Customer, I want to:
1. Sign up/login with email or Apple ID
2. Browse service providers by category
3. Search for specific services or people
4. View provider profiles (photos, bio, reviews, pricing)
5. See provider availability and location
6. Book a provider for a specific time and duration
7. Pay securely through the app
8. Track when my booked provider is arriving
9. Rate and review after the service
10. View my booking history
11. Save favorite providers

### As a Service Provider, I want to:
1. Create a profile showcasing my services
2. Upload multiple photos of myself
3. Set my hourly/flat rate pricing
4. Define my service categories
5. Set my availability schedule
6. Accept or decline booking requests
7. See my earnings and payout history
8. Get notifications for new bookings
9. Navigate to customer locations
10. View my ratings and reviews

## Core Features

### 1. Authentication & Onboarding

```typescript
// User types
type UserRole = 'customer' | 'provider' | 'both';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: Date;

  // Provider-specific
  providerProfile?: ProviderProfile;

  // Customer-specific
  savedProviders?: string[];
  paymentMethods?: PaymentMethod[];
}
```

**Onboarding Flow:**
1. Sign up with email/Apple ID
2. Choose role: "I want to hire people" / "I want to offer services" / "Both"
3. If provider: Complete profile setup
4. If customer: Add payment method

### 2. Provider Profiles

```typescript
interface ProviderProfile {
  id: string;
  userId: string;

  // Display
  displayName: string;
  bio: string;
  photos: string[]; // Up to 6 photos

  // Services
  categories: ServiceCategory[];
  services: Service[];

  // Pricing
  hourlyRate: number;
  minimumHours: number;

  // Availability
  schedule: WeeklySchedule;
  isAvailable: boolean;
  currentLocation?: GeoPoint;
  serviceRadius: number; // miles

  // Stats
  rating: number;
  reviewCount: number;
  completedBookings: number;
  responseTime: string; // "Usually responds in X"

  // Verification
  isVerified: boolean;
  backgroundCheckPassed?: boolean;
}

type ServiceCategory =
  | 'entertainment'
  | 'socializing'
  | 'fitness'
  | 'culinary'
  | 'photography'
  | 'music'
  | 'education'
  | 'wellness'
  | 'events'
  | 'other';

interface Service {
  name: string;
  description: string;
  price: number;
  priceType: 'hourly' | 'flat' | 'custom';
  duration?: number; // minutes
}
```

### 3. Booking System

```typescript
interface Booking {
  id: string;
  customerId: string;
  providerId: string;

  // Details
  service: Service;
  scheduledAt: Date;
  duration: number; // minutes
  location: {
    address: string;
    coordinates: GeoPoint;
    notes?: string;
  };

  // Status
  status: BookingStatus;

  // Payment
  totalAmount: number;
  platformFee: number;
  providerPayout: number;
  paymentStatus: PaymentStatus;

  // Tracking
  providerLocation?: GeoPoint;
  arrivedAt?: Date;
  completedAt?: Date;

  // Review
  customerReview?: Review;
  providerReview?: Review;
}

type BookingStatus =
  | 'pending'      // Waiting for provider to accept
  | 'accepted'     // Provider accepted
  | 'declined'     // Provider declined
  | 'cancelled'    // Customer cancelled
  | 'en_route'     // Provider on the way
  | 'arrived'      // Provider arrived
  | 'in_progress'  // Service ongoing
  | 'completed'    // Service finished
  | 'disputed';    // Issue reported
```

### 4. Search & Discovery

**Home Screen:**
- Featured/top-rated providers
- Categories grid (Entertainment, Socializing, Fitness, etc.)
- "Near You" section based on location
- Recent searches

**Search:**
- Text search for services/names
- Filter by: category, price range, rating, distance, availability
- Sort by: relevance, price, rating, distance

**Category Pages:**
- Grid of providers in that category
- Quick filters
- Map view option

### 5. Payments (RevenueCat)

**Customer Flow:**
1. Add payment method (Apple Pay, card)
2. Book service → payment held
3. Service completed → payment processed
4. Platform takes 15% fee

**Provider Flow:**
1. Connect payout account (Stripe Connect via RevenueCat)
2. Complete booking → funds added to balance
3. Weekly automatic payouts

**Pricing Model:**
- 15% platform fee on all transactions
- Providers set their own rates
- Customers pay: service cost + platform fee

### 6. Real-time Features

**Location Tracking:**
- Provider shares location when en route
- Customer sees provider on map
- ETA updates

**Notifications:**
- New booking request (provider)
- Booking accepted/declined (customer)
- Provider en route
- Provider arrived
- Payment processed
- New review received

## App Structure

```
/output/src/
├── app/                          # Expo Router pages
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── onboarding.tsx
│   ├── (tabs)/
│   │   ├── index.tsx             # Home/Discover
│   │   ├── search.tsx            # Search
│   │   ├── bookings.tsx          # My Bookings
│   │   ├── messages.tsx          # Chat/Messages
│   │   └── profile.tsx           # Profile/Settings
│   ├── provider/
│   │   ├── [id].tsx              # Provider detail
│   │   └── book.tsx              # Booking flow
│   ├── booking/
│   │   ├── [id].tsx              # Booking detail
│   │   └── tracking.tsx          # Live tracking
│   ├── settings/
│   │   ├── index.tsx
│   │   ├── payment-methods.tsx
│   │   └── become-provider.tsx
│   └── _layout.tsx
├── components/
│   ├── ui/                       # Base components
│   ├── providers/
│   │   ├── ProviderCard.tsx
│   │   ├── ProviderProfile.tsx
│   │   └── ProviderMap.tsx
│   ├── bookings/
│   │   ├── BookingCard.tsx
│   │   ├── BookingFlow.tsx
│   │   └── LiveTracking.tsx
│   ├── search/
│   │   ├── SearchBar.tsx
│   │   ├── CategoryGrid.tsx
│   │   └── FilterSheet.tsx
│   └── payments/
│       └── PaymentSheet.tsx
├── lib/
│   ├── api.ts                    # Backend API client
│   ├── auth.ts                   # Firebase Auth
│   ├── storage.ts                # Async storage
│   ├── location.ts               # Location services
│   └── notifications.ts          # Push notifications
├── stores/
│   ├── authStore.ts
│   ├── bookingStore.ts
│   └── providerStore.ts
├── types/
│   └── index.ts                  # TypeScript types
└── constants/
    └── categories.ts
```

## Backend API

```
/api/
├── auth/
│   ├── POST /register
│   ├── POST /login
│   └── GET /me
├── users/
│   ├── GET /:id
│   ├── PUT /:id
│   └── POST /:id/become-provider
├── providers/
│   ├── GET /                     # List/search providers
│   ├── GET /:id                  # Provider detail
│   ├── PUT /:id                  # Update profile
│   ├── PUT /:id/availability     # Update availability
│   └── PUT /:id/location         # Update live location
├── bookings/
│   ├── POST /                    # Create booking
│   ├── GET /                     # My bookings
│   ├── GET /:id                  # Booking detail
│   ├── PUT /:id/accept           # Provider accepts
│   ├── PUT /:id/decline          # Provider declines
│   ├── PUT /:id/cancel           # Cancel booking
│   ├── PUT /:id/start            # Start service
│   └── PUT /:id/complete         # Complete service
├── reviews/
│   ├── POST /                    # Create review
│   └── GET /provider/:id         # Provider's reviews
├── payments/
│   ├── POST /setup-intent        # Setup payment method
│   ├── GET /methods              # List payment methods
│   └── GET /earnings             # Provider earnings
└── seed/
    └── POST /generate-test-data  # Generate fake users
```

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'customer',
  firebase_uid VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Provider Profiles
CREATE TABLE provider_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  display_name VARCHAR(255) NOT NULL,
  bio TEXT,
  photos TEXT[], -- Array of URLs
  categories TEXT[],
  hourly_rate DECIMAL(10,2),
  minimum_hours INTEGER DEFAULT 1,
  service_radius INTEGER DEFAULT 25,
  is_available BOOLEAN DEFAULT false,
  current_lat DECIMAL(10,8),
  current_lng DECIMAL(11,8),
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  completed_bookings INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Services
CREATE TABLE services (
  id UUID PRIMARY KEY,
  provider_id UUID REFERENCES provider_profiles(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  price_type VARCHAR(20), -- hourly, flat, custom
  duration INTEGER -- minutes
);

-- Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES users(id),
  provider_id UUID REFERENCES provider_profiles(id),
  service_id UUID REFERENCES services(id),
  scheduled_at TIMESTAMP NOT NULL,
  duration INTEGER NOT NULL, -- minutes
  location_address TEXT,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  location_notes TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  total_amount DECIMAL(10,2),
  platform_fee DECIMAL(10,2),
  provider_payout DECIMAL(10,2),
  payment_status VARCHAR(20) DEFAULT 'pending',
  arrived_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id),
  reviewer_id UUID REFERENCES users(id),
  reviewee_id UUID REFERENCES users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Test Data Generation

Create a seed script that:
1. Generates 50+ fake provider profiles
2. Uses OpenAI DALL-E to create realistic profile photos
3. Covers all categories
4. Varies pricing, ratings, locations
5. Creates sample reviews

```typescript
// Seed data categories
const TEST_PROVIDERS = [
  {
    category: 'entertainment',
    types: ['Magician', 'Comedian', 'DJ', 'Live Musician', 'Party Clown', 'Balloon Artist'],
  },
  {
    category: 'socializing',
    types: ['Party Guest', 'Event Companion', 'Conversation Partner', 'Networking Buddy'],
  },
  {
    category: 'fitness',
    types: ['Personal Trainer', 'Yoga Instructor', 'Boxing Coach', 'Dance Instructor'],
  },
  {
    category: 'culinary',
    types: ['Private Chef', 'Bartender', 'Cooking Instructor', 'Sommelier'],
  },
  {
    category: 'photography',
    types: ['Event Photographer', 'Portrait Photographer', 'Videographer'],
  },
  {
    category: 'events',
    types: ['Event Planner', 'MC/Host', 'Decorator', 'Server/Staff'],
  },
];

// Generate profile photo with DALL-E
async function generateProfilePhoto(description: string): Promise<string> {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: `Professional headshot photo of a ${description}, friendly smile, neutral background, high quality portrait photography`,
    n: 1,
    size: "1024x1024",
  });
  return response.data[0].url;
}
```

## Environment Variables

```env
# Firebase
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=

# RevenueCat
REVENUECAT_API_KEY=
REVENUECAT_ENTITLEMENT_ID=

# OpenAI (for test data)
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE

# Google Cloud
GCLOUD_PROJECT_ID=cracked-445422
DATABASE_URL=

# Google Maps
GOOGLE_MAPS_API_KEY=
```

## Acceptance Criteria

### Must Have (MVP)
- [ ] User auth (email + Apple Sign In)
- [ ] Provider profile creation with photos
- [ ] Browse providers by category
- [ ] Search with filters
- [ ] View provider detail page
- [ ] Basic booking flow (request → accept/decline)
- [ ] Payment integration with RevenueCat
- [ ] Booking status updates
- [ ] Push notifications
- [ ] 50+ test providers with AI-generated photos
- [ ] Clean, polished UI

### Should Have
- [ ] Real-time location tracking during booking
- [ ] In-app messaging
- [ ] Rating and review system
- [ ] Provider availability calendar
- [ ] Favorite providers
- [ ] Booking history
- [ ] Earnings dashboard for providers
- [ ] Map view for nearby providers

### Nice to Have (v2)
- [ ] Background checks integration
- [ ] Group bookings
- [ ] Recurring bookings
- [ ] Provider promotions/discounts
- [ ] Referral system
- [ ] Provider badges/achievements

## Out of Scope

- Android app (iOS only for MVP)
- Web version
- Complex scheduling (simple date/time picker only)
- Video chat
- Tipping
- Insurance integration

## Success Metrics

- App builds without errors
- All screens render correctly
- Auth flow works end-to-end
- Payment flow completes
- Test data populates correctly
- Push notifications received
- TypeScript strict mode passes
- No ESLint errors

## UI/UX Notes

- Clean, modern design (think Uber + Airbnb hybrid)
- Dark mode support
- Smooth animations
- Pull-to-refresh on lists
- Skeleton loaders while loading
- Clear CTAs on every screen
- Easy provider discovery

## Priority

**High** - New product, needs full implementation.

## Estimated Complexity

**High** - Full-stack mobile app with payments.

Expected implementation time: 15-25 iterations
