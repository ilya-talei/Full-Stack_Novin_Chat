import api from '@services/api';
import { config } from '@constants/config';
import { API_ENDPOINTS } from '@constants/apiEndpoints';
import {
  mapAuthResponse,
  getAuthErrorMessage,
  DEV_USER,
} from '@/types/auth';
import { socketService } from '@services/socketService';

const MOCK_USERS = [
  { id: '1', username: 'admin', password: '123456', email: 'admin@novinchat.ir', name: 'مدیر سیستم' },
  { id: '2', username: 'user', password: '123456', email: 'user@novinchat.ir', name: 'کاربر تست' },
];

function delay(ms = 500) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createMockSession(user) {
  return {
    token: `mock_token_${user.id}_${Date.now()}`,
    refreshToken: `mock_refresh_${user.id}_${Date.now()}`,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      avatar: null,
      status: 'online',
    },
  };
}

function toSession(user) {
  return {
    token: 'cookie',
    refreshToken: 'cookie',
    user: {
      id: String(user.id),
      username: user.username,
      email: user.email ?? `${user.username}@local.dev`,
      name: user.name ?? user.username,
      avatar: user.avatar ?? null,
      status: user.status ?? 'online',
    },
  };
}

export const authService = {
  /** @param {import('@/types/auth').LoginCredentials} credentials */
  async login(credentials) {
    if (config.useMockAuth) {
      await delay();
      const user = MOCK_USERS.find(
        (u) => u.username === credentials.username && u.password === credentials.password
      );
      if (!user) throw new Error('نام کاربری یا رمز عبور اشتباه است');
      return createMockSession(user);
    }

    try {
      const username = String(credentials.username ?? '').trim();
      const password = String(credentials.password ?? '').trim();
      const { data } = await api.post(API_ENDPOINTS.AUTH.LOGIN, {
        login_id: username,
        username,
        password,
      });
      return {
        ...toSession(data.user),
        // Prefer body tokens (needed for APK); fall back to cookie marker for web
        token: data.token || 'cookie',
        refreshToken: data.secret || 'cookie',
      };
    } catch (error) {
      throw new Error(getAuthErrorMessage(error, 'خطا در ورود'));
    }
  },

  async logout() {
    if (!config.useMockAuth) {
      try {
        await api.post(API_ENDPOINTS.AUTH.LOGOUT);
      } catch {
        /* session cleared locally regardless */
      }
      socketService.disconnect();
    } else {
      await delay(200);
    }
    return { success: true };
  },

  async me() {
    if (config.useMockAuth) {
      const user = this.getStoredUser();
      if (!user) throw new Error('نشست یافت نشد');
      return toSession(user);
    }

    const { data } = await api.get(API_ENDPOINTS.AUTH.ME);
    return toSession(data.user);
  },

  async refreshToken(refreshToken) {
    if (config.useMockAuth) {
      await delay(200);
      if (!refreshToken?.startsWith('mock_refresh_')) {
        throw new Error('توکن نامعتبر است');
      }
      const userId = refreshToken.split('_')[2];
      const user = MOCK_USERS.find((u) => u.id === userId);
      if (!user) throw new Error('کاربر یافت نشد');
      return createMockSession(user);
    }

    try {
      await api.post(API_ENDPOINTS.AUTH.REFRESH);
      return this.me();
    } catch (error) {
      throw new Error(getAuthErrorMessage(error, 'توکن نامعتبر است'));
    }
  },

  createDevSession() {
    return {
      token: `dev_token_${Date.now()}`,
      refreshToken: `dev_refresh_${Date.now()}`,
      user: { ...DEV_USER },
    };
  },

  /** @param {import('@/types/auth').AuthSession} session */
  saveSession({ token, refreshToken, user }, rememberMe = true) {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(config.tokenKey, token || 'cookie');
    storage.setItem(config.refreshTokenKey, refreshToken || 'cookie');
    storage.setItem(config.userKey, JSON.stringify(user));
  },

  clearSession() {
    [localStorage, sessionStorage].forEach((storage) => {
      storage.removeItem(config.tokenKey);
      storage.removeItem(config.refreshTokenKey);
      storage.removeItem(config.userKey);
    });
  },

  getStoredUser() {
    const userStr =
      localStorage.getItem(config.userKey) || sessionStorage.getItem(config.userKey);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  getStoredToken() {
    return localStorage.getItem(config.tokenKey) || sessionStorage.getItem(config.tokenKey);
  },
};
