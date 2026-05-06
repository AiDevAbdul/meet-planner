'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { useEffect, useCallback } from 'react'
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, Code, Quote, Minus, Type,
} from 'lucide-react'

type Props = {
  initialContent?: Record<string, unknown> | null
  placeholder?: string
  onChange?: (json: Record<string, unknown>) => void
  editable?: boolean
}

export function RichTextEditor({ initialContent, placeholder, onChange, editable = true }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Start writing…',
      }),
      CharacterCount,
    ],
    content: (initialContent as Parameters<typeof useEditor>[0] extends { content?: infer C } ? C : unknown) ?? '',
    editable,
    onUpdate({ editor: e }) {
      onChange?.(e.getJSON() as Record<string, unknown>)
    },
    immediatelyRender: false,
  })

  useEffect(() => {
    if (!editor) return
    if (initialContent && JSON.stringify(editor.getJSON()) !== JSON.stringify(initialContent)) {
      editor.commands.setContent(initialContent as Parameters<typeof editor.commands.setContent>[0])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, JSON.stringify(initialContent)])

  if (!editor) return null

  return (
    <div className="flex flex-col h-full" style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      {editable && (
        <div
          className="flex items-center gap-0.5 px-2 py-1.5 flex-wrap"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}
          role="toolbar"
          aria-label="Text formatting"
        >
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            aria-label="Bold"
            title="Bold"
          >
            <Bold size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            aria-label="Italic"
            title="Italic"
          >
            <Italic size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            aria-label="Strikethrough"
            title="Strikethrough"
          >
            <Strikethrough size={14} />
          </ToolbarButton>

          <Divider />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            aria-label="Heading 1"
            title="Heading 1"
          >
            <Heading1 size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            aria-label="Heading 2"
            title="Heading 2"
          >
            <Heading2 size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            aria-label="Heading 3"
            title="Heading 3"
          >
            <Heading3 size={14} />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor.chain().focus().setParagraph().run()}
            active={editor.isActive('paragraph')}
            aria-label="Paragraph"
            title="Paragraph"
          >
            <Type size={14} />
          </ToolbarButton>

          <Divider />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            aria-label="Bullet list"
            title="Bullet list"
          >
            <List size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            aria-label="Ordered list"
            title="Ordered list"
          >
            <ListOrdered size={14} />
          </ToolbarButton>

          <Divider />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            aria-label="Code block"
            title="Code block"
          >
            <Code size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            aria-label="Blockquote"
            title="Blockquote"
          >
            <Quote size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            active={false}
            aria-label="Horizontal rule"
            title="Horizontal rule"
          >
            <Minus size={14} />
          </ToolbarButton>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        <EditorContent
          editor={editor}
          className="rich-editor h-full"
        />
      </div>
    </div>
  )
}

function Divider() {
  return (
    <span
      className="inline-block w-px mx-1 self-stretch"
      style={{ background: 'var(--border)', height: 16 }}
      aria-hidden="true"
    />
  )
}

function ToolbarButton({
  onClick,
  active,
  children,
  ...rest
}: {
  onClick: () => void
  active: boolean
  children: React.ReactNode
  'aria-label': string
  title: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center w-7 h-7 rounded-[6px] transition-colors"
      style={{
        color:      active ? 'var(--color-blue)'       : 'var(--text-secondary)',
        background: active ? 'rgba(0,122,255,0.12)'    : 'transparent',
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-glass)'
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
