/**
 * Service to handle Google Fit API interactions
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read';

/**
 * Initializes Google OAuth 2.0 with GIS
 */
export const initGoogleAuth = (onSuccess, onError) => {
  if (!window.google) {
    console.warn('Google Identity Services script not loaded');
    return null;
  }

  if (!CLIENT_ID) {
    console.warn('Google Client ID not configured. Link functions disabled.');
    return null;
  }

  const client = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (response) => {
      if (response.error_code) {
        onError(response);
      } else {
        onSuccess(response);
      }
    },
  });

  return client;
};

/**
 * Fetches step count for the last 24 hours
 * @param {string} accessToken 
 */
export const fetchStepCount = async (accessToken) => {
  const endTime = new Date().getTime();
  const startTime = endTime - 24 * 60 * 60 * 1000; // 24 hours ago

  const response = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      aggregateBy: [{
        dataTypeName: "com.google.step_count.delta",
        dataSourceId: "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"
      }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startTime,
      endTimeMillis: endTime
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch fitness data');
  }

  const data = await response.json();

  // Extract steps from aggregate data
  let steps = 0;
  if (data.bucket && data.bucket[0] && data.bucket[0].dataset[0].point[0]) {
    steps = data.bucket[0].dataset[0].point[0].value[0].intVal;
  }

  return steps;
};

/**
 * Fetches calories burned for the last 24 hours
 */
export const fetchCalories = async (accessToken) => {
  const endTime = new Date().getTime();
  const startTime = endTime - 24 * 60 * 60 * 1000;

  const response = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      aggregateBy: [{
        dataTypeName: "com.google.calories.expended"
      }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startTime,
      endTimeMillis: endTime
    }),
  });

  if (!response.ok) return 0;

  const data = await response.json();
  let calories = 0;
  if (data.bucket && data.bucket[0] && data.bucket[0].dataset[0].point[0]) {
    calories = Math.round(data.bucket[0].dataset[0].point[0].value[0].fpVal);
  }

  return calories;
};
