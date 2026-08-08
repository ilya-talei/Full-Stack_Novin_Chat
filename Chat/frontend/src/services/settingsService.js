import api from '@services/api';
import { API_ENDPOINTS } from '@constants/apiEndpoints';

export const settingsService = {
  async getSettings() {
    const { data } = await api.get(API_ENDPOINTS.USER.SETTINGS);
    return data.prefs ?? data.data ?? data;
  },

  async updateSettings(patch) {
    const { data } = await api.put(API_ENDPOINTS.USER.SETTINGS, patch);
    return data.prefs ?? data.data ?? data;
  },

  async getSessions() {
    const { data } = await api.get(API_ENDPOINTS.USER.SESSIONS);
    const list = data.sessions ?? data.data ?? [];
    return Array.isArray(list) ? list : [];
  },

  async terminateOtherSessions() {
    const { data } = await api.post(API_ENDPOINTS.USER.TERMINATE_OTHER_SESSIONS);
    return data;
  },
};
