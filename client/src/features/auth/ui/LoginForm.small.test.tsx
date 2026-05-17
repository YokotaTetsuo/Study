// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LoginForm } from './LoginForm';

afterEach(() => {
  cleanup();
});

describe('LoginForm', () => {
  it('should submit the entered credentials', () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} pending={false} />);

    fireEvent.change(screen.getByLabelText(/メールアドレス/), {
      target: { value: 'a@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/パスワード/), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'a@example.com',
      password: 'password123',
    });
  });

  it('should render an error message when provided', () => {
    render(
      <LoginForm onSubmit={vi.fn()} pending={false} errorMessage="認証失敗" />,
    );

    expect(screen.getByText('認証失敗')).toBeTruthy();
  });

  it('should disable the submit button while pending', () => {
    render(<LoginForm onSubmit={vi.fn()} pending />);

    expect(
      screen.getByRole('button', { name: 'ログイン' }).hasAttribute('disabled'),
    ).toBe(true);
  });
});
