import {defineArrayMember, defineField, defineType} from 'sanity'
import {ComposeIcon, EarthGlobeIcon, HighlightIcon} from '@sanity/icons'
import {BodyInput, HighlightDecorator} from '../components/BodyInput'
import {HtmlEditor} from '../components/HtmlEditor'

export const post = defineType({
  name: 'post',
  title: 'Blog Post',
  type: 'document',
  groups: [
    {name: 'content', title: 'Content', icon: ComposeIcon, default: true},
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
    // Purana Portable Text body — hidden (old posts ka data safe hai); naya content
    // upar wale WYSIWYG field mein jata hai
    defineField({
      name: 'body',
      title: 'Body (old editor)',
      type: 'array',
      group: 'content',
      hidden: true,
      components: {input: BodyInput},
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Heading 2', value: 'h2'},
            {title: 'Heading 3', value: 'h3'},
            {title: 'Heading 4', value: 'h4'},
            {title: 'Quote', value: 'blockquote'},
          ],
          lists: [
            {title: 'Bullet', value: 'bullet'},
            {title: 'Numbered', value: 'number'},
          ],
          marks: {
            decorators: [
              {title: 'Bold', value: 'strong'},
              {title: 'Italic', value: 'em'},
              {title: 'Underline', value: 'underline'},
              {title: 'Strike', value: 'strike-through'},
              {title: 'Code', value: 'code'},
              {
                title: 'Highlight',
                value: 'highlight',
                icon: HighlightIcon,
                component: HighlightDecorator,
              },
            ],
            annotations: [
              defineArrayMember({
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  defineField({
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                    validation: (rule) =>
                      rule.uri({allowRelative: true, scheme: ['http', 'https', 'mailto', 'tel']}),
                  }),
                  defineField({
                    name: 'blank',
                    type: 'boolean',
                    title: 'Open in new tab',
                    initialValue: true,
                  }),
                ],
              }),
            ],
          },
        }),
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [
            defineField({name: 'alt', title: 'Alt Text', type: 'string'}),
            defineField({name: 'caption', title: 'Caption', type: 'string'}),
          ],
        }),
        defineArrayMember({type: 'table'}),
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
