import axios from 'axios';
import { config } from '@constants/config';
import { API_ENDPOINTS } from '@constants/apiEndpoints';

const api = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

function isAuthUrl(url = '') {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/token') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout') ||
    url.includes('/auth/me')
  );
}

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
        await axios.post(
          `${config.apiBaseUrl}${API_ENDPOINTS.AUTH.REFRESH}`,
          {},
          { withCredentials: true }
        );
        return api(originalRequest);
      } catch {
        localStorage.removeItem(config.tokenKey);
        localStorage.removeItem(config.refreshTokenKey);
        localStorage.removeItem(config.userKey);
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
