# My QA Portfolio

Personal portfolio for a QA analyst, built with **Astro 7**, **React** islands, **TypeScript** and **Tailwind CSS**. The site is also a test target: it ships with unit, component, end-to-end, accessibility and performance tests.

<!-- After pushing to GitHub, add your badge:
![CI](https://github.com/<user>/<repo>/actions/workflows/ci.yml/badge.svg) -->

## Quick start

```bash
npm install
npx playwright install   # one-time: downloads test browsers
npm run dev              # http://localhost:4321
```

## Scripts

| Command              | What it does                                                             |
| -------------------- | ------------------------------------------------------------------------ |
| `npm run dev`        | Dev server with hot reload                                               |
| `npm run build`      | Production build to `dist/`                                              |
| `npm run preview`    | Serve the production build                                               |
| `npm run lint`       | ESLint                                                                   |
| `npm run check`      | Astro/TypeScript type-check                                              |
| `npm run format`     | Prettier                                                                 |
| `npm run test:unit`  | Vitest + React Testing Library                                           |
| `npm run test:e2e`   | Playwright (Chromium, Firefox, WebKit, mobile) incl. axe a11y tests      |
| `npm run lighthouse` | Lighthouse CI against `dist/` (build first). Reports in `.lighthouseci/` |
| `npm test`           | Unit + E2E                                                               |

## Project layout

```
src/
  pages/        routes (index, about, projects, contact, 404)
  components/   Astro components and React islands (.tsx)
  content/      case studies in Markdown/MDX, validated by src/content.config.ts
  layouts/      shared page shell (SEO tags, skip link, header/footer)
  styles/       Tailwind import and design tokens
tests/
  unit/         Vitest component and logic tests
  e2e/          Playwright specs (smoke, navigation, contact form, a11y)
.github/workflows/ci.yml   CI pipeline
```

## Quality gates

- **Pre-commit** (Husky + lint-staged): ESLint and Prettier on staged files.
- **Pre-push**: type-check and unit tests.
- **CI** (GitHub Actions): lint, type-check, unit tests, build, Playwright, Lighthouse CI. The Playwright HTML report is uploaded as an artifact.
- **Lighthouse budgets** (`lighthouserc.json`): performance ≥ 90, accessibility ≥ 95, best practices ≥ 90, SEO ≥ 90.
- **Content schema**: a case study missing required front matter fails the build.

See [TEST_PLAN.md](./TEST_PLAN.md) for the test strategy.

## Before you deploy

- [ ] Set `site` in `astro.config.mjs` to your real domain.
- [ ] Replace "Your Name" and the placeholder copy (Header, Footer, pages, `<title>`s).
- [ ] Connect the contact form to a real endpoint (see the TODO in `src/components/ContactForm.tsx`).
- [ ] Replace the sample case study with real ones.
