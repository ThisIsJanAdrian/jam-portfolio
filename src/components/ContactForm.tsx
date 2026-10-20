import { useState, type SubmitEvent } from 'react';

export interface ContactValues {
  name: string;
  email: string;
  message: string;
}

export type ContactErrors = Partial<Record<keyof ContactValues, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Pure validation logic, kept separate from the UI so it is trivial to unit test. */
export function validate(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  if (!values.name.trim()) errors.name = 'Name is required.';
  if (!values.email.trim()) errors.email = 'Email is required.';
  else if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email address.';
  if (values.message.trim().length < 10) errors.message = 'Message must be at least 10 characters.';
  return errors;
}

const fieldClass =
  'w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2';

export default function ContactForm() {
  const [values, setValues] = useState<ContactValues>({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState<ContactErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length === 0) {
      // TODO: send to a real endpoint (Formspree, Netlify Forms, etc.).
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <p role="status" className="rounded border border-[var(--color-border)] p-4">
        Thanks, your message was received.
      </p>
    );
  }

  const field = (key: keyof ContactValues, label: string, type = 'text') => (
    <div>
      <label htmlFor={key} className="mb-1 block font-medium">
        {label}
      </label>
      {key === 'message' ? (
        <textarea
          id={key}
          rows={5}
          className={fieldClass}
          value={values[key]}
          onChange={(e) => setValues({ ...values, [key]: e.target.value })}
          aria-invalid={errors[key] ? true : undefined}
          aria-describedby={errors[key] ? `${key}-error` : undefined}
        />
      ) : (
        <input
          id={key}
          type={type}
          className={fieldClass}
          value={values[key]}
          onChange={(e) => setValues({ ...values, [key]: e.target.value })}
          aria-invalid={errors[key] ? true : undefined}
          aria-describedby={errors[key] ? `${key}-error` : undefined}
        />
      )}
      {errors[key] && (
        <p id={`${key}-error`} role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
          {errors[key]}
        </p>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {field('name', 'Name')}
      {field('email', 'Email', 'email')}
      {field('message', 'Message')}
      <button
        type="submit"
        className="rounded bg-[var(--color-accent)] px-4 py-2 font-medium text-[var(--color-accent-contrast)]"
      >
        Send message
      </button>
    </form>
  );
}
