import type { ImageMetadata } from 'astro';
import { education, experience, formatPeriod } from './profile';

/**
 * The scrolling "journey" shown in the Journey section, newest first. Each item becomes one
 * step: while the visitor scrolls, the panel stays pinned, the text stays in place, and the
 * background pictures shift from one step to the next.
 *
 * Vertère and Mapúa are read from profile.ts so they stay in sync. Everything marked
 * `placeholder: true` is filler to replace with real milestones.
 *
 * To add a background picture, put the file in src/assets/journey/ and import it:
 *   import mapua from '../assets/journey/mapua.jpg';
 * then set `image: mapua`. Items without an image get a coloured placeholder background.
 */
export interface JourneyItem {
  title: string;
  org: string;
  /** Free text, e.g. "June 2026 – Present". */
  period: string;
  /** One or two short sentences. */
  description: string;
  image?: ImageMetadata;
  /** Marks filler content that still has to be replaced. */
  placeholder?: boolean;
}

const job = experience[0];
const school = education[0];

const placeholder = (n: number): JourneyItem => ({
  title: `Milestone ${n} (placeholder)`,
  org: 'Organization or project',
  period: 'Month Year – Month Year',
  description: 'Replace this placeholder with a short description of the milestone.',
  placeholder: true,
});

export const journey: JourneyItem[] = [
  {
    title: job.role,
    org: job.company,
    period: formatPeriod(job.start, job.end),
    // TODO: replace with your own words.
    description: 'Software quality assurance, with a focus on AI-driven systems.',
  },
  {
    title: school.degree,
    org: school.school,
    period: formatPeriod(school.start, school.end),
    description: 'Cardinal Excellence Awardee and DOST-SEI Merit Scholar.',
  },
  placeholder(3),
  placeholder(4),
  placeholder(5),
];
