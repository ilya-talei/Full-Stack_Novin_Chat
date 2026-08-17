/**
 * @typedef {Object} LoginCredentials
 * @property {string} username
 * @property {string} password
 */

/**
 * @typedef {Object} RegisterPayload
 * @property {string} username
 * @property {string} email
 * @property {string} password
 */

/**
 * @typedef {Object} AuthUser
 * @property {string} id
 * @property {string} username
 * @property {string} email
 * @property {string} name
 * @property {string|null} [avatar]
 * @property {string|null} [phone]
 * @property {'online'|'offline'|'away'} [status]
 */

/**
 * @typedef {Object} AuthSession
 * @property {string} token
 * @property {string} refreshToken
 * @property {AuthUser} user
 */

/**
 * @typedef {Object} BackendAuthResponse
 * @property {string} token
 * @property {string} refreshToken
 * @property {AuthUser} user
 * @property {string} [message]
 */

/**
 * @typedef {Object} BackendErrorResponse
 * @property {string} message
 * @property {string} [code]
 * @property {Record<string, string[]>} [errors]
 */

/** @type {AuthUser} */
export const DEV_USER = {
  id: 'dev-1',
  username: 'dev_user',
  email: 'dev@novinchat.ir',
  name: 'کاربر توسعه',
  avatar: null,
  status: 'online',
};

/**
 * نرمال‌سازی پاسخ بک‌اند به فرمت داخلی فرانت
 * @param {BackendAuthResponse} data
 * @returns {AuthSession}
 */
export function mapAuthResponse(data) {
  return {
    token: data.token,
    refreshToken: data.refreshToken,
    user: {
      id: String(data.user.id),
      username: data.user.username,
      email: data.user.email,
      name: data.user.name ?? data.user.username,
      avatar: data.user.avatar ?? null,
      phone: data.user.phone ?? null,
      status: data.user.status ?? 'online',
    },
  };
}

/**
 * استخراج پیام خطا از پاسخ axios
 * @param {import('axios').AxiosError<BackendErrorResponse>} error
 * @param {string} fallback
 * @returns {string}
 */
export function getAuthErrorMessage(error, fallback) {
  if (!error.response) {
    const base = (error.config?.baseURL || '').replace(/\/$/, '');
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      return base
        ? `اتصال به سرور برقرار نشد (${base}). وای‌فای و آدرس API را چک کنید.`
        : 'اتصال به سرور برقرار نشد. شبکه را چک کنید.';
    }
  }
  return error.response?.data?.message || error.message || fallback;
}
