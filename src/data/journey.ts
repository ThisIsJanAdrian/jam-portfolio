import type { ImageMetadata } from 'astro';
import { education, experience, formatPeriod } from './profile';

/**
 * The scrolling "journey" shown in the Journey section, newest first. Each item becomes one
 * step: while the visitor scrolls, the panel stays pinned, the text stays in place, and the
 * background pictures shift from one step to the next.
 *
 * Vertère and Mapúa are read from profile.ts so they stay in sync. Mark any filler you still have
 * to replace with `placeholder: true`.
 *
 * To add a background picture, put the file in src/assets/journey/ and import it:
 *   import mapua from '../assets/journey/mapua.jpg';
 * then set `image: mapua`. Items without an image get a coloured placeholder background.
 *
 * Dates: formatPeriod('2026-01') is a single date, formatPeriod('2025-07', '2025-08') a range, and
 * formatPeriod('2026-06', null) an ongoing one ("June 2026 – Present").
 */
export interface JourneyItem {
  title: string;
  /** The organization only. The city goes in `location`. */
  org: string;
  /** Optional city and country, shown next to the date. Leave out for remote or unknown. */
  location?: string;
  /** Optional website of the organization. Makes `org` a link that opens in a new tab. */
  orgUrl?: string;
  /** Free text, e.g. "June 2026 – Present". Use formatPeriod() so it is formatted consistently. */
  period: string;
  /** One or two short sentences. */
  description: string;
  image?: ImageMetadata;
  /** Marks filler content that still has to be replaced. */
  placeholder?: boolean;
}

const job = experience[0];
const school = education[0];

// Defined once so the same place is always spelled the same way.
const MAPUA = 'Mapúa University';
const MANILA = 'Manila, Philippines';
const MAPUA_URL = 'https://www.mapua.edu.ph/';

export const journey: JourneyItem[] = [
  {
    title: job.role,
    org: job.company,
    orgUrl: 'https://vertere-gs.com/',
    period: formatPeriod(job.start, null),
    // TODO: replace with your own words, and add the office location if you want it shown.
    description: 'Software quality assurance, with a focus on AI-driven systems.',
  },
  {
    title: 'Graduation',
    org: school.school,
    orgUrl: MAPUA_URL,
    location: school.location,
    period: formatPeriod(school.end),
    description: `Earned a ${school.degree}. Cardinal Excellence Awardee and DOST-SEI Merit Scholar.`,
  },
  {
    title: '2026 Mapúa Cardinal Excellence Awards',
    org: MAPUA,
    orgUrl: MAPUA_URL,
    location: MANILA,
    period: formatPeriod('2026-01'),
    description: 'Recognized as an awardee for representing the university internationally.',
  },
  {
    title: 'Practice of International Project Design',
    org: 'Chung Yuan Christian University',
    orgUrl: 'https://eng.cycu.edu.tw/',
    location: 'Taoyuan, Taiwan',
    period: formatPeriod('2025-07', '2025-08'),
    description:
      'Developed software and hardware projects with international teams under the mentorship of high-caliber professors and graduate students. Led the technical side of an AI basketball referee that won the Gold and Most Creative awards.',
  },
  {
    title: 'Google Developers Student Club',
    org: MAPUA,
    orgUrl: MAPUA_URL,
    location: 'Makati, Philippines',
    // TODO: add the dates, e.g. formatPeriod('2023-08', '2024-05').
    period: formatPeriod('2023-08', '2024-05'),
    description:
      'Pioneering executive officer: managed technical events for 200+ members and produced analytical reports to identify process gaps and improvements.',
  },
  {
    title: 'EECE Student Council',
    org: MAPUA,
    orgUrl: MAPUA_URL,
    location: MANILA,
    // TODO: add the dates.
    period: '<period>',
    description:
      'Committee member who coordinated with the logistics team to deliver programs on time for the School of EECE student body.',
  },
  {
    title: 'Where Dreams Began',
    org: MAPUA,
    orgUrl: MAPUA_URL,
    location: MANILA,
    period: formatPeriod('2022-08'),
    description: `Began the ${school.degree}.`,
  },
];
