# Skill: React Native API Integration

## When to Apply
Apply this skill when building React Native/Expo apps that communicate with backend APIs. This is critical for:
- Setting up API clients
- Making authenticated requests
- Handling auth state
- Managing API URLs in mobile context

## Guidelines

### 1. Never Use Relative URLs in React Native

React Native does NOT have a browser context. Relative URLs like `/api/foo` won't work.

```typescript
// BAD - Relative URLs don't work in React Native
const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password }),
});

// GOOD - Use absolute URLs with proper base URL configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

const response = await fetch(`${API_BASE_URL}/auth/login`, {
  method: 'POST',
  body: JSON.stringify({ email, password }),
});

// BETTER - Use a centralized API client
import { api } from '@/lib/api';

const result = await api.auth.login(email, password);
```

### 2. Use Environment Variables for API URLs

Configure the API URL in your environment:

```typescript
// .env
EXPO_PUBLIC_API_URL=http://localhost:3001/api

// For production
EXPO_PUBLIC_API_URL=https://api.yourapp.com

// lib/api.ts
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error('EXPO_PUBLIC_API_URL must be set');
}
```

### 3. Auth State Should Use the API Client

Don't duplicate fetch logic in state stores. Reuse the API client:

```typescript
// BAD - Auth store makes its own fetch calls
export const useAuthStore = create((set, get) => ({
  login: async (email, password) => {
    const response = await fetch('/api/auth/login', ...); // Wrong!
  },
}));

// GOOD - Auth store uses API client
import { api, setAuthToken } from '@/lib/api';

export const useAuthStore = create((set, get) => ({
  login: async (email, password) => {
    try {
      const result = await api.auth.login(email, password);
      if (result.success) {
        setAuthToken(result.data.token);
        set({ user: result.data.user, isAuthenticated: true });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  },
}));
```

### 4. Match Field Names Between Frontend and Backend

One of the most common bugs is field name mismatches:

```typescript
// Backend expects:
// { lat: number, lng: number }

// BAD - Mobile sends different field names
api.providers.updateLocation(id, {
  latitude: location.coords.latitude,  // Wrong!
  longitude: location.coords.longitude, // Wrong!
});

// GOOD - Match exactly what backend expects
api.providers.updateLocation(id, {
  lat: location.coords.latitude,
  lng: location.coords.longitude,
});
```

### 5. Handle Platform-Specific Localhost

`localhost` on iOS simulator vs Android emulator work differently:

```typescript
// lib/config.ts
import { Platform } from 'react-native';

const getApiUrl = () => {
  if (__DEV__) {
    // Android emulator uses 10.0.2.2 to access host machine
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3001/api';
    }
    // iOS simulator uses localhost
    return 'http://localhost:3001/api';
  }
  return process.env.EXPO_PUBLIC_API_URL || 'https://api.yourapp.com';
};

export const API_BASE_URL = getApiUrl();
```

### 6. Token Management Best Practices

Store and retrieve tokens securely:

```typescript
// lib/api.ts
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
let cachedToken: string | null = null;

export async function getAuthToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
  return cachedToken;
}

export async function setAuthToken(token: string | null): Promise<void> {
  cachedToken = token;
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

// Use in request function
async function request<T>(endpoint: string, options = {}): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // ... rest of request
}
```

## Common Mistakes to Avoid

1. **Relative URLs** - Always use absolute URLs with environment-configured base
2. **Duplicating fetch logic** - Use a centralized API client
3. **Field name mismatches** - Verify frontend/backend field names match exactly
4. **Ignoring platform differences** - Android emulator needs different localhost
5. **Synchronous token access** - SecureStore is async, handle accordingly
6. **Hardcoded URLs** - Use environment variables for configurability
7. **No error handling** - API calls can fail; handle errors gracefully

## Testing API Integration

```typescript
// Verify API URL is correctly configured
console.log('API Base URL:', API_BASE_URL);

// Test that auth token is being sent
console.log('Auth Header:', `Bearer ${await getAuthToken()}`);

// Verify field names match
const locationPayload = { lat: 37.7749, lng: -122.4194 };
console.log('Sending location:', JSON.stringify(locationPayload));
```
