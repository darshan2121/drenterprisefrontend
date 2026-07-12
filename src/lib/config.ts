// Manual switch: set to true for local development, false for production
// Use local backend so enableAutoPunch saves correctly (same MongoDB via server/.env)
const USE_LOCAL_BACKEND = false;

// API Configuration
export const API_CONFIG = {
  // Use manual switch to determine base URL
  BASE_URL: USE_LOCAL_BACKEND 
    ? 'http://localhost:5678/api'  // Local development
    : 'https://api.drenterprise.it/api',  // Production
  
  // Alternative URLs for different environments
  LOCAL_URL: 'http://localhost:5678/api',
  PRODUCTION_URL: 'https://api.drenterprise.it/api',
  STAGING_URL: 'https://apidrenterprice.cravorasolutions.com/api',
  
  // Timeout and retry settings
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

// Helper function to get the current API URL
export const getApiUrl = (): string => {
  return API_CONFIG.BASE_URL;
};

// Helper function to build full endpoint URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${getApiUrl()}/${endpoint.replace(/^\//, '')}`;
};

// Environment detection
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';

// Helper function to get current environment info
export const getEnvironmentInfo = () => {
  return {
    isLocal: USE_LOCAL_BACKEND,
    isProduction: !USE_LOCAL_BACKEND,
    currentUrl: API_CONFIG.BASE_URL,
    nodeEnv: process.env.NODE_ENV
  };
};

// Helper function to switch environments (for development purposes)
export const switchToLocal = () => {
  console.log('🔄 Switching to LOCAL environment');
  console.log('📍 URL:', API_CONFIG.LOCAL_URL);
  return API_CONFIG.LOCAL_URL;
};

export const switchToProduction = () => {
  console.log('🔄 Switching to PRODUCTION environment');
  console.log('📍 URL:', API_CONFIG.PRODUCTION_URL);
  return API_CONFIG.PRODUCTION_URL;
}; 