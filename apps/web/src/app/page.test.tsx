import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from './page';

describe('HomePage', () => {
  it('renders the StoryMe heading', () => {
    render(<HomePage />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeDefined();
    expect(heading.textContent).toBe('StoryMe');
  });

  it('renders the primary CTA link', () => {
    render(<HomePage />);
    const cta = screen.getByRole('link', { name: /create your first book/i });
    expect(cta).toBeDefined();
  });

  it('renders the sign-in link', () => {
    render(<HomePage />);
    const signIn = screen.getByRole('link', { name: /sign in/i });
    expect(signIn).toBeDefined();
  });
});
