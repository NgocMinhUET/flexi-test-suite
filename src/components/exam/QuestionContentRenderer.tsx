import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface MediaItem {
  type: 'image';
  url: string;
  position?: 'inline' | 'before' | 'after';
}

interface QuestionContentRendererProps {
  content: string;
  media?: MediaItem[];
  className?: string;
  imageClassName?: string;
}

// Memoized image component
const QuestionImage = memo(({ 
  src, 
  alt,
  className 
}: { 
  src: string; 
  alt: string;
  className?: string;
}) => (
  <div className={cn("my-3", className)}>
    <img
      src={src}
      alt={alt}
      className="max-w-full h-auto rounded-lg border border-border shadow-sm"
      style={{ maxHeight: '400px', objectFit: 'contain' }}
      loading="lazy"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
      }}
    />
  </div>
));

QuestionImage.displayName = 'QuestionImage';

/**
 * Renders question content with support for HTML and media (images)
 * Handles different media positions: before, after, inline
 */
export const QuestionContentRenderer = memo(({
  content,
  media = [],
  className,
  imageClassName,
}: QuestionContentRendererProps) => {
  // Separate media by position
  const { beforeMedia, afterMedia, inlineMedia } = useMemo(() => {
    const before: MediaItem[] = [];
    const after: MediaItem[] = [];
    const inline: MediaItem[] = [];

    media.forEach((item) => {
      if (item.type === 'image') {
        switch (item.position) {
          case 'before':
            before.push(item);
            break;
          case 'after':
            after.push(item);
            break;
          case 'inline':
          default:
            inline.push(item);
            break;
        }
      }
    });

    return { beforeMedia: before, afterMedia: after, inlineMedia: inline };
  }, [media]);

  // Check if content contains img tags (already has inline images)
  const hasInlineImagesInContent = useMemo(() => {
    return /<img\s+[^>]*src\s*=/i.test(content);
  }, [content]);

  return (
    <div className={cn("space-y-2", className)}>
      {/* Before media */}
      {beforeMedia.map((item, idx) => (
        <QuestionImage
          key={`before-${idx}`}
          src={item.url}
          alt={`Hình ảnh câu hỏi ${idx + 1}`}
          className={imageClassName}
        />
      ))}

      {/* Main content with HTML */}
      <div 
        className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded-md [&_pre]:text-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:border [&_img]:border-border [&_img]:shadow-sm [&_img]:my-3"
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {/* Inline media (if not already in content) */}
      {!hasInlineImagesInContent && inlineMedia.map((item, idx) => (
        <QuestionImage
          key={`inline-${idx}`}
          src={item.url}
          alt={`Hình ảnh minh họa ${idx + 1}`}
          className={imageClassName}
        />
      ))}

      {/* After media */}
      {afterMedia.map((item, idx) => (
        <QuestionImage
          key={`after-${idx}`}
          src={item.url}
          alt={`Hình ảnh bổ sung ${idx + 1}`}
          className={imageClassName}
        />
      ))}
    </div>
  );
});

QuestionContentRenderer.displayName = 'QuestionContentRenderer';

/**
 * Renders an option text with support for HTML and optional image
 */
interface OptionContentRendererProps {
  text: string;
  imageUrl?: string;
  className?: string;
}

export const OptionContentRenderer = memo(({
  text,
  imageUrl,
  className,
}: OptionContentRendererProps) => {
  return (
    <div className={cn("space-y-2", className)}>
      <div 
        className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-0 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded [&_img]:border [&_img]:border-border"
        dangerouslySetInnerHTML={{ __html: text }}
      />
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Hình ảnh đáp án"
          className="max-w-[200px] h-auto rounded border border-border mt-2"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      )}
    </div>
  );
});

OptionContentRenderer.displayName = 'OptionContentRenderer';
