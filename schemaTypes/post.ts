import {defineArrayMember, defineField, defineType} from 'sanity'
// @sanity/icons v5 ne in dono ko root entry se hata diya (icon khud maujood hai, sirf
// re-export gaya). Root se import karne par dev server "does not provide an export named
// 'ComposeIcon'" ke saath phat jata hai — aur TypeScript pakadta bhi nahi, kyunki .d.ts me
// ye ab bhi `declare const ComposeIcon: never` ke roop me hain. Isliye subpath se import.
import {ComposeIcon} from '@sanity/icons/Compose'
import {EarthGlobeIcon} from '@sanity/icons/EarthGlobe'
import {HelpCircleIcon} from '@sanity/icons/HelpCircle'
import {HtmlEditor} from '../components/HtmlEditor'

export const post = defineType({
  name: 'post',
  title: 'Blog Post',
  type: 'document',
  groups: [
    {name: 'content', title: 'Content', icon: ComposeIcon, default: true},
    {name: 'faq', title: 'FAQ', icon: HelpCircleIcon},
    {name: 'seo', title: 'SEO', icon: EarthGlobeIcon},
  ],
  fieldsets: [
    {
      name: 'searchEngine',
      title: '🔍 Search Engine (Google)',
      options: {collapsible: true, collapsed: false},
    },
    {
      name: 'social',
      title: '📣 Social Sharing (Open Graph)',
      options: {collapsible: true, collapsed: false},
    },
    {
      name: 'advanced',
      title: '⚙️ Advanced',
      options: {collapsible: true, collapsed: true},
    },
  ],
  fields: [
    // ── Content ──────────────────────────────────────────────
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Short Description',
      type: 'text',
      rows: 3,
      group: 'content',
    }),
    // Blog cards ke pastel thumbnail ka bada label — khali ho to website title
    // ko smart-truncate karke use karti hai (hello22website lib/sanity.ts)
    defineField({
      name: 'shortTitle',
      title: 'Card Label',
      type: 'string',
      group: 'content',
      description:
        'Short punchy label shown on blog card thumbnails, e.g. "Missed Calls = Lost Money" (2–4 words). Leave empty to auto-trim the title.',
      validation: (rule) => rule.max(30).warning('Keep card labels short — under 30 characters'),
    }),
    defineField({
      name: 'featureImage',
      title: 'Feature Image',
      type: 'image',
      group: 'content',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
        }),
      ],
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      group: 'content',
    }),
    // WYSIWYG editor (SunEditor) — WordPress jaisa editing, HTML mein save hota hai.
    // Website par render: hello22website app/blog/[slug]/page.tsx (.cms-html)
    defineField({
      name: 'contentHtml',
      title: 'Body',
      type: 'text',
      group: 'content',
      description:
        'Full WYSIWYG editor — paste from Word/Google Docs keeps tables, images and formatting. Images are uploaded to the Sanity CDN automatically.',
      components: {input: HtmlEditor},
    }),
    // Purana Portable Text body — hidden rakha hai taaki purane posts ka data
    // safe rahe (website fallback render karti hai); naya content contentHtml mein
    defineField({
      name: 'body',
      title: 'Body (old editor)',
      type: 'array',
      group: 'content',
      hidden: true,
      of: [{type: 'block'}, {type: 'image', options: {hotspot: true}}],
    }),

    // ── FAQ ──────────────────────────────────────────────────
    // Body editor se bilkul alag: har sawaal-jawab apni row me. Website par ye wahi
    // accordion ban kar aati hai jo abhi dikhta hai (PostBody.tsx ka .cms-faq markup) —
    // dikhne me koi farq nahi, sirf likhne ka tareeka saaf ho jata hai. FAQPage JSON-LD
    // bhi inhi se banta hai, isliye Google ke rich results zyada bharose ke saath aate hain.
    defineField({
      name: 'faqs',
      title: 'FAQs',
      type: 'array',
      group: 'faq',
      description:
        'One row per question. These appear as an accordion at the end of the article. ' +
        'If this post already has an FAQ section written inside Body, delete it from there — ' +
        'otherwise the same questions will show twice.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'faq',
          title: 'Question',
          fields: [
            defineField({
              name: 'question',
              title: 'Question',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'answer',
              title: 'Answer',
              type: 'text',
              rows: 4,
              description: 'Plain text. Blank line = new paragraph.',
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: {question: 'question', answer: 'answer'},
            prepare: ({question, answer}: {question?: string; answer?: string}) => ({
              title: question || 'Untitled question',
              subtitle: (answer || '').replace(/\s+/g, ' ').trim(),
            }),
          },
        }),
      ],
    }),

    // ── SEO: Search Engine ───────────────────────────────────
    defineField({
      name: 'seoTitle',
      title: 'SEO Title',
      type: 'string',
      group: 'seo',
      fieldset: 'searchEngine',
      description: 'Title for search engines — keep under 60 characters (falls back to post title)',
      validation: (rule) =>
        rule.max(60).warning('SEO titles longer than 60 characters get cut off in Google'),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO Description',
      type: 'text',
      rows: 3,
      group: 'seo',
      fieldset: 'searchEngine',
      description:
        'Meta description — keep under 160 characters (falls back to description)',
      validation: (rule) =>
        rule.max(160).warning('Meta descriptions longer than 160 characters get cut off in Google'),
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      group: 'seo',
      fieldset: 'searchEngine',
      of: [{type: 'string'}],
      options: {layout: 'tags'},
    }),

    // ── SEO: Open Graph ──────────────────────────────────────
    defineField({
      name: 'ogTitle',
      title: 'Open Graph Title',
      type: 'string',
      group: 'seo',
      fieldset: 'social',
      description: 'Title shown when shared on social media (falls back to SEO title)',
    }),
    defineField({
      name: 'ogDescription',
      title: 'Open Graph Description',
      type: 'text',
      rows: 3,
      group: 'seo',
      fieldset: 'social',
      description: 'Description shown when shared on social media (falls back to SEO description)',
    }),

    // ── SEO: Advanced ────────────────────────────────────────
    defineField({
      name: 'canonicalUrl',
      title: 'Canonical Link',
      type: 'url',
      group: 'seo',
      fieldset: 'advanced',
      description: 'Canonical URL if this content exists elsewhere',
    }),
    defineField({
      name: 'schemaMarkup',
      title: 'Schema Markup (JSON-LD)',
      type: 'text',
      rows: 8,
      group: 'seo',
      fieldset: 'advanced',
      description: 'Paste raw JSON-LD structured data (must be valid JSON)',
      validation: (rule) =>
        rule.custom((value) => {
          if (!value) return true
          try {
            JSON.parse(value)
            return true
          } catch {
            return 'Must be valid JSON'
          }
        }),
    }),
  ],
  orderings: [
    {
      title: 'Published Date (newest first)',
      name: 'publishedAtDesc',
      by: [{field: 'publishedAt', direction: 'desc'}],
    },
    {
      title: 'Title A→Z',
      name: 'titleAsc',
      by: [{field: 'title', direction: 'asc'}],
    },
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'description',
      media: 'featureImage',
    },
  },
})
