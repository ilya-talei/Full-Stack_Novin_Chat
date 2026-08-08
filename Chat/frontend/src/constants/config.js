export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  wsUrl: import.meta.env.VITE_WS_URL ?? '',
  useMockAuth: import.meta.env.VITE_USE_MOCK_AUTH === 'true',
  klipyApiKey: import.meta.env.VITE_KLIPY_API_KEY ?? '',
  appName: 'نوین چت',
  tokenKey: 'novin_chat_token',
  refreshTokenKey: 'novin_chat_refresh_token',
  userKey: 'novin_chat_user',
};
