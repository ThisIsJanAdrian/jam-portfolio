import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ContactForm, { validate } from '../../src/components/ContactForm';

describe('validate()', () => {
  it('accepts a valid submission', () => {
    expect(
      validate({ name: 'Ana', email: 'ana@example.com', message: 'Hello there, friend.' }),
    ).toEqual({});
  });

  it('requires every field', () => {
    const errors = validate({ name: '', email: '', message: '' });
    expect(Object.keys(errors).sort()).toEqual(['email', 'message', 'name']);
  });

  // Boundary value analysis: the message limit is 10 characters.
  it.each([
    [9, true],
    [10, false],
    [11, false],
  ])('message of %i chars -> error: %s', (length, hasError) => {
    const errors = validate({ name: 'Ana', email: 'ana@example.com', message: 'x'.repeat(length) });
    expect('message' in errors).toBe(hasError);
  });

  // Equivalence partitioning on the email field.
  it.each(['plainaddress', 'missing@tld', '@no-local.com', 'spaces in@mail.com'])(
    'rejects invalid email %s',
    (email) => {
      expect(validate({ name: 'Ana', email, message: 'Long enough message.' }).email).toBeDefined();
    },
  );
});

describe('<ContactForm />', () => {
  it('shows validation errors and no success message on an empty submit', async () => {
    render(<ContactForm />);
    await userEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(screen.getAllByRole('alert')).toHaveLength(3);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows a success message after a valid submit', async () => {
    render(<ContactForm />);
    await userEvent.type(screen.getByLabelText('Name'), 'Ana');
    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Message'), 'Hello, this is a test message.');
    await userEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(screen.getByRole('status')).toHaveTextContent(/thanks/i);
  });
});
