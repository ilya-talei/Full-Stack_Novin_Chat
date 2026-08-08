import axios from 'axios';
import { config } from '@constants/config';
import { API_ENDPOINTS } from '@constants/apiEndpoints';

const api = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

function readStoredToken() {
  return (
    localStorage.getItem(config.tokenKey) ||
    sessionStorage.getItem(config.tokenKey) ||
    ''
  );
}

function readStoredRefresh() {
  return (
    localStorage.getItem(config.refreshTokenKey) ||
    sessionStorage.getItem(config.refreshTokenKey) ||
    ''
  );
}

function isBearerToken(value) {
  return Boolean(value) && value !== 'cookie';
}

function isAuthUrl(url = '') {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/token') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout') ||
    url.includes('/auth/me')
  );
}

api.interceptors.request.use((req) => {
  const token = readStoredToken();
  if (isBearerToken(token)) {
    req.headers = req.headers || {};
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    const shouldRefresh =
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !config.useMockAuth &&
      !isAuthUrl(originalRequest.url);

    if (shouldRefresh) {
      originalRequest._retry = true;

      try {
        const refresh = readStoredRefresh();
        const body = isBearerToken(refresh) ? { secret: refresh } : {};
        const { data } = await axios.post(
          `${config.apiBaseUrl}${API_ENDPOINTS.AUTH.REFRESH}`,
          body,
          {
            withCredentials: true,
            headers: isBearerToken(refresh)
              ? { 'X-Refresh-Token': refresh, 'Content-Type': 'application/json' }
              : { 'Content-Type': 'application/json' },
          }
        );
        if (data?.token && isBearerToken(refresh)) {
          const store =
            localStorage.getItem(config.tokenKey) != null ? localStorage : sessionStorage;
          store.setItem(config.tokenKey, data.token);
        }
        return api(originalRequest);
      } catch {
        localStorage.removeItem(config.tokenKey);
        localStorage.removeItem(config.refreshTokenKey);
        localStorage.removeItem(config.userKey);
        sessionStorage.removeItem(config.tokenKey);
        sessionStorage.removeItem(config.refreshTokenKey);
        sessionStorage.removeItem(config.userKey);
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
