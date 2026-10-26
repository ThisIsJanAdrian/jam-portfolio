import { expect, test, type Page } from '@playwright/test';
import { experience } from '../../src/data/profile';
import { journey } from '../../src/data/journey';
import { revealAll, settle } from './helpers';

const items = (page: Page) => page.locator('[data-journey-item]');

// The event names Chrome's DevTools protocol accepts for touch input.
type TouchType = 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel';

// The Journey is a plain timeline: one full-width band per entry with a few bullet points, and a
// framed picture on the other side of the line. Nothing is pinned or slides.
test.describe('journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('lists at least five milestones, newest first, starting with the current job', async ({
    page,
  }) => {
    const titles = await items(page).locator('h3').allTextContents();
    expect(titles).toEqual(journey.map((item) => item.title));
    expect(titles.length).toBeGreaterThanOrEqual(5);
    expect(titles[0]).toBe(experience[0].role);
  });

  test('has a visible "Journey" heading above the timeline', async ({ page }) => {
    const heading = page.getByRole('heading', { level: 2, name: 'Journey', exact: true });
    await expect(heading).toBeVisible();
    await heading.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect(heading).toHaveClass(/is-revealed/);
    await settle(page); // it rises into place as it appears
    const headingBottom = (await heading.boundingBox())!.y + (await heading.boundingBox())!.height;
    const firstEntryTop = (await items(page).first().boundingBox())!.y;
    expect(headingBottom, 'the heading comes first').toBeLessThanOrEqual(firstEntryTop);
  });

  test('each milestone is a year, a title, the organization and a few short bullets', async ({
    page,
  }) => {
    await revealAll(page);
    for (const [index, item] of journey.entries()) {
      const entry = items(page).nth(index);
      expect(item.points.length, `${item.title}: keep it minimal`).toBeGreaterThanOrEqual(1);
      expect(item.points.length, `${item.title}: keep it minimal`).toBeLessThanOrEqual(3);

      await expect(entry.locator('.journey-year')).toHaveText(item.period);
      await expect(entry.locator('.journey-org')).toContainText(item.org);
      if (item.location) await expect(entry.locator('.journey-org')).toContainText(item.location);
      const bullets = await entry.locator('.journey-points li').allTextContents();
      expect(bullets).toEqual(item.points);
    }
  });

  test('the entries are a plain list: stacked in the normal flow, not pinned and not sliding', async ({
    page,
  }) => {
    const layout = await page.locator('#journey').evaluate((section) => {
      const entries = [...section.querySelectorAll('[data-journey-item]')];
      return {
        pinned: [section, ...section.querySelectorAll('*')].some(
          (el) => getComputedStyle(el).position === 'sticky',
        ),
        slides: [section, ...section.querySelectorAll('*')].some(
          (el) =>
            getComputedStyle(el).transitionProperty.includes('transform') &&
            el.matches('.journey-bg'),
        ),
        rects: entries.map((el) => {
          const { top, bottom, height } = el.getBoundingClientRect();
          return { top: top + window.scrollY, bottom: bottom + window.scrollY, height };
        }),
      };
    });
    expect(layout.pinned).toBe(false);
    expect(layout.slides).toBe(false);

    layout.rects.forEach((rect, i) => {
      // Tall enough that each picture stays in view for a while.
      const narrow = page.viewportSize()!.width < 640;
      if (!narrow) expect(rect.height, `entry ${i} is a generous band`).toBeGreaterThanOrEqual(380);
      if (i > 0) {
        // Stacked directly one after another, none on top of another.
        expect(Math.abs(rect.top - layout.rects[i - 1].bottom)).toBeLessThanOrEqual(1);
      }
    });
  });

  // The vertical timeline: a line with one dot per entry, entries alternating around it.
  test('has a vertical line with one dot per entry, in chronological order down the page', async ({
    page,
  }) => {
    await revealAll(page); // the dots pop in from nothing, so wait for them
    const m = await page.locator('[data-journey-list]').evaluate((wrap) => {
      const rect = (el: Element) => el.getBoundingClientRect();
      const centre = (el: Element) => rect(el).x + rect(el).width / 2;
      const line = wrap.querySelector('.journey-line')!;
      const dots = [...wrap.querySelectorAll('.journey-dot')];
      const entries = [...wrap.querySelectorAll('[data-journey-item]')];
      return {
        lineX: centre(line),
        lineHeight: rect(line).height,
        wrapHeight: rect(wrap).height,
        dots: dots.map((dot, i) => ({
          x: centre(dot),
          y: rect(dot).y + rect(dot).height / 2 + window.scrollY,
          top: rect(entries[i]).top + window.scrollY,
          bottom: rect(entries[i]).bottom + window.scrollY,
          width: rect(dot).width,
          hidden: dot.getAttribute('aria-hidden'),
        })),
      };
    });

    expect(m.dots).toHaveLength(journey.length);
    expect(Math.abs(m.lineHeight - m.wrapHeight), 'the line runs the whole timeline').toBeLessThan(
      2,
    );
    m.dots.forEach((dot, i) => {
      expect(Math.abs(dot.x - m.lineX), `dot ${i} sits on the line`).toBeLessThanOrEqual(1.5);
      expect(dot.width).toBeGreaterThanOrEqual(24);
      expect(dot.hidden).toBe('true');
      expect(dot.y, `dot ${i} is inside its own entry`).toBeGreaterThan(dot.top);
      expect(dot.y).toBeLessThan(dot.bottom);
      if (i > 0) expect(dot.y, 'newest first, going down').toBeGreaterThan(m.dots[i - 1].y);
    });
  });

  test('entries alternate sides of the line, with the year on the other side (phones: all beside it)', async ({
    page,
  }) => {
    await revealAll(page);
    const narrow = page.viewportSize()!.width < 640;
    const rows = await items(page).evaluateAll((all) =>
      all.map((el) => {
        const centre = (selector: string) => {
          const r = el.querySelector(selector)!.getBoundingClientRect();
          return r.x + r.width / 2;
        };
        return {
          body: centre('.journey-body'),
          year: centre('.journey-year'),
          dot: centre('.journey-dot'),
        };
      }),
    );

    rows.forEach((row, i) => {
      if (narrow) {
        // Line and dots on the left; year and entry to the right of them.
        expect(row.body, `entry ${i} beside the line`).toBeGreaterThan(row.dot);
        expect(row.year).toBeGreaterThan(row.dot);
      } else {
        const bodyOnLeft = row.body < row.dot;
        expect(bodyOnLeft, `entry ${i} alternates`).toBe(i % 2 === 0);
        expect(row.year < row.dot, `the year is opposite the entry at ${i}`).toBe(!bodyOnLeft);
      }
    });
  });

  test('the line draws itself once when the timeline first comes into view', async ({ page }) => {
    // A short window, so the top of the timeline is certainly not on screen at load.
    await page.setViewportSize({ width: page.viewportSize()!.width, height: 500 });
    await page.reload();
    const scale = () =>
      page
        .locator('.journey-line-fill')
        .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).d);
    expect(await scale(), 'not drawn before it is seen').toBeLessThan(0.05);

    await page.locator('#journey').scrollIntoViewIfNeeded();
    await page.evaluate(() =>
      document.querySelector('#journey')!.scrollIntoView({ behavior: 'instant' }),
    );
    await expect.poll(scale, { timeout: 6000 }).toBeGreaterThan(0.99);

    // Scrolling away does not undraw it.
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(300);
    expect(await scale()).toBeGreaterThan(0.99);
  });

  test('on phones the text is smaller and the entries sit closer together', async ({ page }) => {
    const narrow = page.viewportSize()!.width < 640;
    const m = await items(page)
      .nth(1)
      .evaluate((el) => ({
        title: parseFloat(getComputedStyle(el.querySelector('h3')!).fontSize),
        bullet: parseFloat(getComputedStyle(el.querySelector('.journey-points')!).fontSize),
        padding: parseFloat(getComputedStyle(el).paddingTop),
      }));
    if (narrow) {
      expect(m.title).toBeLessThanOrEqual(20);
      expect(m.bullet).toBeLessThanOrEqual(14);
      expect(m.padding, 'tighter than the 64px on desktop').toBeLessThanOrEqual(40);
    } else {
      expect(m.title).toBeGreaterThanOrEqual(24);
      expect(m.padding).toBe(64);
    }
  });

  test('the bands run edge to edge across the page', async ({ page }) => {
    const { x, width, viewport } = await items(page)
      .first()
      .evaluate((el) => ({
        x: el.getBoundingClientRect().x,
        width: el.getBoundingClientRect().width,
        viewport: document.documentElement.clientWidth,
      }));
    expect(Math.abs(x)).toBeLessThanOrEqual(1);
    expect(Math.abs(width - viewport)).toBeLessThanOrEqual(1);
  });

  // The page background (light or dark, by theme) shows through; no panel colour of its own.
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`follows the ${colorScheme} theme, with a soft shadow and no border on the pictures`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await revealAll(page);
      const m = await items(page)
        .first()
        .evaluate((el) => {
          const title = el.querySelector('h3')!;
          return {
            ownBackground: getComputedStyle(el).backgroundColor,
            titleColor: getComputedStyle(title).color,
            bodyColor: getComputedStyle(document.body).color,
            border: getComputedStyle(el.querySelector('.journey-frame')!).borderTopWidth,
            shadow: getComputedStyle(el.querySelector('.journey-frame')!).boxShadow,
          };
        });
      expect(m.ownBackground, 'no panel colour of its own').toBe('rgba(0, 0, 0, 0)');
      expect(m.titleColor, 'text uses the theme text colour').toBe(m.bodyColor);
      expect(m.border, 'no border').toBe('0px');
      expect(m.shadow, 'a drop shadow instead').not.toBe('none');
    });
  }

  test('each picture is a rounded 4:3 frame; desktop rows read text, dot, year, picture (mirrored on the right)', async ({
    page,
  }) => {
    await revealAll(page);
    await settle(page); // rises and pops have finished, so positions are final
    const narrow = page.viewportSize()!.width < 640;
    const withPictures = journey.flatMap((item, index) => (item.image ? [index] : []));
    expect(withPictures.length, 'every entry has a picture').toBe(journey.length);

    for (const index of withPictures) {
      const m = await items(page)
        .nth(index)
        .evaluate((el) => {
          const figure = el.querySelector('.journey-figure')!;
          const frame = el.querySelector('.journey-frame')!;
          const img = el.querySelector('.journey-img') as HTMLImageElement;
          const rect = (e: Element) => e.getBoundingClientRect();
          const centre = (e: Element) => rect(e).x + rect(e).width / 2;
          return {
            ratio: rect(frame).width / rect(frame).height,
            radius: parseFloat(getComputedStyle(frame).borderTopLeftRadius),
            overflow: getComputedStyle(frame).overflow,
            figure: centre(figure),
            body: centre(el.querySelector('.journey-body')!),
            dot: centre(el.querySelector('.journey-dot')!),
            bodyLeft: rect(el.querySelector('.journey-body')!).left,
            bodyRight: rect(el.querySelector('.journey-body')!).right,
            // The text itself (the body has padding towards the dot).
            textLeft: rect(el.querySelector('.journey-title')!).left,
            textRight: rect(el.querySelector('.journey-points')!).right,
            dotLeft: rect(el.querySelector('.journey-dot')!).left,
            dotRight: rect(el.querySelector('.journey-dot')!).right,
            dotMiddle:
              rect(el.querySelector('.journey-dot')!).top +
              rect(el.querySelector('.journey-dot')!).height / 2,
            year: centre(el.querySelector('.journey-year')!),
            yearLeft: rect(el.querySelector('.journey-year')!).left,
            yearRight: rect(el.querySelector('.journey-year')!).right,
            yearMiddle:
              rect(el.querySelector('.journey-year')!).top +
              rect(el.querySelector('.journey-year')!).height / 2,
            figureLeftEdge: rect(figure).left,
            figureRightEdge: rect(figure).right,
            imgFits: rect(img).width <= rect(frame).width + 0.5,
            viewport: document.documentElement.clientWidth,
            figureRight: rect(figure).right,
            figureLeft: rect(figure).left,
          };
        });
      expect(Math.abs(m.ratio - 4 / 3), `entry ${index} is 4:3`).toBeLessThan(0.05);
      expect(m.radius, 'rounded corners').toBeGreaterThanOrEqual(12);
      expect(m.overflow, 'the picture is clipped to the rounded frame').toBe('hidden');
      expect(m.imgFits).toBe(true);
      expect(m.figureLeft).toBeGreaterThanOrEqual(0);
      expect(m.figureRight).toBeLessThanOrEqual(m.viewport);
      if (!narrow) {
        const textOnLeft = m.body < m.dot;
        if (textOnLeft) {
          // <text> <dot> <year> <image>, with space between each
          expect(m.dotLeft - m.textRight, 'space between text and dot').toBeGreaterThanOrEqual(24);
          expect(m.yearLeft - m.dotRight, 'space between dot and year').toBeGreaterThanOrEqual(24);
          expect(
            Math.abs(m.figureLeftEdge - m.yearRight - (m.yearLeft - m.dotRight)),
            'year to picture is as far as dot to year',
          ).toBeLessThanOrEqual(3);
        } else {
          // <image> <year> <dot> <text>
          expect(m.textLeft - m.dotRight, 'space between dot and text').toBeGreaterThanOrEqual(24);
          expect(m.dotLeft - m.yearRight, 'space between year and dot').toBeGreaterThanOrEqual(24);
          expect(
            Math.abs(m.yearLeft - m.figureRightEdge - (m.dotLeft - m.yearRight)),
            'year to picture is as far as dot to year',
          ).toBeLessThanOrEqual(3);
        }
        expect(Math.abs(m.yearMiddle - m.dotMiddle), 'year level with the dot').toBeLessThan(6);
      } else {
        expect(m.figure, 'beside the line on phones').toBeGreaterThan(m.dot);
        expect(m.yearLeft - m.dotRight, 'space between dot and year').toBeGreaterThanOrEqual(12);
        expect(Math.abs(m.yearMiddle - m.dotMiddle), 'year centred on the dot').toBeLessThan(2);
      }
    }
  });

  // Hover effects need a real pointer, so phones (touch) skip them.
  test.describe('hover', () => {
    test.beforeEach(async ({ page }) => {
      const canHover = await page.evaluate(() => matchMedia('(hover: hover)').matches);
      test.skip(!canHover, 'no hover on touch devices');
      await revealAll(page);
    });

    const frame = (page: Page) => page.locator('.journey-frame').nth(1);
    const scale = (page: Page) =>
      frame(page).evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
    const glintX = (page: Page) =>
      frame(page).evaluate((el) => new DOMMatrix(getComputedStyle(el, '::after').transform).m41);

    test('a picture grows a little on hover and shrinks back', async ({ page }) => {
      await frame(page).scrollIntoViewIfNeeded();
      expect(await scale(page)).toBe(1);
      await frame(page).hover();
      await expect.poll(() => scale(page)).toBeGreaterThan(1.03);
      expect(await scale(page), 'a little, not a lot').toBeLessThan(1.12);
      await page.mouse.move(2, 2);
      await expect.poll(() => scale(page)).toBe(1);
    });

    test('a picture gleams on hover: a band of light sweeps across it', async ({ page }) => {
      await frame(page).scrollIntoViewIfNeeded();
      const before = await glintX(page);
      expect(before, 'waits off to the left').toBeLessThan(0);
      await frame(page).hover();
      await expect.poll(() => glintX(page), { timeout: 3000 }).toBeGreaterThan(0);
    });

    test('an entry title gleams on hover, and reads the same colour otherwise', async ({
      page,
    }) => {
      const title = items(page).nth(1).locator('h3');
      await title.scrollIntoViewIfNeeded();
      const idle = await title.evaluate((el) => getComputedStyle(el).backgroundClip);
      expect(idle).not.toContain('text');
      await title.hover();
      const hovered = await title.evaluate((el) => {
        const style = getComputedStyle(el);
        return { clip: style.backgroundClip, animation: style.animationName };
      });
      expect(hovered.clip).toContain('text');
      expect(hovered.animation).toBe('heading-glint');
    });
  });

  // Hold and drag a picture: it stretches like a rubber band up to a limit, and springs back.
  test.describe('rubber-band stretch', () => {
    // Every piece of Journey text a stretched picture must not cover, anywhere in the section.
    // (The years and the dots are allowed to be passed over, so they are not in this list.)
    const textRects = (page: Page, selectors = 'h2, h3, .journey-org, .journey-points li') =>
      page.locator('#journey').evaluate((section, selectors) => {
        return [...section.querySelectorAll(selectors)].map((el) => {
          const { left, top, right, bottom } = el.getBoundingClientRect();
          return { text: el.textContent!.trim().slice(0, 30), left, top, right, bottom };
        });
      }, selectors);

    const frameRect = (page: Page, index: number) =>
      page
        .locator('.journey-frame')
        .nth(index)
        .evaluate((el) => {
          const { left, top, right, bottom, width, height } = el.getBoundingClientRect();
          return { left, top, right, bottom, width, height };
        });

    const centreOf = async (page: Page, index: number) => {
      const frame = page.locator('.journey-frame').nth(index);
      await frame.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await settle(page);
      const box = (await frame.boundingBox())!;
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    };

    // The eight compass directions, dragged far further than the limit.
    const directions = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ];
    const PULL = 400;

    // How the pointer is driven: a mouse everywhere, and a finger (touch events) on Chromium.
    type Driver = {
      down: (x: number, y: number) => Promise<void>;
      move: (x: number, y: number) => Promise<void>;
      up: () => Promise<void>;
    };
    const mouse = (page: Page): Driver => ({
      down: async (x, y) => {
        await page.mouse.move(x, y);
        await page.mouse.down();
      },
      move: async (x, y) => {
        await page.mouse.move(x, y, { steps: 6 });
      },
      up: async () => {
        await page.mouse.up();
      },
    });
    const finger = async (page: Page): Promise<Driver> => {
      const cdp = await page.context().newCDPSession(page);
      const send = (type: TouchType, points: { x: number; y: number }[]) =>
        cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
      let last = { x: 0, y: 0 };
      return {
        down: async (x, y) => {
          last = { x, y };
          await send('touchStart', [last]);
          await page.waitForTimeout(500); // a hold: longer than the 350ms the page waits for
        },
        move: async (x, y) => {
          for (let i = 1; i <= 6; i++) {
            last = { x: last.x + (x - last.x) / (7 - i), y: last.y + (y - last.y) / (7 - i) };
            await send('touchMove', [last]);
          }
        },
        up: async () => {
          await send('touchEnd', []);
        },
      };
    };

    const PADDING = 4; // phones: the room the picture keeps from the screen edge

    const checkStretch = async (page: Page, driver: Driver, pointerIsMouse: boolean) => {
      await revealAll(page);
      await settle(page);
      const viewport = page.viewportSize()!;
      const phone = viewport.width < 640;
      let crossedAYear = false;

      for (const index of [1, 2]) {
        const start = await centreOf(page, index);
        if (pointerIsMouse) await page.mouse.move(2, 2); // not hovering, so the rest size is true
        await settle(page);
        const rest = await frameRect(page, index);
        let furthest = 0;

        for (const [dx, dy] of directions) {
          await driver.down(start.x, start.y);
          await driver.move(start.x + dx * PULL, start.y + dy * PULL);
          const held = await frameRect(page, index);
          const texts = await textRects(page);
          const years = await textRects(page, '.journey-year');
          await driver.up();
          await expect
            .poll(async () => Math.abs((await frameRect(page, index)).left - rest.left), {
              timeout: 3000,
              message: 'springs back to its place',
            })
            .toBeLessThan(0.6);
          if (pointerIsMouse) await page.mouse.move(2, 2);

          furthest = Math.max(
            furthest,
            held.left - rest.left,
            rest.left - held.left,
            held.top - rest.top,
            rest.top - held.top,
            held.right - rest.right,
            rest.right - held.right,
            held.bottom - rest.bottom,
            rest.bottom - held.bottom,
          );

          // It only grows a bit, and keeps its shape (width and height grow together).
          const growth = held.width / rest.width;
          expect(growth, `picture ${index}: only a bit bigger`).toBeLessThan(1.12);
          expect(
            Math.abs(held.width / held.height - rest.width / rest.height),
            'same aspect ratio',
          ).toBeLessThan(0.02);

          const overlaps = (box: typeof held, other: (typeof texts)[number]) =>
            Math.min(box.right, other.right) - Math.max(box.left, other.left) > 0 &&
            Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top) > 0;

          if (phone) {
            // However far it is pulled, it keeps 4px from the screen edge (unless it started closer).
            const tolerance = 0.6;
            expect(
              held.left,
              `picture ${index}, drag (${dx},${dy}): left edge`,
            ).toBeGreaterThanOrEqual(Math.min(PADDING, rest.left) - tolerance);
            expect(
              held.right,
              `picture ${index}, drag (${dx},${dy}): right edge`,
            ).toBeLessThanOrEqual(Math.max(viewport.width - PADDING, rest.right) + tolerance);
            expect(
              held.top,
              `picture ${index}, drag (${dx},${dy}): top edge`,
            ).toBeGreaterThanOrEqual(Math.min(PADDING, rest.top) - tolerance);
            expect(
              held.bottom,
              `picture ${index}, drag (${dx},${dy}): bottom edge`,
            ).toBeLessThanOrEqual(Math.max(viewport.height - PADDING, rest.bottom) + tolerance);
          } else {
            // It never covers any Journey text, but may pass over a year.
            for (const text of texts) {
              expect(
                overlaps(held, text),
                `picture ${index}, drag (${dx},${dy}) covers "${text.text}"`,
              ).toBe(false);
            }
            if (years.some((year) => overlaps(held, year))) crossedAYear = true;
          }
        }

        expect(furthest, `picture ${index} visibly stretches`).toBeGreaterThan(8);
      }
      if (!phone) expect(crossedAYear, 'a year may be passed over').toBe(true);
    };

    test.beforeEach(async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto('/');
    });

    test('with a mouse: stretches, stays within bounds (phone: screen, desktop: text), springs back', async ({
      page,
    }) => {
      await checkStretch(page, mouse(page), true);
    });

    test('with a finger: the same on touch screens', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'touch events are driven through Chromium');
      await checkStretch(page, await finger(page), false);
    });

    test('with a finger: swiping straight away scrolls the page instead of stretching', async ({
      page,
      browserName,
    }) => {
      test.skip(browserName !== 'chromium', 'touch events are driven through Chromium');
      const start = await centreOf(page, 1);
      const cdp = await page.context().newCDPSession(page);
      const send = (type: TouchType, y: number) =>
        cdp.send('Input.dispatchTouchEvent', {
          type,
          touchPoints: type === 'touchEnd' ? [] : [{ x: start.x, y }],
        });
      await send('touchStart', start.y);
      for (let i = 1; i <= 8; i++) await send('touchMove', start.y - i * 20); // a quick swipe
      const state = await page
        .locator('.journey-frame')
        .nth(1)
        .evaluate((el) => ({
          held: el.classList.contains('is-held'),
          pulled: el.style.getPropertyValue('--drag-y'),
        }));
      await send('touchEnd', start.y);
      expect(state.held, 'not treated as a hold').toBe(false);
      expect(state.pulled, 'not stretched').toBe('');
    });

    test('with a finger: a hold makes the picture gleam, and no image menu opens', async ({
      page,
      browserName,
    }) => {
      test.skip(browserName !== 'chromium', 'touch events are driven through Chromium');
      const start = await centreOf(page, 1);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
      const frame = page.locator('.journey-frame').nth(1);
      await expect(frame, 'held after a moment').toHaveClass(/is-held/, { timeout: 2000 });
      // Gleaming: the band of light sweeps across.
      await expect
        .poll(
          () =>
            frame.evaluate((el) => new DOMMatrix(getComputedStyle(el, '::after').transform).m41),
          { timeout: 3000 },
        )
        .toBeGreaterThan(0);
      // The long-press menu comes from this event; it is cancelled, and the picture itself takes no
      // touches (so the browser has no image to offer a menu for).
      const menuPrevented = await frame.evaluate((el) => {
        const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
        el.dispatchEvent(event);
        return event.defaultPrevented;
      });
      expect(menuPrevented).toBe(true);
      expect(
        await page
          .locator('.journey-img')
          .nth(1)
          .evaluate((el) => getComputedStyle(el).pointerEvents),
      ).toBe('none');
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect(frame).not.toHaveClass(/is-held/);
    });

    // What is on top at a screen point: its element, found the way a click would find it.
    const topAt = (page: Page, x: number, y: number) =>
      page.evaluate(
        ([px, py]) => {
          const el = document.elementFromPoint(px, py);
          return {
            frame: !!el?.closest('.journey-frame'),
            nav: !!el?.closest('nav'),
            tag: el?.tagName,
          };
        },
        [x, y],
      );

    test('a pulled picture stays on top of the entries around it', async ({ page }) => {
      const start = await centreOf(page, 1);
      await page.mouse.move(2, 2);
      await settle(page);
      const rest = await frameRect(page, 1);
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(start.x, start.y + 400, { steps: 6 });
      const held = await frameRect(page, 1);
      expect(held.bottom, 'it was pulled down past its place').toBeGreaterThan(rest.bottom + 3);
      // A point in the part that now overlaps the entry below: the picture is what is there.
      const point = await topAt(page, (held.left + held.right) / 2, held.bottom - 2);
      expect(point.frame, `on top (found ${point.tag})`).toBe(true);
      await page.mouse.up();
    });

    test('but the navigation bar stays above the pictures', async ({ page }) => {
      const frame = page.locator('.journey-frame').nth(1);
      await frame.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      // Slide the picture up so that it passes under the bar.
      const nav = (await page.locator('header nav').boundingBox())!;
      const box = (await frame.boundingBox())!;
      await page.evaluate(
        (shift) => window.scrollBy({ top: shift, behavior: 'instant' }),
        box.y + box.height / 2 - (nav.y + nav.height / 2),
      );
      await settle(page);
      const f = (await frame.boundingBox())!;
      const left = Math.max(nav.x, f.x);
      const right = Math.min(nav.x + nav.width, f.x + f.width);
      expect(right - left, 'the picture and the bar overlap').toBeGreaterThan(20);
      const point = await topAt(page, (left + right) / 2, nav.y + nav.height / 2);
      expect(point.nav, `the bar is on top (found ${point.tag})`).toBe(true);
      expect(point.frame).toBe(false);
    });

    test('the pull is exponential: soft at first, then stiffer, never passing the limit', async ({
      page,
    }) => {
      test.skip(page.viewportSize()!.width < 640, 'on phones the screen edge ends the pull early');
      const start = await centreOf(page, 1);
      await page.mouse.move(2, 2);
      await settle(page);
      const pull = () =>
        page
          .locator('.journey-frame')
          .nth(1)
          .evaluate((el) => parseFloat(el.style.getPropertyValue('--drag-x')) || 0);
      const shifts: number[] = [];
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      for (const distance of [0, 60, 120, 180, 240, 300, 360, 420]) {
        await page.mouse.move(start.x + distance, start.y, { steps: 4 });
        shifts.push(await pull());
      }
      await page.mouse.up();

      // Equal extra drags move it less and less (diminishing returns), and it never passes the limit.
      const steps = shifts.slice(1).map((value, i) => value - shifts[i]);
      for (const [i, value] of steps.entries()) {
        expect(value, 'still moving').toBeGreaterThanOrEqual(-0.01);
        if (i > 0) expect(value, 'but stiffer each time').toBeLessThan(steps[i - 1] + 0.01);
      }
      expect(Math.max(...shifts), 'never past the limit').toBeLessThanOrEqual(120.01);
    });

    test('it is held in place while the pointer is held, then goes back on release', async ({
      page,
    }) => {
      const start = await centreOf(page, 1);
      await page.mouse.move(2, 2);
      await settle(page);
      const rest = await frameRect(page, 1);
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      const way = page.viewportSize()!.width < 640 ? -1 : 1; // phones: away from the screen edge
      await page.mouse.move(start.x + way * 200, start.y + 50, { steps: 5 });
      await page.waitForTimeout(600);
      const held = await frameRect(page, 1);
      const reach = Math.max(rest.left - held.left, held.right - rest.right);
      expect(reach, 'stays stretched while held').toBeGreaterThan(5);
      await page.mouse.up();
      await expect
        .poll(async () => Math.abs((await frameRect(page, 1)).left - rest.left), { timeout: 3000 })
        .toBeLessThan(0.6);
    });
  });

  test.describe('reduced motion hover', () => {
    test.use({ reducedMotion: 'reduce' });

    test('pictures do not stretch when dragged', async ({ page }) => {
      await page.goto('/');
      const frame = page.locator('.journey-frame').nth(1);
      await frame.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
      const box = (await frame.boundingBox())!;
      const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 200, y + 100, { steps: 5 });
      expect(await frame.evaluate((el) => getComputedStyle(el).transform)).toBe(
        'matrix(1, 0, 0, 1, 0, 0)',
      );
      await page.mouse.up();
    });

    test('pictures do not grow and titles do not gleam', async ({ page }) => {
      await page.goto('/');
      const canHover = await page.evaluate(() => matchMedia('(hover: hover)').matches);
      test.skip(!canHover, 'no hover on touch devices');
      const frame = page.locator('.journey-frame').nth(1);
      await frame.scrollIntoViewIfNeeded();
      await frame.hover();
      await page.waitForTimeout(500);
      expect(await frame.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a)).toBe(1);
      const title = items(page).nth(1).locator('h3');
      await title.hover();
      expect(await title.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    });
  });

  test('every organization link can be reached with the Tab key', async ({ page }) => {
    const tabIndexes = await page
      .locator('[data-journey-item] a')
      .evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).tabIndex));
    expect(tabIndexes.length).toBeGreaterThan(0);
    for (const tabIndex of tabIndexes) expect(tabIndex).toBe(0);
  });

  // Attributes alone do not prove a link works; click it.
  test("clicking a milestone's organization link opens its site in a new tab", async ({
    page,
    context,
  }) => {
    for (const index of [0, 3]) {
      const orgUrl = journey[index].orgUrl;
      expect(orgUrl, `milestone ${index} needs an orgUrl for this test`).toBeTruthy();
      await context.route(`${new URL(orgUrl!).origin}/**`, (route) =>
        route.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>' }),
      );

      const [newTab] = await Promise.all([
        context.waitForEvent('page'),
        items(page).nth(index).locator('.journey-org a').click({ timeout: 5000 }),
      ]);
      expect(newTab.url()).toBe(orgUrl);
      expect(new URL(page.url()).origin).not.toBe(new URL(orgUrl!).origin); // portfolio tab unchanged
      await newTab.close();
    }
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('every entry is simply there: no fade-in, no movement', async ({ page }) => {
      const states = await page.locator('.journey-body').evaluateAll((all) =>
        all.map((el) => {
          const style = getComputedStyle(el);
          return { opacity: style.opacity, transform: style.transform };
        }),
      );
      expect(states).toHaveLength(journey.length);
      for (const state of states) expect(state).toEqual({ opacity: '1', transform: 'none' });

      // The line is simply there, already drawn.
      const scale = await page
        .locator('.journey-line-fill')
        .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).d);
      expect(scale).toBe(1);
    });
  });
});

test.describe('journey without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every milestone is visible, stacked from top to bottom', async ({ page }) => {
    await page.goto('/');
    const tops: number[] = [];
    for (let i = 0; i < journey.length; i++) {
      const entry = page.locator('[data-journey-item]').nth(i);
      await expect(entry).toBeVisible();
      expect(
        await entry.locator('.journey-body').evaluate((el) => getComputedStyle(el).opacity),
      ).toBe('1');
      tops.push((await entry.boundingBox())!.y);
    }
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    expect(new Set(tops).size).toBe(tops.length);
  });
});
