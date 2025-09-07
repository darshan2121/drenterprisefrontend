# API Configuration Guide

This project now uses a centralized API configuration system to manage all API URLs and endpoints.

## Configuration Files

### 1. `src/lib/config.ts`
This is the main configuration file that contains:
- `USE_LOCAL_BACKEND`: Manual switch to toggle between local and production
- `API_CONFIG.BASE_URL`: The main API base URL (determined by the switch)
- Environment-specific URLs (local, production, staging)
- Helper functions for building API URLs
- Environment detection utilities

### 2. `src/lib/endpoints.ts`
This file contains all the API endpoints using the centralized BASE_URL.

## How to Use

### For API Calls in Components

Instead of hardcoding URLs like this:
```typescript
// ❌ Don't do this
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5678/api'}/employee`, {
```

Use the centralized configuration:
```typescript
// ✅ Do this
import { getApiUrl } from "@/lib/config";

const response = await fetch(`${getApiUrl()}/employee`, {
```

### For Building Full URLs

```typescript
import { buildApiUrl } from "@/lib/config";

// This will create: http://localhost:5678/api/employee
const employeeUrl = buildApiUrl('employee');

// This will create: http://localhost:5678/api/employee/123
const specificEmployeeUrl = buildApiUrl('employee/123');
```

### For Static Assets

```typescript
import { getApiUrl } from "@/lib/config";

const getImageUrl = (image: string | undefined) => {
  if (!image) return null;
  const baseUrl = getApiUrl().replace('/api', '');
  return `${baseUrl}/static/${image}`;
};
```

## Environment Switching

The system uses a manual switch `USE_LOCAL_BACKEND` in `src/lib/config.ts` to toggle between environments.

### Switching Environments

To switch between local and production, simply change the value in `src/lib/config.ts`:

```typescript
// For LOCAL DEVELOPMENT
const USE_LOCAL_BACKEND = true;  // Uses: http://localhost:5678/api

// For PRODUCTION
const USE_LOCAL_BACKEND = false; // Uses: https://api.drenterprise.it/api
```

### Helper Functions

You can also use helper functions to get environment information:

```typescript
import { getEnvironmentInfo, switchToLocal, switchToProduction } from "@/lib/config";

// Get current environment info
const envInfo = getEnvironmentInfo();
console.log(envInfo);
// Output: { isLocal: true, isProduction: false, currentUrl: "http://localhost:5678/api", nodeEnv: "development" }

// Switch to local (for development)
switchToLocal();

// Switch to production
switchToProduction();
```

## Benefits

1. **Centralized Management**: All API URLs are managed in one place
2. **Easy Environment Switching**: Simple boolean switch to toggle between local and production
3. **Type Safety**: TypeScript support for configuration
4. **Maintainability**: Easy to update URLs across the entire application
5. **Consistency**: Ensures all components use the same base URL
6. **Development Friendly**: Quick switching between environments during development

## Migration Guide

If you have existing components using hardcoded URLs:

1. Import the configuration:
   ```typescript
   import { getApiUrl } from "@/lib/config";
   ```

2. Replace hardcoded URLs:
   ```typescript
   // Before
   const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5678/api'}/endpoint`;
   
   // After
   const url = `${getApiUrl()}/endpoint`;
   ```

3. For static assets, use the pattern shown in the examples above.
