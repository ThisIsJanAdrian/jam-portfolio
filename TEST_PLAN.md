# Test Plan: QA Portfolio Website

_Template. Fill in or adjust each section as the site grows._

## 1. Scope

**In scope:** all public pages, navigation, contact form, case-study rendering, accessibility, performance, SEO metadata, cross-browser and mobile layout.

**Out of scope:** the third-party contact-form service's internals, hosting-provider infrastructure, load testing.

## 2. Risks and priorities

| Risk                                      | Impact | Likelihood | Mitigation                                |
| ----------------------------------------- | ------ | ---------- | ----------------------------------------- |
| Broken links or 404s on key pages         | High   | Medium     | E2E link crawler (`navigation.spec.ts`)   |
| Contact form fails or accepts bad input   | High   | Medium     | Unit tests + E2E (`contact-form.spec.ts`) |
| Accessibility regressions                 | High   | Medium     | axe on every page, Lighthouse budget      |
| Slow load / poor Core Web Vitals          | Medium | Low        | Lighthouse CI budgets                     |
| Layout broken in Safari / Firefox / phone | Medium | Medium     | 4 Playwright projects                     |
| Malformed case study published            | Medium | Low        | Zod content schema fails the build        |

## 3. Test levels

| Level         | Tooling                    | Location                                |
| ------------- | -------------------------- | --------------------------------------- |
| Unit          | Vitest                     | `tests/unit`                            |
| Component     | React Testing Library      | `tests/unit`                            |
| End-to-end    | Playwright                 | `tests/e2e`                             |
| Accessibility | axe-core, Lighthouse       | `tests/e2e/a11y.spec.ts`, `lhci`        |
| Performance   | Lighthouse CI              | `lighthouserc.json`                     |
| Manual        | Exploratory charters below | (record sessions and bugs in a tracker) |

## 4. Techniques used

- Boundary value analysis (message length limit)
- Equivalence partitioning (valid vs. invalid email formats)
- Risk-based prioritisation (section 2)
- Exploratory testing (section 6)

## 5. Entry and exit criteria

**Entry:** build succeeds, lint and type-check pass.

**Exit:** all automated tests pass, Lighthouse budgets met, no open critical or high-severity bugs.

## 6. Manual exploratory charters (to be run and logged)

1. Keyboard-only navigation of every page: can everything be reached and operated, and is focus always visible?
2. Screen reader pass (NVDA + Firefox/Chrome) on the contact form.
3. 200% zoom and 320px-wide viewport: any clipped or overlapping content?
4. Dark mode and forced-colors mode: any unreadable text?
5. Slow 3G and offline: does the site degrade gracefully?

## 7. Known limitations

- Automated accessibility checks find only a portion of WCAG issues; manual testing covers the rest.
- WebKit does not Tab to links by default, so the skip-link test is skipped there.
