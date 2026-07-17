import {useEffect, useRef} from 'react'
import {set, unset, useClient} from 'sanity'
import type {StringInputProps} from 'sanity'
import suneditor from 'suneditor'
import plugins from 'suneditor/src/plugins'
import 'suneditor/dist/css/suneditor.min.css'

// contentHtml field ka full WYSIWYG input (SunEditor v2, MIT) — WordPress-style editing.
// - Word / Google Docs / websites se paste: tables, formatting, images sab preserve
// - Images editor mein daalte hi Sanity CDN par upload hoti hain (base64 nahi —
//   warna document size limit cross ho jati)
// - Content HTML string ke roop mein save hota hai; website ise brand CSS ke saath
//   render karti hai (hello22website: app/blog/[slug]/page.tsx ka .cms-html block)

const BUTTONS = [
  ['undo', 'redo'],
  ['formatBlock'],
  ['bold', 'italic', 'underline', 'strike'],
  ['fontColor', 'hiliteColor', 'removeFormat'],
  ['blockquote', 'align', 'list', 'outdent', 'indent'],
  ['table', 'link', 'image', 'video', 'horizontalRule'],
  ['codeView', 'fullScreen'],
]

// SunEditor apni width target <textarea> se copy karta hai (hidden textarea =
// ~185px) — isliye 100% force. Baaki rules Studio ke look se blend karne ke liye.
const STYLE_ID = 'suneditor-studio-css'
function ensureStudioCss() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    .sun-editor{width:100% !important;border-radius:4px;overflow:hidden}
    .sun-editor .se-toolbar{border-radius:4px 4px 0 0}
    .sun-editor .se-resizing-bar{border-radius:0 0 4px 4px}
    .sun-editor-editable{padding:16px 20px}
    .sun-editor-editable img{max-width:100%;height:auto}
  `
  document.head.appendChild(style)
}

export function HtmlEditor(props: StringInputProps) {
  const {value, onChange} = props
  const client = useClient({apiVersion: '2024-01-01'})

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const editorRef = useRef<ReturnType<typeof suneditor.create> | null>(null)
  // refs — mount-once editor ke handlers hamesha taaza client/onChange use karein
  const clientRef = useRef(client)
  clientRef.current = client
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const internalValue = useRef<string | undefined>(undefined)
  const debounceTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return undefined
    ensureStudioCss()

    const editor = suneditor.create(textarea, {
      plugins,
      buttonList: BUTTONS,
      formats: ['p', 'h2', 'h3', 'h4', 'blockquote'],
      // width 100% zaroori hai — warna editor hidden textarea jitna patla banta hai
      width: '100%',
      height: '480px',
      minHeight: '280px',
      // Studio ke scroll panes mein sticky toolbar flicker karta hai — off
      stickyToolbar: -1,
      // 'full' dialogs position:fixed use karte hain jo Studio ke transformed
      // panes mein toot jata hai (screen blink) — 'local' editor ke andar khulta hai
      popupDisplay: 'local',
      defaultStyle: 'font-family: inherit; font-size: 15px; line-height: 1.7;',
    })
    editorRef.current = editor
    if (value) {
      editor.setContents(value)
      internalValue.current = value
    }

    // Fullscreen fix: Studio ke panes CSS transform use karte hain, jisse
    // position:fixed pane ke andar qaid ho jata hai. Toggle par editor ko
    // <body> mein le jao (placeholder se wapas usi jagah laane ke liye).
    const topEl = textarea.nextElementSibling as HTMLElement | null
    let fsPlaceholder: Comment | null = null
    const restoreFromFullscreen = () => {
      if (!topEl || !fsPlaceholder) return
      fsPlaceholder.parentNode?.insertBefore(topEl, fsPlaceholder)
      fsPlaceholder.remove()
      fsPlaceholder = null
      topEl.style.zIndex = ''
    }
    editor.toggleFullScreen = (isFullScreen: boolean) => {
      if (!topEl) return
      if (isFullScreen && !fsPlaceholder) {
        fsPlaceholder = document.createComment('suneditor-fullscreen')
        topEl.parentNode?.insertBefore(fsPlaceholder, topEl)
        document.body.appendChild(topEl)
        topEl.style.zIndex = '9999'
      } else if (!isFullScreen) {
        restoreFromFullscreen()
      }
    }

    editor.onChange = (contents: string) => {
      internalValue.current = contents
      window.clearTimeout(debounceTimer.current)
      debounceTimer.current = window.setTimeout(() => {
        // khali editor "<p><br></p>" deta hai — usko unset karo taaki field clean rahe
        const text = contents.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, '').trim()
        const hasMedia = /<(img|iframe|table|video|hr)[\s>]/i.test(contents)
        onChangeRef.current(text || hasMedia ? set(contents) : unset())
      }, 350)
    }

    // Images → Sanity assets (undefined return = uploadHandler ka intezaar, SunEditor docs)
    editor.onImageUploadBefore = (files, _info, _core, uploadHandler) => {
      const fileList = Array.from(files as File[])
      Promise.all(fileList.map((f) => clientRef.current.assets.upload('image', f)))
        .then((assets) =>
          uploadHandler({
            result: assets.map((a, i) => ({
              url: a.url,
              name: fileList[i].name,
              size: fileList[i].size,
            })),
          }),
        )
        .catch((err: unknown) => uploadHandler(String((err as Error)?.message || err)))
      return undefined
    }

    return () => {
      window.clearTimeout(debounceTimer.current)
      restoreFromFullscreen()
      editor.destroy()
      editorRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Document-level external change (revert, publish, history) — editor mein sync karo
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const next = value || ''
    if (next !== (internalValue.current || '')) {
      editor.setContents(next)
      internalValue.current = next
    }
  }, [value])

  return <textarea ref={textareaRef} style={{display: 'none'}} defaultValue="" />
}
