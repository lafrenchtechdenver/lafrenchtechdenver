/**
 * Astro Content Collections — schemas and exports.
 *
 * Four collections power Milestone 3's data-driven UI:
 *
 *   - `board`    (content / Markdown) — one file per board member, frontmatter
 *                describes name, role, render order, portrait, LinkedIn URL,
 *                and whether to apply the legacy grayscale treatment.
 *   - `partners` (content / Markdown) — one file per partner. `featuredOn`
 *                drives whether the partner appears on `/` ("home"), on
 *                `/companies-sponsors.html` ("sponsors"), or both.
 *   - `kpis`     (data / JSON)        — single JSON file `kpis.json` exposing
 *                the four headline numbers shown on the home page.
 *   - `site`     (data / JSON)        — single JSON file `site.json` holding
 *                global URLs (LinkedIn, Facebook, mailto, membership form,
 *                Luma calendar). Replaces the constants previously hard-coded
 *                across every page and component.
 *
 * Per Design Decision 3 (strict schemas) all string URLs are typed via
 * `z.string().url()` (and `email()` for the contact mail), `order` must be a
 * positive integer, and `featuredOn` is restricted to a fixed enum so a typo
 * in a Markdown frontmatter is caught by `astro check` in CI rather than
 * silently shipping.
 */
import { defineCollection, z } from 'astro:content';

const boardCollection = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      name: z.string().min(1),
      role: z.string().min(1),
      order: z.number().int().positive(),
      photo: image(),
      grayscale: z.boolean().default(true),
      linkedinUrl: z.string().url(),
    }),
});

const partnersCollection = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      name: z.string().min(1),
      tagline: z.string().min(1),
      url: z.string().url(),
      logo: image(),
      featuredOn: z.array(z.enum(['home', 'sponsors'])).min(1),
    }),
});

const kpisCollection = defineCollection({
  type: 'data',
  schema: z.object({
    value: z.string().min(1),
    label: z.string().min(1),
    order: z.number().int().positive(),
  }),
});

const siteCollection = defineCollection({
  type: 'data',
  schema: z.object({
    linkedinUrl: z.string().url(),
    facebookUrl: z.string().url(),
    contactEmail: z.string().email(),
    membershipFormUrl: z.string().url(),
    lumaCalendarUrl: z.string().url(),
  }),
});

export const collections = {
  board: boardCollection,
  partners: partnersCollection,
  kpis: kpisCollection,
  site: siteCollection,
};
