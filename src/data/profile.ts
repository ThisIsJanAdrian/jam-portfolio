/**
 * Structured profile data for the hero terminal and Skills section: experience, education, credentials, awards, skills.
 * Short identity strings (name, role, links) live in `site.ts`.
 *
 * Dates are `YYYY-MM` strings. Use `end: null` for "present".
 */

export interface Experience {
  role: string;
  company: string;
  start: string;
  end: string | null;
  /** Optional bullet points. Add real, shareable accomplishments here. */
  highlights?: string[];
}

export interface Education {
  school: string;
  degree: string;
  location: string;
  start: string;
  end: string;
}

export interface Credential {
  name: string;
  issuer: string;
  issued: string;
  /** Optional link to verify the credential; shows a "Verify" link on its card when set. */
  url?: string;
}

export type Discipline = 'qa' | 'swe' | 'ai';

export interface Skill {
  name: string;
  /** The disciplines this skill counts towards; the Skills section filters by them. */
  disciplines: Discipline[];
}

export const experience: Experience[] = [
  {
    role: 'Quality Assurance Analyst',
    company: 'Vértere Global Solutions, Inc.',
    start: '2026-06',
    end: null,
    // TODO: add highlights, e.g. testing types, tools and measurable results.
  },
];

export const education: Education[] = [
  {
    school: 'Mapúa University',
    degree: 'Bachelor of Science in Computer Engineering',
    location: 'Manila, Philippines',
    start: '2022-08',
    end: '2026-06',
  },
  {
    school: 'Chung Yuan Christian University',
    degree: 'Practice of International Project Design',
    location: 'Taoyuan, Taiwan',
    start: '2025-07',
    end: '2025-08',
  },
];

export const credentials: Credential[] = [
  {
    name: 'Quality Assurance Test Analyst',
    issuer: 'Skillsoft',
    issued: '2026-10',
    url: 'https://skillsoft.digitalbadges-eu.skillsoft.com/ddb06b43-aabc-4c4e-92fa-5a954937c1ed#acc.noigFa9t',
  },
  {
    name: 'Retrieval Augmented Generation (RAG)',
    issuer: 'DeepLearning.AI',
    issued: '2026-03',
    url: 'https://coursera.org/share/283f6f30f4838a3e78f0247c8b60a5d6',
  },
  {
    name: 'Introduction to AI',
    issuer: 'Google',
    issued: '2025-11',
    url: 'https://coursera.org/share/ec670a93e6aec69c3e32d21391370ac4',
  },
];

export const awards: string[] = [
  '2026 Mapúa Cardinal Excellence Awardee',
  'Gold Award, CYCU × Intel × ASUS OpenVINO AI Application Project Competition',
  'Silver Award, CYCU Project Design Presentation',
  'DOST-SEI Merit Scholarship',
  'Remitly Scholars Program',
];

export const leadership: string[] = [
  'Executive Officer, Google Developers Student Club: managed technical events for 200+ members and produced analytical reports to identify process gaps',
  'Committee Member, EECE School Student Council: coordinated logistics for programs serving the School of EECE student body',
];

/** Short bio shown in the hero terminal. Skills, awards and leadership have their own sections. */
export const bio = {
  intro:
    'A thinker and a tinkerer, an analyst and an engineer. I build and test web and mobile apps with AI and prayers.',
  closing:
    'Currently focusing on software quality. Keen on turning ideas into solutions that make life a little lighter.',
};

/** The filters of the Skills section, in display order. */
export const disciplines: { id: Discipline; label: string }[] = [
  { id: 'qa', label: 'QA' },
  { id: 'swe', label: 'SWE' },
  { id: 'ai', label: 'AI' },
];

/** One pool, grouped by kind (languages, testing, web, AI, tooling, office) in the order listed. */
export const skills: Skill[] = [
  { name: 'TypeScript', disciplines: ['qa', 'swe'] },
  { name: 'JavaScript', disciplines: ['qa', 'swe'] },
  { name: 'Python', disciplines: ['ai', 'swe'] },
  { name: 'Java', disciplines: ['qa', 'swe'] },
  { name: 'PHP', disciplines: ['swe'] },
  { name: 'HTML/CSS', disciplines: ['swe'] },
  { name: 'SQL', disciplines: ['qa', 'swe'] },
  { name: 'React', disciplines: ['swe'] },
  { name: 'Astro', disciplines: ['swe'] },
  { name: 'Tailwind CSS', disciplines: ['swe'] },
  { name: 'Laravel', disciplines: ['swe'] },
  { name: 'Playwright', disciplines: ['qa'] },
  { name: 'Selenium WebDriver', disciplines: ['qa'] },
  { name: 'WebDriverIO', disciplines: ['qa'] },
  { name: 'Mocha', disciplines: ['qa'] },
  { name: 'Appium', disciplines: ['qa'] },
  { name: 'Postman', disciplines: ['qa', 'swe'] },
  { name: 'Apache JMeter', disciplines: ['qa'] },
  { name: 'Lighthouse CI', disciplines: ['qa', 'swe'] },
  { name: 'Claude Code', disciplines: ['qa', 'ai'] },
  { name: 'ChromaDB', disciplines: ['ai'] },
  { name: 'Transformers', disciplines: ['ai'] },
  { name: 'Hugging Face', disciplines: ['ai'] },
  { name: 'LangChain', disciplines: ['ai'] },
  { name: 'Ollama', disciplines: ['ai'] },
  { name: 'Supabase', disciplines: ['swe'] },
  { name: 'Vercel', disciplines: ['swe'] },
  { name: 'VS Code', disciplines: ['qa', 'swe', 'ai'] },
  { name: 'Git', disciplines: ['qa', 'swe', 'ai'] },
  { name: 'GitHub', disciplines: ['qa', 'swe', 'ai'] },
  { name: 'GitLab', disciplines: ['qa', 'swe', 'ai'] },
  { name: 'Maven', disciplines: ['qa', 'swe'] },
  { name: 'Eclipse', disciplines: ['qa', 'swe'] },
  { name: 'Microsoft Word', disciplines: ['qa'] },
  { name: 'Microsoft Excel', disciplines: ['qa'] },
];

/** "2026-06" -> "June 2026". Throws on malformed input so bad data fails the build and tests. */
export function formatMonth(value: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    throw new Error(`Invalid month "${value}", expected YYYY-MM`);
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}-01T00:00:00Z`));
}

/**
 * Formats a date or a period:
 *   formatPeriod('2026-01')             -> "January 2026"            (a single date)
 *   formatPeriod('2026-06', null)       -> "June 2026 – Present"     (still ongoing)
 *   formatPeriod('2025-07', '2025-08')  -> "July 2025 – August 2025" (a range)
 */
export function formatPeriod(start: string, end?: string | null): string {
  if (end === undefined) return formatMonth(start);
  return `${formatMonth(start)} – ${end === null ? 'Present' : formatMonth(end)}`;
}
