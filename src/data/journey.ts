import { education, experience } from './profile';

/**
 * The timeline shown in the Journey section, newest first. Each item becomes one full-width band
 * with a few short bullet points, and its picture (if any) in a rounded frame on the opposite side
 * of the line, next to the year.
 *
 * Vertère and Mapúa are read from profile.ts so they stay in sync.
 *
 * Pictures live in src/assets/journey/ and are 4:3 (other shapes are cropped to 4:3). To
 * swap one, replace the file keeping its name (vertere.jpg, graduation.jpg, cycu.jpg, gdsc.jpg,
 * mapua.jpg). A new item just needs `image: 'its-file-name.jpg'`. Leave `image` out for an entry
 * without a picture.
 */
export interface JourneyItem {
  title: string;
  /** The organization only. The city goes in `location`. */
  org: string;
  /** Optional city and country, shown next to the date. Leave out for remote or unknown. */
  location?: string;
  /** Optional website of the organization. Makes `org` a link that opens in a new tab. */
  orgUrl?: string;
  /** Free text, usually just the year, e.g. "2025" or "2026 – Present". */
  period: string;
  /** Two or three short bullet points: keep each to a line or two. */
  points: string[];
  /** File name inside src/assets/journey/, e.g. 'mapua.jpg'. */
  image?: string;
  /** Describes the picture for screen readers. Leave out if it is only decoration. */
  imageAlt?: string;
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
    location: 'Makati, Philippines',
    period: '2026',
    image: 'vertere.jpg',
    points: [
      'Training in software quality assurance, with a focus on agentic AI-driven testing of web and mobile applications.',
    ],
  },
  {
    title: 'Graduation',
    org: school.school,
    orgUrl: MAPUA_URL,
    location: school.location,
    period: '2026',
    image: 'graduation.jpg',
    points: [
      `Completed ${school.degree} with Mapúa's Class of 2026.`,
      'Recognized with a Cardinal Excellence Award for representing the university internationally.',
    ],
  },
  {
    title: 'Practice of International Project Design',
    org: 'Chung Yuan Christian University',
    orgUrl: 'https://eng.cycu.edu.tw/',
    location: 'Taoyuan, Taiwan',
    period: '2025',
    image: 'cycu.jpg',
    points: [
      'Developed software and hardware projects with international teams, mentored by high-caliber professors and graduate students.',
      'Implemented and documented AI basketball referee that won 1st place and Most Creative award.',
      'Built a microcontroller solution for practical use in Taiwan crosswalks that won 2nd place.',
    ],
  },
  {
    title: 'Google Developers Student Club',
    org: MAPUA,
    orgUrl: MAPUA_URL,
    location: MANILA,
    period: '2023',
    image: 'gdsc.jpg',
    points: [
      'Pioneering executive officer, helped the organization gain traction and supported technical events for 200+ members ',
    ],
  },
  {
    title: 'Where Dreams Began',
    org: MAPUA,
    orgUrl: MAPUA_URL,
    location: MANILA,
    period: '2022',
    image: 'mapua.jpg',
    points: [`Began studying for ${school.degree}, supported by government (DOST) scholarship.`],
  },
];
