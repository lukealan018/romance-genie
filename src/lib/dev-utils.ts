/**
 * Development utilities for easier testing and debugging
 * These utilities allow bypassing authentication and onboarding during development
 */

export const isDevelopment = () => {
  return import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true';
};

export const isPreviewEnvironment = () => {
  const hostname = window.location.hostname;
  return (
    import.meta.env.DEV ||
    hostname.includes('lovable.app') ||
    hostname.includes('lovable.dev') ||
    hostname === 'localhost'
  );
};

export const isDevModeActive = () => {
  // SECURITY: Only allow dev mode in development environment
  if (!import.meta.env.DEV) {
    return false;
  }
  
  // ONLY activate dev mode with explicit URL parameter
  // Don't auto-activate from localStorage alone - user must intentionally add ?dev=true
  const params = new URLSearchParams(window.location.search);
  const devParam = params.get('dev') === 'true';
  
  return devParam;
};

export const enableDevMode = () => {
  localStorage.setItem('devMode', 'true');
  logDevMode('Dev mode enabled');
};

export const disableDevMode = () => {
  localStorage.removeItem('devMode');
  logDevMode('Dev mode disabled');
};

export const getDevUserId = () => {
  return 'dev-user-id-12345';
};

export const getMockProfile = () => {
  return {
    user_id: getDevUserId(),
    nickname: 'Dev Tester',
    home_zip: '10001',
    default_radius_mi: 5,
    cuisines: ['Italian', 'Japanese', 'Mexican'],
    activities: ['Live Music', 'Movie Theater', 'Museums'],
    dietary: ['Vegetarian'],
    updated_at: new Date().toISOString(),
  };
};

export const getUrlParam = (param: string): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get(param);
};

export const shouldSkipOnboarding = () => {
  return isDevModeActive() && getUrlParam('skipOnboarding') === 'true';
};

export const getStartStep = (): number | null => {
  if (!isDevModeActive()) return null;
  
  const step = getUrlParam('step');
  return step ? parseInt(step, 10) : null;
};

export const logDevMode = (message: string, data?: any) => {
  if (isDevModeActive()) {
    console.log(`[DEV MODE] ${message}`, data || '');
  }
};
