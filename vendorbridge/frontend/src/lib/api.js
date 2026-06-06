import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 30000,
});

const getFreshAccessToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const expiresAtMs = session.expires_at ? session.expires_at * 1000 : 0;
  const shouldRefresh = expiresAtMs && expiresAtMs - Date.now() < 60000;
  if (!shouldRefresh) return session.access_token;

  const { data, error } = await supabase.auth.refreshSession();
  if (error) return session.access_token;
  return data.session?.access_token || session.access_token;
};

api.interceptors.request.use(async (config) => {
  const accessToken = await getFreshAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const message = error.response?.data?.error || error.message || 'Something went wrong';
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      message === 'Invalid token' &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      const accessToken = refreshError ? null : data.session?.access_token;

      if (accessToken) {
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      }
    }

    return Promise.reject(new Error(message));
  }
);

export default api;
