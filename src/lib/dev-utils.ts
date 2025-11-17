/**
 * Development utilities for easier testing and debugging
 * These utilities allow bypassing authentication and onboarding during development
 */

export const isDevelopment = () => {
  return import.meta.env.DEV || import.meta.env.VITE_DEV_MODE === 'true';
};

export const isDevModeActive = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('dev') === 'true';
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
