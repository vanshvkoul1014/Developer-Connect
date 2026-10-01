import test from 'node:test';
import assert from 'node:assert/strict';
import { registerSchema, profileSchema, timelineSchema, textSchema } from '../src/validation.js';

test('registration rejects short passwords and unexpected privilege fields', () => {
  assert.equal(registerSchema.safeParse({ name: 'Ada', email: 'ada@example.com', password: 'short' }).success, false);
  assert.equal(registerSchema.safeParse({ name: 'Ada', email: 'ada@example.com', password: 'long-password', admin: true }).success, false);
});
test('profile validates handles and social link URLs', () => {
  const profile = { handle: 'ada-dev', headline: 'Engineer', location: '', bio: '', skills: ['React'], githubUsername: '', links: { website: 'https://example.com', github: '', linkedin: '', x: '' } };
  assert.equal(profileSchema.safeParse(profile).success, true);
  assert.equal(profileSchema.safeParse({ ...profile, handle: 'Bad Handle!' }).success, false);
  assert.equal(profileSchema.safeParse({ ...profile, links: { ...profile.links, website: 'javascript:alert(1)' } }).success, false);
});
test('history rejects an end date before the start date unless current', () => {
  const entry = { title: 'Engineer', organization: 'Example', from: '2025-01-01', to: '2024-01-01', current: false };
  assert.equal(timelineSchema.safeParse(entry).success, false);
  assert.equal(timelineSchema.safeParse({ ...entry, current: true }).success, true);
});
test('posts require nonempty text within the length limit', () => {
  assert.equal(textSchema.safeParse({ text: '   ' }).success, false);
  assert.equal(textSchema.safeParse({ text: 'Hello builders' }).success, true);
  assert.equal(textSchema.safeParse({ text: 'x'.repeat(2001) }).success, false);
});
