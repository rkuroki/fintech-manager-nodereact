import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider } from 'antd';
import { SensitiveField } from './SensitiveField.js';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ConfigProvider>{children}</ConfigProvider>;
}

describe('SensitiveField', () => {
  it('shows "Restricted" when user lacks permission', () => {
    render(<SensitiveField value="secret" visible={false} />, { wrapper: Wrapper });
    expect(screen.getByText('Restricted')).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('shows dash when value is null/undefined and user has permission', () => {
    render(<SensitiveField value={null} visible={true} />, { wrapper: Wrapper });
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows masked dots by default when user has permission', () => {
    render(<SensitiveField value="secret" visible={true} />, { wrapper: Wrapper });
    expect(screen.getByText('••••••••')).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('reveals value on button click', async () => {
    const user = userEvent.setup();
    render(<SensitiveField value="my-secret" visible={true} />, { wrapper: Wrapper });

    const revealButton = screen.getByRole('button');
    await user.click(revealButton);

    expect(screen.getByText('my-secret')).toBeInTheDocument();
    expect(screen.queryByText('••••••••')).not.toBeInTheDocument();
  });

  it('hides value again on second click', async () => {
    const user = userEvent.setup();
    render(<SensitiveField value="my-secret" visible={true} />, { wrapper: Wrapper });

    const revealButton = screen.getByRole('button');
    await user.click(revealButton); // reveal
    await user.click(revealButton); // hide

    expect(screen.getByText('••••••••')).toBeInTheDocument();
  });
});
