import Constants from 'expo-constants';
export const APP_VERSION = Constants.expoConfig?.version || '0.0.0';
export const GITHUB_REPO = 'voilry/Reloom';
export const GITHUB_URL = 'https://github.com/voilry/Reloom/releases/latest';
export const UPDATE_CHECK_INTERVAL = 1000 * 60 * 60 * 12; // Check twice per day
