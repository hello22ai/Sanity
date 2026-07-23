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

// Excel / Word clipboard HTML mein cell ke colors <style> block ki classes
// (.xl65{background:#FFFF00}) mein hote hain, inline nahi — SunEditor <style>
// block ko phenk deta hai to colors ud jate the. Ye helper paste se pehle un
// class-styles ko elements par inline kar deta hai (mso-* junk hata kar).
function inlineClipboardStyles(html: string): string | null {
  if (!/<style[\s>]/i.test(html)) return null
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const styleTags = Array.from(doc.querySelectorAll('style'))
  if (styleTags.length === 0) return null
  const css = styleTags.map((s) => s.textContent || '').join('\n')
  const ruleRe = /([^{}]+)\{([^}]*)\}/g
  let match: RegExpExecArray | null
  while ((match = ruleRe.exec(css))) {
    const selector = match[1].trim()
    if (!selector || selector.startsWith('@')) continue
    const decls = match[2]
      .split(';')
      .map((d) => d.trim())
      .filter((d) => d && !/^(mso-|tab-stops|page)/i.test(d))
      .join('; ')
    if (!decls) continue
    let targets: Element[]
    try {
      targets = Array.from(doc.body.querySelectorAll(selector))
    } catch {
      continue // Office ke non-standard selectors skip
    }
    for (const el of targets) {
      // inline style baad mein rakho taaki wo class-styles ko override kare
      const existing = el.getAttribute('style') || ''
      el.setAttribute('style', decls + (existing ? '; ' + existing : ''))
    }
  }
  styleTags.forEach((s) => s.remove())
  return doc.body.innerHTML
}

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
    /* Format button 82px ka tha — "Header 3"/"Blockquote" kat jate the, isliye kabhi pata
       nahi chalta tha ki cursor kis heading par hai. Ab chauda + accent color. */
    .sun-editor .se-btn-select.se-btn-tool-format{width:132px}
    .sun-editor .se-btn-select.se-btn-tool-format .txt{font-weight:700;color:#2771e5}
    /* left gutter — headings ke saamne H1/H2… ka badge yahan baithta hai */
    .sun-editor-editable{padding:16px 20px 16px 58px}
    .sun-editor-editable img{max-width:100%;height:auto}
    .sun-editor-editable strong,.sun-editor-editable b{font-weight:700}
    .sun-editor-editable em,.sun-editor-editable i{font-style:italic}
    .sun-editor-editable u{text-decoration:underline}
    .sun-editor-editable s,.sun-editor-editable strike,.sun-editor-editable del{text-decoration:line-through}

    /* ── Heading scale — website (.cms-body) se match karti hai, taaki editor me jo dikhe
       wahi live page par aaye ─────────────────────────────────────────────────── */
    .sun-editor-editable p{margin:14px 0;line-height:1.7}
    .sun-editor-editable h1{font-size:30px;line-height:1.25;font-weight:700;margin:30px 0 10px}
    .sun-editor-editable h2{font-size:25px;line-height:1.3;font-weight:700;margin:28px 0 10px}
    .sun-editor-editable h3{font-size:20px;line-height:1.35;font-weight:700;margin:24px 0 8px}
    .sun-editor-editable h4{font-size:17px;line-height:1.4;font-weight:700;margin:20px 0 8px}
    .sun-editor-editable blockquote{margin:20px 0;padding:12px 18px;border-left:4px solid #2c76ed;background:rgba(39,113,229,.06);font-weight:600}

    /* Har heading ke saamne uska level badge (CSS only — saved HTML me nahi jata).
       Isse turant dikhta hai ki kaun si line H2 hai aur kaun si H3. */
    .sun-editor-editable h1,.sun-editor-editable h2,.sun-editor-editable h3,
    .sun-editor-editable h4,.sun-editor-editable blockquote{position:relative}
    .sun-editor-editable h1::before{content:'H1'}
    .sun-editor-editable h2::before{content:'H2'}
    .sun-editor-editable h3::before{content:'H3'}
    .sun-editor-editable h4::before{content:'H4'}
    .sun-editor-editable blockquote::before{content:'❝'}
    .sun-editor-editable h1::before,.sun-editor-editable h2::before,.sun-editor-editable h3::before,
    .sun-editor-editable h4::before,.sun-editor-editable blockquote::before{
      position:absolute;left:-44px;top:.32em;width:32px;height:18px;
      font:700 10px/18px -apple-system,system-ui,sans-serif;letter-spacing:.04em;text-align:center;
      color:#2771e5;background:rgba(39,113,229,.1);border:1px solid rgba(39,113,229,.28);
      border-radius:4px;user-select:none;pointer-events:none}

    /* ── Lists — bullets ke beech ka gap website jaisa chhota (pehle bahut zyada tha) ── */
    .sun-editor-editable ul,.sun-editor-editable ol{margin:14px 0;padding-left:26px}
    .sun-editor-editable ul{list-style:disc}
    .sun-editor-editable ol{list-style:decimal}
    .sun-editor-editable li{margin:0 0 4px;line-height:1.65}
    .sun-editor-editable li>p{margin:0}
    .sun-editor-editable li>ul,.sun-editor-editable li>ol{margin:4px 0 0}

    /* ── Tables — Excel jaisa look; inline styles (Excel ke apne colors/borders) inhe
       override karte hain, ye sirf fallback hai ────────────────────────────────── */
    .sun-editor-editable table{border-collapse:collapse;margin:16px 0;font-size:14px}
    .sun-editor-editable table td,.sun-editor-editable table th{
      border:1px solid #c9ccd4;padding:6px 10px;vertical-align:top}
    .sun-editor-editable table th{background:#f2f4f8;font-weight:700;text-align:left}
    /* column-resize ke waqt selection highlight na ho */
    .sun-editor-editable.se-col-resizing,.sun-editor-editable.se-col-resizing *{
      cursor:col-resize !important;user-select:none !important}
  `
  document.head.appendChild(style)
}

// ── Table column resize ────────────────────────────────────────────────────
// SunEditor 2.x me columns drag karke resize karne ki sahulat nahi hai (uska table
// controller sirf "full width" toggle deta hai). Ye chhota helper cell ke border par
// col-resize cursor deta hai aur drag par <colgroup> ki widths badal deta hai —
// Excel/Word jaisa. Widths <col style="width:..px"> me save hoti hain, isliye website
// par bhi wahi columns dikhte hain.
const EDGE = 6 // px — border ke aas-paas ka grab zone
const MIN_COL = 28 // px — isse patla column allow nahi

function cellAt(target: EventTarget | null): HTMLTableCellElement | null {
  const el = target as HTMLElement | null
  if (!el || typeof el.closest !== 'function') return null
  return el.closest('td,th')
}

// row me is cell se pehle kitne logical columns hain (colspan ginti me)
function colIndexOf(cell: HTMLTableCellElement): number {
  const row = cell.parentElement as HTMLTableRowElement | null
  if (!row) return 0
  let index = 0
  for (const c of Array.from(row.cells)) {
    if (c === cell) break
    index += c.colSpan || 1
  }
  return index
}

// cursor kis column ke right border par hai? (null = kisi border par nahi)
function edgeColumnFor(cell: HTMLTableCellElement, clientX: number): number | null {
  const rect = cell.getBoundingClientRect()
  const start = colIndexOf(cell)
  if (clientX >= rect.right - EDGE) return start + (cell.colSpan || 1) - 1
  if (clientX <= rect.left + EDGE && start > 0) return start - 1
  return null
}

// colgroup ko abhi ki rendered widths se dobara banata hai — uske baad har column ki
// width explicit px me hai, to drag ka asar sirf usi column par padta hai.
function rebuildCols(table: HTMLTableElement): HTMLTableColElement[] {
  const row = table.rows[0]
  if (!row) return []
  const widths: number[] = []
  for (const cell of Array.from(row.cells)) {
    const span = cell.colSpan || 1
    const each = cell.getBoundingClientRect().width / span
    for (let i = 0; i < span; i++) widths.push(Math.max(MIN_COL, Math.round(each)))
  }
  if (widths.length === 0) return []
  Array.from(table.children).forEach((child) => {
    if (child.tagName === 'COLGROUP') child.remove()
  })
  const colgroup = document.createElement('colgroup')
  const cols = widths.map((w) => {
    const col = document.createElement('col')
    col.style.width = `${w}px`
    colgroup.appendChild(col)
    return col
  })
  table.insertBefore(colgroup, table.firstChild)
  // SunEditor ki apni classes width ko !important se lock karti hain
  // (.se-table-size-100{width:100%!important}, .se-table-size-auto{width:auto!important}) —
  // px width chalane ke liye dono hatani padti hain aur sab kuch inline style me rakhna padta hai.
  // (Controller inhi inline values se apni state padhta hai, isliye wo bhi sahi rehta hai.)
  table.classList.remove('se-table-size-100', 'se-table-size-auto', 'se-table-layout-auto', 'se-table-layout-fixed')
  // fixed layout = <col> widths bilkul waise hi lagti hain jaisi set ki hain
  table.style.tableLayout = 'fixed'
  table.style.width = `${widths.reduce((a, b) => a + b, 0)}px`
  return cols
}

export function HtmlEditor(props: StringInputProps) {
  const {value, onChange, readOnly} = props
  const client = useClient({apiVersion: '2024-01-01'})

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const editorRef = useRef<ReturnType<typeof suneditor.create> | null>(null)
  // refs — mount-once editor ke handlers hamesha taaza client/onChange use karein
  const clientRef = useRef(client)
  clientRef.current = client
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const readOnlyRef = useRef(readOnly)
  readOnlyRef.current = readOnly
  const internalValue = useRef<string | undefined>(undefined)
  const debounceTimer = useRef<number | undefined>(undefined)
  // abhi tak save na hua content (debounce window ke andar) — navigate/close par flush hota hai
  const pendingRef = useRef<string | null>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return undefined
    ensureStudioCss()

    const editor = suneditor.create(textarea, {
      plugins,
      buttonList: BUTTONS,
      // h5/h6 hata diye — website un par koi style nahi deti thi, isliye select karne par
      // heading "lagti hi nahi" thi. Ab jo yahan chuno wahi live page par milta hai.
      formats: ['p', 'h1', 'h2', 'h3', 'h4', 'blockquote'],
      // Excel ki column widths <colgroup>/<col> me aati hain, aur ye dono SunEditor ki
      // default tag whitelist me nahi hain — isliye paste par columns ki chaudai ud jati
      // thi. Yahan add karne se paste (pasteTagsWhitelist isi list se banti hai) aur
      // hamara column-resize dono kaam karte hain.
      addTagsWhitelist: 'colgroup|col',
      // Table cells par style/bgcolor rehne do (paste hue Excel/Sheets colors ke
      // liye). Per-tag list us tag ke defaults REPLACE karti hai, isliye
      // colspan/rowspan/class bhi yahan dobara likhne pade.
      attributesWhitelist: {
        table: 'class|style|width|height|border|cellpadding|cellspacing',
        colgroup: 'class|style|span|width',
        col: 'class|style|span|width',
        thead: 'class|style',
        tbody: 'class|style',
        tr: 'class|style|height',
        td: 'class|style|colspan|rowspan|width|height|bgcolor|valign|align',
        th: 'class|style|colspan|rowspan|width|height|bgcolor|valign|align',
      },
      // width 100% zaroori hai — warna editor hidden textarea jitna patla banta hai
      width: '100%',
      // Editor ab poori available pane height leta hai (pehle fixed 480px tha aur uske
      // neeche pane ki jagah bekaar jati thi — poora blog ek chhoti khidki me likhna padta
      // tha). Viewport se naapa hai, isliye bade screen par bada canvas milta hai; toolbar
      // upar tika rehta hai kyunki scroll editor ke andar hi hota hai.
      // Aur zyada jagah chahiye to toolbar ka fullscreen button hai; neeche wali resize bar
      // se bhi drag karke height badal sakte hain.
      height: 'calc(100vh - 300px)',
      minHeight: '440px',
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

    // Excel/Word paste: pehle <style> block ke colors inline karo, phir SunEditor
    // ki apni cleaning (cleanHTML) se guzaro — style attributes upar whitelist
    // hone ki wajah se bach jate hain
    editor.onPaste = (e, _cleanData, _maxCharCount, core) => {
      const raw = (e as ClipboardEvent).clipboardData?.getData('text/html')
      if (!raw) return true
      const inlined = inlineClipboardStyles(raw)
      if (!inlined) return true
      return core.cleanHTML(inlined, core.pasteTagsWhitelistRegExp, core.pasteTagsBlacklistRegExp)
    }

    const commitContents = (contents: string) => {
      // khali editor "<p><br></p>" deta hai — usko unset karo taaki field clean rahe
      const text = contents.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, '').trim()
      const hasMedia = /<(img|iframe|table|video|hr)[\s>]/i.test(contents)
      onChangeRef.current(text || hasMedia ? set(contents) : unset())
    }
    // debounce window ke andar user navigate/blur kare to pending change turant save
    const flushPending = () => {
      if (pendingRef.current == null) return
      window.clearTimeout(debounceTimer.current)
      const contents = pendingRef.current
      pendingRef.current = null
      commitContents(contents)
    }

    editor.onChange = (contents: string) => {
      // read-only document (e.g. Published perspective) par patch mat bhejo —
      // warna "Attempted to patch a read-only document" error aata hai
      if (readOnlyRef.current) return
      internalValue.current = contents
      pendingRef.current = contents
      window.clearTimeout(debounceTimer.current)
      debounceTimer.current = window.setTimeout(() => {
        pendingRef.current = null
        commitContents(contents)
      }, 350)
    }

    // editor se bahar click karte hi (doosra field, doosri jagah) pending save flush
    editor.onBlur = () => flushPending()

    // ── Column resize wiring ────────────────────────────────────────────────
    const wysiwyg = (editor.core as unknown as {context: {element: {wysiwyg: HTMLElement}}})
      .context.element.wysiwyg
    let drag: {col: HTMLTableColElement; table: HTMLTableElement; startX: number; startW: number; startTableW: number} | null = null

    const onDocMove = (e: MouseEvent) => {
      if (!drag) return
      e.preventDefault()
      const width = Math.max(MIN_COL, drag.startW + (e.clientX - drag.startX))
      drag.col.style.width = `${Math.round(width)}px`
      drag.table.style.width = `${Math.round(drag.startTableW + (width - drag.startW))}px`
    }
    const onDocUp = () => {
      if (!drag) return
      drag = null
      wysiwyg.classList.remove('se-col-resizing')
      document.removeEventListener('mousemove', onDocMove)
      document.removeEventListener('mouseup', onDocUp)
      // undo stack + onChange dono — history.push andar se core.functions.onChange call karta hai
      editor.core.history.push(false)
    }

    // hover par border ke upar col-resize cursor
    const onEditorMove = (e: MouseEvent) => {
      if (drag) return
      const cell = cellAt(e.target)
      const column = cell ? edgeColumnFor(cell, e.clientX) : null
      wysiwyg.style.cursor = column == null ? '' : 'col-resize'
    }
    const onEditorDown = (e: MouseEvent) => {
      if (e.button !== 0 || readOnlyRef.current) return
      const cell = cellAt(e.target)
      if (!cell) return
      const column = edgeColumnFor(cell, e.clientX)
      if (column == null) return
      const table = cell.closest('table')
      if (!table) return
      const col = rebuildCols(table)[column]
      if (!col) return
      e.preventDefault() // caret jump / text selection rok do
      drag = {
        col,
        table,
        startX: e.clientX,
        startW: parseFloat(col.style.width) || MIN_COL,
        startTableW: parseFloat(table.style.width) || table.getBoundingClientRect().width,
      }
      wysiwyg.classList.add('se-col-resizing')
      document.addEventListener('mousemove', onDocMove)
      document.addEventListener('mouseup', onDocUp)
    }
    wysiwyg.addEventListener('mousemove', onEditorMove)
    wysiwyg.addEventListener('mousedown', onEditorDown)

    // browser tab/window band karne par agar save pending ho to warn karo
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingRef.current != null) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

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
      window.removeEventListener('beforeunload', handleBeforeUnload)
      wysiwyg.removeEventListener('mousemove', onEditorMove)
      wysiwyg.removeEventListener('mousedown', onEditorDown)
      document.removeEventListener('mousemove', onDocMove)
      document.removeEventListener('mouseup', onDocUp)
      // doosre document/page par jaane se pehle aakhri change save kar do
      flushPending()
      window.clearTimeout(debounceTimer.current)
      restoreFromFullscreen()
      editor.destroy()
      editorRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // readOnly document (Published perspective, insufficient permissions) → editor lock
  useEffect(() => {
    editorRef.current?.readOnly(Boolean(readOnly))
  }, [readOnly])

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
