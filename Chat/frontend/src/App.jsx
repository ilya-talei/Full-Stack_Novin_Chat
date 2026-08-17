import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@context/AuthContext';
import { ChatProvider, useChat } from '@context/ChatContext';
import { CallProvider } from '@context/CallContext';
import { ThemeProvider } from '@context/ThemeContext';
import { PerformanceProvider } from '@context/PerformanceContext';
import { SettingsProvider } from '@context/SettingsContext';
import { ToastProvider } from '@components/ui/Toast';
import HardwarePrompt from '@components/ui/HardwarePrompt';
import HardwarePromptOnAuth from '@components/ui/HardwarePromptOnAuth';
import ProtectedRoute from '@routes/ProtectedRoute';
import ErrorBoundary from '@components/ErrorBoundary';
import Spinner from '@components/ui/Spinner';
import { ROUTES } from '@constants/routes';
import ActiveCallOverlay from '@features/calls/components/ActiveCallOverlay';
import IncomingCallBanner from '@features/calls/components/IncomingCallBanner';

const LoginPage = lazy(() => import('@features/auth/pages/LoginPage'));
const MainLayout = lazy(() => import('@components/layout/MainLayout'));
const PrivateChat = lazy(() => import('@features/chat/components/PrivateChat'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
});

function AppShell() {
  const { activeChat } = useChat();

  return (
    <div className="app-shell flex chat-bg overflow-hidden">
      <IncomingCallBanner />
      <ActiveCallOverlay />
      <div
        className={`app-sidebar flex-shrink-0 w-full md:w-[380px] text-base relative border-l border-hairline/[0.06] bg-surface-panel flex flex-col min-h-0 overflow-hidden ${
          activeChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        <MainLayout />
      </div>
      <div
        className={`app-chat-pane flex-1 min-w-0 ${
          activeChat ? 'flex' : 'hidden md:flex'
        }`}
      >
        <PrivateChat />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <PerformanceProvider>
            <ToastProvider>
              <AuthProvider>
                <SettingsProvider>
                  <HardwarePromptOnAuth />
                  <ChatProvider>
                    <CallProvider>
                      <BrowserRouter>
                        <Suspense
                          fallback={
                            <div className="app-shell flex items-center justify-center chat-bg">
                              <Spinner size="lg" />
                            </div>
                          }
                        >
                          <Routes>
                            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
                            <Route
                              path="/*"
                              element={
                                <ProtectedRoute>
                                  <AppShell />
                                </ProtectedRoute>
                              }
                            />
                          </Routes>
                        </Suspense>
                        <HardwarePrompt />
                      </BrowserRouter>
                    </CallProvider>
                  </ChatProvider>
                </SettingsProvider>
              </AuthProvider>
            </ToastProvider>
          </PerformanceProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
