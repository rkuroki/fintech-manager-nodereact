import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store.js';
import type { CurrentUser } from '@investor-backoffice/shared';
import { mockCurrentUser } from './mocks/handlers/auth.handlers.js';

interface TestProvidersProps {
  children: ReactNode;
  user?: CurrentUser;
  initialRoute?: string;
}

/**
 * Wraps components with all necessary providers for testing.
 * Optionally pre-sets the auth store with a given user.
 */
export function TestProviders({ children, user = mockCurrentUser, initialRoute = '/' }: TestProvidersProps) {
  // Pre-set auth state for tests
  useAuthStore.setState({ token: 'mock-token', user });

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          {children}
        </MemoryRouter>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
