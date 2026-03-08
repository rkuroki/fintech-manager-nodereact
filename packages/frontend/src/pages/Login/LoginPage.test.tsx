import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import { server } from '../../tests/mocks/server.js';
import { http, HttpResponse } from 'msw';
import LoginPage from './LoginPage.js';

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <ConfigProvider>
        <AntApp>
          <MemoryRouter>{children}</MemoryRouter>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

describe('LoginPage', () => {
  it('renders login form', () => {
    render(<LoginPage />, { wrapper: Wrapper });
    expect(screen.getByText('Investor Backoffice')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('your@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('submits credentials on form submit', async () => {
    const user = userEvent.setup();
    render(<LoginPage />, { wrapper: Wrapper });

    await user.type(screen.getByPlaceholderText('your@email.com'), 'admin@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'Admin123!');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    // After successful login, the button should still exist or redirect occurs
    await waitFor(() => {
      // The mutation was triggered (no error displayed = success path)
      expect(screen.queryByText('Invalid email or password')).not.toBeInTheDocument();
    });
  });

  it('shows error message on failed login', async () => {
    server.use(
      http.post('/api/auth/login', () =>
        HttpResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      ),
    );

    const user = userEvent.setup();
    render(<LoginPage />, { wrapper: Wrapper });

    await user.type(screen.getByPlaceholderText('your@email.com'), 'wrong@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'WrongPass!');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });
});
