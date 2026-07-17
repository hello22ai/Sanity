import {htmlToBlocks} from '@portabletext/block-tools'
import {PortableTextInput} from 'sanity'
import type {InputProps, PortableTextInputProps, TypedObject} from 'sanity'
import type {ReactNode} from 'react'

// Body editor ka custom input — paste hui HTML <table> (Word / Google Docs / websites)
// ko real table block mein convert karta hai. Default editor table ko plain text
// bana deta tha; ye handler sirf tab chalta hai jab clipboard mein <table> ho,
// baaki har paste default handling par jata hai.

const randomKey = () => Math.random().toString(36).slice(2, 12)

const handlePaste: NonNullable<PortableTextInputProps['onPaste']> = (input) => {
  const {event, schemaTypes, path} = input
  const html = event.clipboardData.getData('text/html')
  if (!html || !/<table[\s>]/i.test(html)) return undefined

  const blocks = htmlToBlocks(html, schemaTypes.portableText, {
    parseHtml: (h) => new DOMParser().parseFromString(h, 'text/html'),
    rules: [
      {
        deserialize(el, _next, block) {
          const node = el as HTMLElement
          if (typeof node.tagName !== 'string' || node.tagName.toLowerCase() !== 'table') {
            return undefined
          }
          const rows = Array.from(node.querySelectorAll('tr'))
            .map((tr) => ({
              _type: 'tableRow',
              _key: randomKey(),
              cells: Array.from(tr.querySelectorAll('th,td')).map((cell) =>
                (cell.textContent || '').replace(/\s+/g, ' ').trim(),
              ),
            }))
            .filter((row) => row.cells.length > 0)
          if (rows.length === 0) return undefined
          return block({_type: 'table', _key: randomKey(), rows})
        },
      },
    ],
  })
  if (!blocks.length) return undefined
  // block-tools ka PortableTextBlock aur sanity ka TypedObject structurally same hain,
  // sirf nominal type difference hai — isliye cast safe hai
  return {insert: blocks as unknown as TypedObject[], path}
}

export function BodyInput(props: InputProps) {
  return <PortableTextInput {...(props as PortableTextInputProps)} onPaste={handlePaste} />
}

// Highlight decorator ka editor-preview render (frontend par bhi yehi tint dikhta hai)
export function HighlightDecorator(props: {children: ReactNode}) {
  return (
    <span style={{backgroundColor: 'rgba(44,118,237,.22)', borderRadius: 2, padding: '0 2px'}}>
      {props.children}
    </span>
  )
}
