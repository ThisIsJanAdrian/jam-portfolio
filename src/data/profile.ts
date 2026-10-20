/**
 * Structured profile data for the hero terminal and Background section: experience, education, credentials, awards, skills.
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
}

export interface SkillGroup {
  label: string;
  items: string[];
}

export const experience: Experience[] = [
  {
    role: 'Quality Assurance Analyst',
    company: 'Vertére Global Solutions, Inc.',
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
  },
  {
    name: 'Retrieval Augmented Generation (RAG)',
    issuer: 'DeepLearning.AI',
    issued: '2026-03',
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
    'I am a computer engineer focusing on software quality and artificial intelligence. My technical foundation is built on Natural Language Processing (NLP) systems, Retrieval-Augmented Generation (RAG) pipelines, software testing architectures, and a whole lot of prayers.',
  closing: 'Always open to connecting with builders who want to make a change!',
};

export const skills: SkillGroup[] = [
  {
    label: 'Languages & frameworks',
    items: ['Python', 'PHP (Laravel/Blade)', 'JavaScript (React)', 'HTML', 'CSS', 'Embedded C/C++'],
  },
  {
    label: 'Tools & technologies',
    items: ['Git/GitHub', 'REST APIs', 'MySQL', 'SQLite', 'Supabase', 'Vercel', 'HuggingFace'],
  },
  {
    label: 'Core concepts',
    items: ['CRUD', 'API integration', 'OOP', 'Data structures & algorithms'],
  },
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

export function formatPeriod(start: string, end: string | null): string {
  return `${formatMonth(start)} – ${end ? formatMonth(end) : 'Present'}`;
}
