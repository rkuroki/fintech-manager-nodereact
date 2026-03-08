import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App } from 'antd';
import { GmailConnectButton } from './GmailConnectButton.js';

// Mock the auth store
const mockHasPermission = vi.fn();
vi.mock('../../store/auth.store.js', () => ({
  useAuthStore: () => ({
    hasPermission: mockHasPermission,
  }),
}));

// Mock the gmail API
const mockGetStatus = vi.fn();
const mockGetAuthUrl = vi.fn();
vi.mock('../../api/gmail.api.js', () => ({
  gmailApi: {
    getStatus: (...args: unknown[]) => mockGetStatus(...args),
    getAuthUrl: (...args: unknown[]) => mockGetAuthUrl(...args),
    disconnect: vi.fn().mockResolvedValue(undefined),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ConfigProvider>
          <App>{children}</App>
        </ConfigProvider>
      </QueryClientProvider>
    );
  };
}

describe('GmailConnectButton', () => {
  beforeEach(() => {
    mockHasPermission.mockReset();
    mockGetStatus.mockReset();
    mockGetAuthUrl.mockReset();
  });

  it('renders nothing when user lacks GMAIL_CONNECT permission', () => {
    mockHasPermission.mockReturnValue(false);
    render(<GmailConnectButton />, { wrapper: createWrapper() });
    expect(screen.queryByText('Connect Gmail')).not.toBeInTheDocument();
    expect(screen.queryByText(/Gmail:/)).not.toBeInTheDocument();
  });

  it('renders nothing when Gmail is not configured (configured: false)', async () => {
    mockHasPermission.mockReturnValue(true);
    mockGetStatus.mockResolvedValue({ connected: false, email: null, connectedAt: null, configured: false });
    render(<GmailConnectButton />, { wrapper: createWrapper() });

    // Wait for the query to settle
    await waitFor(() => {
      expect(mockGetStatus).toHaveBeenCalled();
    });

    // Should not show connect button when not configured
    expect(screen.queryByText('Connect Gmail')).not.toBeInTheDocument();
  });

  it('renders Connect Gmail button when configured but not connected', async () => {
    mockHasPermission.mockReturnValue(true);
    mockGetStatus.mockResolvedValue({ connected: false, email: null, connectedAt: null, configured: true });
    render(<GmailConnectButton />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Connect Gmail')).toBeInTheDocument();
    });
  });

  it('shows connected status with email when connected', async () => {
    mockHasPermission.mockReturnValue(true);
    mockGetStatus.mockResolvedValue({
      connected: true,
      email: 'analyst@company.com',
      connectedAt: '2026-03-08T10:00:00Z',
      configured: true,
    });
    render(<GmailConnectButton />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Gmail: analyst@company.com')).toBeInTheDocument();
    });
  });
});
