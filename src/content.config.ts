import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Every case study must satisfy this schema, or the build fails.
 * That is a built-in quality gate: a malformed case study can never be published.
 */
const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string().min(3),
    summary: z.string().min(20).max(200),
    role: z.string(),
    tools: z.array(z.string()).min(1),
    date: z.coerce.date(),
    repoUrl: z.url().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects };
