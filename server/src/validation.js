import { z } from 'zod';

const required = (max) => z.string().trim().min(1).max(max);
const optional = (max) => z.string().trim().max(max).optional().default('');
const optionalUrl = z.union([z.literal(''), z.string().url().max(300).refine(v => /^https?:\/\//i.test(v), 'Use an http or https URL')]).optional().default('');
export const registerSchema = z.object({ name: required(80), email: z.string().email().max(254), password: z.string().min(8).max(128) }).strict();
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) }).strict();
export const profileSchema = z.object({
  handle: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,30}$/),
  headline: required(120), location: optional(100), bio: optional(1500),
  skills: z.array(required(40)).max(30), githubUsername: optional(39),
  links: z.object({ website: optionalUrl, github: optionalUrl, linkedin: optionalUrl, x: optionalUrl }).strict()
}).strict();
export const timelineSchema = z.object({
  title: required(120), organization: required(120), location: optional(100),
  from: z.coerce.date(), to: z.coerce.date().nullable().optional(), current: z.boolean().default(false),
  description: optional(1500)
}).strict().refine(v => v.current || !v.to || v.to >= v.from, { message: 'End date must be after start date', path: ['to'] });
export const textSchema = z.object({ text: required(2000) }).strict();
