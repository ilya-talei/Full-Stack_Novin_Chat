import { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '@services/authService';
import { socketService } from '@services/socketService';
import { AUTH_ACTIONS } from '@constants/actionTypes';
import { config } from '@constants/config';
import { clearAppCache } from '@utils/settingsRuntime';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return { ...state, loading: true, error: null };
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        loading: false,
        error: null,
      };
    case AUTH_ACTIONS.LOGIN_FAILURE:
      return { ...state, loading: false, error: action.payload, isAuthenticated: false };
    case AUTH_ACTIONS.LOGOUT:
      return { ...initialState, loading: false };
    case AUTH_ACTIONS.SET_USER:
      return { ...state, user: action.payload, isAuthenticated: !!action.payload, loading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (config.useMockAuth) {
        const user = authService.getStoredUser();
        const token = authService.getStoredToken();
        if (!cancelled) {
          dispatch({
            type: AUTH_ACTIONS.SET_USER,
            payload: user && token ? user : null,
          });
        }
        return;
      }

      try {
        const session = await authService.me();
        authService.saveSession(session, true);
        socketService.connect();
        if (!cancelled) {
          dispatch({ type: AUTH_ACTIONS.SET_USER, payload: session.user });
        }
      } catch {
        authService.clearSession();
        if (!cancelled) {
          dispatch({ type: AUTH_ACTIONS.SET_USER, payload: null });
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (credentials, rememberMe = true) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });
    try {
      const data = await authService.login(credentials);
      authService.saveSession(data, rememberMe);
      if (!config.useMockAuth) socketService.connect();
      dispatch({ type: AUTH_ACTIONS.LOGIN_SUCCESS, payload: data });
      return data;
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.LOGIN_FAILURE, payload: error.message });
      throw error;
    }
  };

  const logout = async () => {
    try {
      const raw = localStorage.getItem('novin_tg_settings');
      const prefs = raw ? JSON.parse(raw) : null;
      if (prefs?.data?.clearCacheOnExit) {
        clearAppCache({ includeDownloads: true });
      }
    } catch {
      /* ignore */
    }
    await authService.logout();
    authService.clearSession();
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
