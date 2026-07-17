/**
 * One-time migration: purane Portable Text `body` ka content HTML mein convert
 * karke naye WYSIWYG field `contentHtml` mein daalta hai (sirf un posts/drafts
 * mein jahan contentHtml abhi khali hai — kisi ka likha content overwrite nahi hota).
 *
 * `body` field ko delete NAHI karta — wo backup ke taur par pada rehta hai.
 *
 * Chalane ka tarika (login zaroori):
 *   npx sanity login
 *   npx sanity exec scripts/migrate-body-to-contentHtml.ts --with-user-token
 */
import {getCliClient} from 'sanity/cli'
import {toHTML} from '@portabletext/to-html'
import type {PortableTextComponents} from '@portabletext/to-html'

const client = getCliClient({apiVersion: '2024-01-01'}).withConfig({perspective: 'raw'})

const IMAGE_REF = /^image-([a-zA-Z0-9]+)-(\d+x\d+)-([a-z0-9]+)$/

function imageUrlFromRef(ref: string | undefined): string | null {
  const m = IMAGE_REF.exec(ref || '')
  if (!m) return null
  const {projectId, dataset} = client.config()
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${m[1]}-${m[2]}.${m[3]}`
}

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const safeHref = (href: unknown) =>
  typeof href === 'string' && /^(https?:|mailto:|tel:|\/)/i.test(href.trim()) ? href.trim() : ''

// Schema ke marks/types → HTML. Output website ke .cms-html CSS se match karta hai.
const components: PortableTextComponents = {
  types: {
    image: ({value}) => {
      const url = imageUrlFromRef((value as any)?.asset?._ref)
      if (!url) return ''
      const v = value as any
      const caption = v?.caption ? `<figcaption>${esc(v.caption)}</figcaption>` : ''
      return `<figure><img src="${url}" alt="${esc(v?.alt || '')}">${caption}</figure>`
    },
    table: ({value}) => {
      const rows: any[] = (value as any)?.rows || []
      if (!rows.length) return ''
      const tr = rows
        .map((r) => `<tr>${(r.cells || []).map((c: string) => `<td>${esc(c)}</td>`).join('')}</tr>`)
        .join('')
      return `<table><tbody>${tr}</tbody></table>`
    },
  },
  marks: {
    link: ({value, children}) => {
      const href = safeHref((value as any)?.href)
      if (!href) return String(children)
      const blank = (value as any)?.blank ? ' target="_blank" rel="noopener"' : ''
      return `<a href="${esc(href)}"${blank}>${children}</a>`
    },
    highlight: ({children}) => `<span style="background-color:rgba(44,118,237,.22)">${children}</span>`,
    underline: ({children}) => `<u>${children}</u>`,
    'strike-through': ({children}) => `<s>${children}</s>`,
  },
}

async function run() {
  const posts: {_id: string; title?: string; body: unknown[]}[] = await client.fetch(
    `*[_type=="post" && defined(body) && !defined(contentHtml)]{_id, title, body}`,
  )
  if (!posts.length) {
    console.log('Sab posts pehle se migrated hain — kuch karne ko nahi.')
    return
  }
  for (const post of posts) {
    const html = toHTML(post.body as any, {components})
    await client.patch(post._id).set({contentHtml: html}).commit()
    console.log(`✔ migrated: ${post._id} — "${post.title}" (${html.length} chars HTML)`)
  }
  console.log(`\n${posts.length} document(s) migrate ho gaye. Studio refresh karke dekh lo.`)
}

run().catch((err) => {
  console.error('Migration fail hui:', err.message)
  throw err
})
