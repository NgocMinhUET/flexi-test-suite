import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Code, Undo, Redo } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

const MenuBar = ({ editor, compact }: { editor: Editor | null; compact?: boolean }) => {
  if (!editor) return null;

  const buttonSize = compact ? 'h-6 w-6 p-0' : 'h-7 w-7 p-0';
  const iconSize = compact ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div className="flex items-center gap-0.5 p-1 border-b border-border bg-muted/30">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(buttonSize, editor.isActive('bold') && 'bg-accent')}
        title="Bold (Ctrl+B)"
      >
        <Bold className={iconSize} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(buttonSize, editor.isActive('italic') && 'bg-accent')}
        title="Italic (Ctrl+I)"
      >
        <Italic className={iconSize} />
      </Button>
      <div className="w-px h-4 bg-border mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(buttonSize, editor.isActive('bulletList') && 'bg-accent')}
        title="Bullet List"
      >
        <List className={iconSize} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(buttonSize, editor.isActive('orderedList') && 'bg-accent')}
        title="Numbered List"
      >
        <ListOrdered className={iconSize} />
      </Button>
      <div className="w-px h-4 bg-border mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={cn(buttonSize, editor.isActive('codeBlock') && 'bg-accent')}
        title="Code Block"
      >
        <Code className={iconSize} />
      </Button>
      <div className="w-px h-4 bg-border mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className={buttonSize}
        title="Undo"
      >
        <Undo className={iconSize} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className={buttonSize}
        title="Redo"
      >
        <Redo className={iconSize} />
      </Button>
    </div>
  );
};

export const RichTextEditor = ({
  value,
  onChange,
  placeholder = 'Nhập nội dung...',
  className,
  compact = false,
}: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
          compact ? 'min-h-[40px] p-2' : 'min-h-[100px] p-3',
          '[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5',
          '[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6',
          '[&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded-md [&_pre]:text-sm',
          '[&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm',
        ),
      },
    },
  });

  // Update editor content when value prop changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  return (
    <div
      className={cn(
        'rounded-md border border-input bg-background overflow-hidden',
        'focus-within:ring-1 focus-within:ring-ring',
        className
      )}
    >
      <MenuBar editor={editor} compact={compact} />
      <EditorContent editor={editor} />
    </div>
  );
};

// Helper function to strip HTML for preview text
export const stripHtml = (html: string): string => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

// Helper to check if content is just plain text (for backward compatibility)
export const isHtmlContent = (content: string): boolean => {
  return content.startsWith('<') && content.includes('>');
};
