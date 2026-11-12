# Jam Manzanero: Portfolio

Personal portfolio of Jan Adrian "Jam" Manzanero, a QA analyst moving towards software and AI. Built with **Astro 7**, **TypeScript**, **Tailwind CSS 4** and Markdown content collections. The site is also a test target: it ships with unit, end-to-end, accessibility and performance tests.

Live site: <https://thisisjanadrian.github.io> (published with GitHub Pages, see [Deploying](#deploying)).

<!-- After pushing to GitHub, add your badge:
![CI](https://github.com/<user>/<repo>/actions/workflows/ci.yml/badge.svg) -->

## What is on the page

One scrolling page with a floating nav (Jam, Work, Journey, Life) and a light/dark toggle:

- **Hero**: portrait, name, and the roles revealed one after another by two thin bars; a terminal card with the summary.
- **Work**: Projects (each links to a case study), the Stack (a filterable pool of skills: QA, SWE, AI) and Certifications (with verification links).
- **Journey**: a timeline of jobs and studies, with a picture on the other side of the line.
- **Life**: what matters outside of work.
- **Get in touch**: a button that opens an email to the owner.

There are also case-study pages (`/projects/<name>`) and a 404 page.

## Quick start

Needs Node.js 22.22 or newer.

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
| `npm run test:unit`  | Vitest unit tests                                                        |
| `npm run test:e2e`   | Playwright (Chromium, Firefox, WebKit, mobile) incl. axe a11y tests      |
| `npm run lighthouse` | Lighthouse CI against `dist/` (build first). Reports in `.lighthouseci/` |
| `npm test`           | Unit + E2E                                                               |

The end-to-end tests run against the production build (`npm run build` and `npm run preview`). Set `E2E_PORT` to use a port other than 4321.

## Changing the content

| What                                             | Where                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| Name, email, GitHub and LinkedIn links           | `src/data/site.ts`                                               |
| Summary, skills, certifications                  | `src/data/profile.ts`                                            |
| Roles shown under the name                       | `src/data/roles.ts`                                              |
| Journey entries (and their pictures)             | `src/data/journey.ts`, pictures in `src/assets/journey/`         |
| Life cards (text, icons, the Spotify link)       | the top of `src/components/sections/Life.astro`                  |
| Case studies                                     | `src/content/projects/*.md` (checked by `src/content.config.ts`) |
| Hero photo                                       | `src/assets/jam2_compressed_2.jpg`, imported in `Hero.astro`     |
| Favicon                                          | `public/` (a rounded square crop of a photo, see `Layout.astro`) |
| Colours, type sizes, shared spacing (`--gutter`) | `src/styles/global.css`                                          |

Personal source files (the resume, the profile export, original photos) live in `jam_assets/`, which is git-ignored and never published.

## Project layout

```
src/
  pages/        routes: index (one-page scroll), projects/[id] (case studies), 404
  components/   Header, Footer, Terminal, ExternalLink, sections/ (Hero, Work, Journey, Life, Contact;
                Work is made of Projects and Skills)
  content/      case studies in Markdown, validated by src/content.config.ts
  data/         site, profile, journey and roles data
  layouts/      shared page shell (SEO tags, theme script, skip link, header/footer)
  styles/       Tailwind import, type scale, colours and shared styles
  assets/       images that Astro resizes and converts at build time
public/         favicons
tests/
  unit/         Vitest tests for logic (links, names, profile data)
  e2e/          Playwright specs (layout, typography, navigation, motion, accessibility, ...)
.github/workflows/
  ci.yml        quality checks on every push and pull request
  deploy.yml    publishes the site to GitHub Pages when main changes
```

## Quality gates

- **Pre-commit** (Husky + lint-staged): ESLint and Prettier on staged files.
- **Pre-push**: type-check and unit tests.
- **CI** (GitHub Actions): lint, type-check, unit tests, build, Playwright, Lighthouse CI. The Playwright HTML report is uploaded as an artifact.
- **Lighthouse budgets** (`lighthouserc.json`): performance ≥ 90, accessibility ≥ 95, best practices ≥ 90, SEO ≥ 90.
- **Content schema**: a case study missing required front matter fails the build.

See [TEST_PLAN.md](./TEST_PLAN.md) for the test strategy.

## Deploying

The site is static, and `.github/workflows/deploy.yml` publishes it to GitHub Pages every time `main` changes (or when run by hand from the Actions tab).

One-time setup:

1. Name the repository `<your-user>.github.io` so the site is served from the root of that address (the links in the site assume it is not in a sub-folder).
2. Set `site` in `astro.config.mjs` to that address (it feeds the sitemap and canonical links).
3. On GitHub, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.

After that, a change goes live by merging it into `main`. Work on a branch, open a pull request (CI runs on it), and merge.

Free GitHub Pages needs a public repository. It serves static files only (no custom response headers or server code).
