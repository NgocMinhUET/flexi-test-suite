import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  audioUrl: string;
  maxPlayCount?: number; // Maximum number of plays allowed (default: unlimited)
  audioDuration?: number; // Pre-known duration in seconds
  onPlayCountChange?: (count: number) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}

export const AudioPlayer = memo(({
  audioUrl,
  maxPlayCount = 0, // 0 = unlimited
  audioDuration,
  onPlayCountChange,
  disabled = false,
  className,
  compact = false,
}: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audioDuration || 0);
  const [playCount, setPlayCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isPlayLimitReached = maxPlayCount > 0 && playCount >= maxPlayCount;
  const remainingPlays = maxPlayCount > 0 ? maxPlayCount - playCount : null;

  // Format time in MM:SS
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Handle play/pause
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || disabled || isPlayLimitReached) return;

    if (isPlaying) {
      audio.pause();
    } else {
      // If starting a new play from the beginning
      if (audio.currentTime === 0 || audio.ended) {
        setPlayCount(prev => {
          const newCount = prev + 1;
          onPlayCountChange?.(newCount);
          return newCount;
        });
      }
      audio.play().catch(err => {
        console.error('Audio play error:', err);
        setError('Không thể phát audio');
      });
    }
  }, [isPlaying, disabled, isPlayLimitReached, onPlayCountChange]);

  // Handle restart
  const handleRestart = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || disabled || isPlayLimitReached) return;

    audio.currentTime = 0;
    setCurrentTime(0);
    
    // Count as a new play
    setPlayCount(prev => {
      const newCount = prev + 1;
      onPlayCountChange?.(newCount);
      return newCount;
    });
    
    audio.play().catch(err => {
      console.error('Audio play error:', err);
      setError('Không thể phát audio');
    });
  }, [disabled, isPlayLimitReached, onPlayCountChange]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Handle progress bar click
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || disabled) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percent = clickX / width;
    const newTime = percent * duration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration, disabled]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setIsLoading(false);
      setError('Lỗi tải audio');
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setError(null);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 p-2 bg-muted/50 rounded-lg border",
        isPlayLimitReached && "opacity-60",
        className
      )}>
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
        
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={togglePlay}
          disabled={disabled || isPlayLimitReached || isLoading}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1 min-w-0">
          <div
            className="h-1.5 bg-border rounded-full cursor-pointer overflow-hidden"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-primary transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {formatTime(currentTime)}
        </span>

        {remainingPlays !== null && (
          <Badge 
            variant={remainingPlays === 0 ? "destructive" : "secondary"}
            className="text-xs shrink-0"
          >
            {remainingPlays === 0 ? "Hết lượt" : `${remainingPlays} lượt`}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "p-4 bg-gradient-to-br from-muted/30 to-muted/50 rounded-xl border shadow-sm",
      isPlayLimitReached && "opacity-60",
      className
    )}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {error && (
        <div className="mb-3 p-2 bg-destructive/10 text-destructive text-sm rounded-lg text-center">
          {error}
        </div>
      )}

      {/* Progress bar */}
      <div
        className="relative h-2 bg-border rounded-full cursor-pointer overflow-hidden mb-3 group"
        onClick={handleProgressClick}
      >
        <div
          className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-100 group-hover:bg-primary/80"
          style={{ width: `${progressPercent}%` }}
        />
        {/* Hover indicator */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${progressPercent}% - 6px)` }}
        />
      </div>

      {/* Time display */}
      <div className="flex justify-between text-xs text-muted-foreground mb-4 tabular-nums">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Play/Pause button */}
          <Button
            size="lg"
            className={cn(
              "h-12 w-12 rounded-full",
              isPlaying && "bg-primary/90"
            )}
            onClick={togglePlay}
            disabled={disabled || isPlayLimitReached || isLoading}
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          {/* Restart button */}
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={handleRestart}
            disabled={disabled || isPlayLimitReached || isLoading}
            title="Nghe lại từ đầu"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          {/* Mute button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={toggleMute}
            disabled={disabled}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Play count indicator */}
        {maxPlayCount > 0 && (
          <div className="flex flex-col items-end">
            <Badge 
              variant={isPlayLimitReached ? "destructive" : "secondary"}
              className="mb-1"
            >
              {isPlayLimitReached ? (
                "Đã hết lượt nghe"
              ) : (
                `Còn ${remainingPlays} lượt nghe`
              )}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Đã nghe: {playCount}/{maxPlayCount}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

AudioPlayer.displayName = 'AudioPlayer';
