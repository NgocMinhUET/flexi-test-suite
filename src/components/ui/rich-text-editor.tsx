import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { Bold, Italic, List, ListOrdered, Code, Undo, Redo, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useCallback } from 'react';
import { useImageUpload } from '@/hooks/useImageUpload';
import { toast } from 'sonner';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

const MenuBar = ({ 
  editor, 
  compact, 
  onImageUpload,
  isUploading 
}: { 
  editor: Editor | null; 
  compact?: boolean;
  onImageUpload: () => void;
  isUploading: boolean;
}) => {
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
        onClick={onImageUpload}
        disabled={isUploading}
        className={buttonSize}
        title="Thêm hình ảnh"
      >
        {isUploading ? (
          <Loader2 className={cn(iconSize, 'animate-spin')} />
        ) : (
          <ImageIcon className={iconSize} />
        )}
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, isUploading } = useImageUpload();

  const insertImage = useCallback(async (file: File, editor: Editor | null) => {
    if (!editor) return;
    
    const result = await uploadImage(file);
    if (result) {
      editor.chain().focus().setImage({ src: result.url }).run();
      toast.success('Đã thêm hình ảnh');
    }
  }, [uploadImage]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Image.configure({
        inline: true,
        allowBase64: false,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md my-2 cursor-pointer',
        },
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
          '[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-md [&_img]:my-2',
        ),
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
              event.preventDefault();
              const file = items[i].getAsFile();
              if (file) {
                insertImage(file, editor);
              }
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            if (files[i].type.startsWith('image/')) {
              event.preventDefault();
              insertImage(files[i], editor);
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  // Store editor reference for paste handler
  useEffect(() => {
    if (editor) {
      editor.setOptions({
        editorProps: {
          ...editor.options.editorProps,
          handlePaste: (view, event) => {
            const items = event.clipboardData?.items;
            if (items) {
              for (let i = 0; i < items.length; i++) {
                if (items[i].type.startsWith('image/')) {
                  event.preventDefault();
                  const file = items[i].getAsFile();
                  if (file) {
                    insertImage(file, editor);
                  }
                  return true;
                }
              }
            }
            return false;
          },
          handleDrop: (view, event) => {
            const files = event.dataTransfer?.files;
            if (files && files.length > 0) {
              for (let i = 0; i < files.length; i++) {
                if (files[i].type.startsWith('image/')) {
                  event.preventDefault();
                  insertImage(files[i], editor);
                  return true;
                }
              }
            }
            return false;
          },
        },
      });
    }
  }, [editor, insertImage]);

  // Update editor content when value prop changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editor) {
      await insertImage(file, editor);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className={cn(
        'rounded-md border border-input bg-background overflow-hidden',
        'focus-within:ring-1 focus-within:ring-ring',
        className
      )}
    >
      <MenuBar 
        editor={editor} 
        compact={compact} 
        onImageUpload={handleImageButtonClick}
        isUploading={isUploading}
      />
      <EditorContent editor={editor} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
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
