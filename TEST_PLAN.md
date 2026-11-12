# Test Plan: QA Portfolio Website

_Living document. Adjust each section as the site grows._

## 1. Scope

**In scope:** all public pages (home, case studies, 404), navigation and the scroll highlight, the light/dark toggle, the email button, external links, case-study rendering, content data, layout and typography on phones, laptops and large screens, motion and reduced-motion behaviour, accessibility, performance, SEO metadata and cross-browser layout.

**Out of scope:** hosting-provider infrastructure (GitHub Pages), load testing.

## 2. Risks and priorities

| Risk                                                        | Impact | Likelihood | Mitigation                                                          |
| ----------------------------------------------------------- | ------ | ---------- | ------------------------------------------------------------------- |
| Broken links or 404s on key pages                           | High   | Medium     | E2E link crawler (`navigation.spec.ts`)                             |
| The email button points to the wrong place                  | High   | Low        | E2E (`contact.spec.ts`)                                             |
| External link opens in the same tab or unsafely             | Medium | Medium     | E2E (`external-links.spec.ts`)                                      |
| Accessibility regressions                                   | High   | Medium     | axe on every page (`a11y.spec.ts`), Lighthouse budget               |
| Content touching the window edges or cramped on a laptop    | Medium | Medium     | Width matrix, 320 to 2560px (`gutters.spec.ts`, `spacing.spec.ts`)  |
| Text too small, or off the type scale, on phones            | Medium | Medium     | Computed font sizes at phone and desktop (`typography.spec.ts`)     |
| Animations ignore "reduce motion", or hide content for good | High   | Low        | Reduced-motion variants (`motion`, `reveal`, `roles`, `float`)      |
| Nav highlight wrong, off-centre, or jumping on long scrolls | Medium | Medium     | Scroll and click scenarios (`navigation.spec.ts`, `motion.spec.ts`) |
| Theme unreadable or not remembered                          | Medium | Low        | `theme.spec.ts`, `theme-toggle.spec.ts`, axe in both themes         |
| Slow load / poor Core Web Vitals                            | Medium | Low        | Lighthouse CI budgets                                               |
| Layout broken in Safari / Firefox / phone                   | Medium | Medium     | 4 Playwright projects                                               |
| Malformed case study published                              | Medium | Low        | Zod content schema fails the build                                  |

## 3. Test levels

| Level         | Tooling                                | Location                                               |
| ------------- | -------------------------------------- | ------------------------------------------------------ |
| Unit          | Vitest                                 | `tests/unit` (link helpers, name helper, profile data) |
| End-to-end    | Playwright                             | `tests/e2e`                                            |
| Layout / type | Playwright, measuring real boxes       | `hero`, `spacing`, `gutters`, `typography`, `journey`  |
| Motion        | Playwright, fake clock and real timing | `roles`, `reveal`, `float`, `motion`, `gleam`          |
| Accessibility | axe-core, Lighthouse                   | `tests/e2e/a11y.spec.ts`, `lhci`                       |
| Performance   | Lighthouse CI                          | `lighthouserc.json` (home page and one case study)     |
| Manual        | Exploratory charters below             | (record sessions and bugs in a tracker)                |

React Testing Library is installed, but there are no component tests yet because the site has no React components.

## 4. Techniques used

- Risk-based prioritisation (section 2)
- Boundary value analysis: window widths at the breakpoints and beyond (320, 360, 390, 640, 1024, 1280, 1920, 2560px) for margins, text sizes and layout
- Equivalence partitioning: phone, tablet and desktop widths; light and dark theme; with and without reduced motion; with and without JavaScript
- State-based testing: the hero role reveal (revealing, shown, hiding) and the nav highlight (which section is active)
- Measurement instead of screenshots: tests read computed sizes, positions and colours, so they fail with a number that says what is wrong
- Time control: a fake clock makes animation tests fast and independent of machine speed
- Exploratory testing (section 6)

## 5. Entry and exit criteria

**Entry:** build succeeds, lint and type-check pass.

**Exit:** all automated tests pass, Lighthouse budgets met, no open critical or high-severity bugs.

## 6. Manual exploratory charters (to be run and logged)

1. Keyboard-only navigation of every page: can everything be reached and operated, and is focus always visible?
2. Screen reader pass (NVDA + Firefox/Chrome) on the Stack filter and the hero roles (all roles should be read once, not as the animation runs).
3. 200% zoom and 320px-wide viewport: any clipped or overlapping content?
4. Dark mode and forced-colors mode: any unreadable text?
5. Slow 3G and offline: does the site degrade gracefully?
6. Floating glass nav: scroll behind it over light, dark and image backgrounds. Is the link text always readable (contrast), and does it still work where `backdrop-filter` is unsupported?
7. Anchor navigation: after every nav click, is the section heading fully visible below the nav, and does the browser Back button behave sensibly?
8. Laptop with display scaling (125% and 150%, so a 1536px and a 1280px wide window) and browser zoom 67% to 150%: are the margins comfortable and the text readable?
9. A real phone: Life cards, footer on one line, the nav and the theme button side by side, and dragging a Journey picture with a finger (a short hold first, so scrolling still works).
10. "Reduce motion" switched on and off while the page is open: do the hero roles, the floating terminal and the reveals follow it straight away?

## 7. Known limitations

- Automated accessibility checks find only a portion of WCAG issues; manual testing covers the rest.
- WebKit does not Tab to links by default, so the skip-link test is skipped there.
- In recent runs, a group of Journey pointer tests (picture hover and rubber-band drag) and one nav-animation test failed in Firefox and WebKit while passing in Chromium and mobile Chrome. They are not yet investigated, so Firefox and WebKit results should be read with that in mind.
- No visual-regression snapshots; look and feel is checked through measurements and by eye.
- Lighthouse runs on the home page and one case study only.
- GitHub Pages cannot set response headers, so security-header checks are not possible on the hosted site.
