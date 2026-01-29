import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Music, Loader2, Volume2 } from "lucide-react";

interface AudioUploaderProps {
  value?: string;
  onChange: (url: string | undefined, duration?: number) => void;
  onDurationChange?: (duration: number) => void;
  disabled?: boolean;
}

export function AudioUploader({ 
  value, 
  onChange, 
  onDurationChange,
  disabled 
}: AudioUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/m4a', 'audio/x-m4a'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Lỗi",
        description: "Chỉ hỗ trợ file audio (MP3, WAV, OGG, WebM, M4A)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 52428800) {
      toast({
        title: "Lỗi",
        description: "File quá lớn. Tối đa 50MB.",
        variant: "destructive",
      });
      return;
    }

    // Get audio duration
    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    
    audio.onloadedmetadata = async () => {
      const duration = Math.round(audio.duration);
      setAudioDuration(duration);
      onDurationChange?.(duration);
      URL.revokeObjectURL(audio.src);
      
      // Upload file
      await uploadFile(file, duration);
    };

    audio.onerror = () => {
      toast({
        title: "Lỗi",
        description: "Không thể đọc file audio",
        variant: "destructive",
      });
      URL.revokeObjectURL(audio.src);
    };
  };

  const uploadFile = async (file: File, duration: number) => {
    setUploading(true);
    setProgress(0);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Chưa đăng nhập");

      const fileExt = file.name.split('.').pop();
      const fileName = `${userData.user.id}/${Date.now()}.${fileExt}`;

      // Simulate progress (Supabase doesn't provide upload progress)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { data, error } = await supabase.storage
        .from('language-audio')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      clearInterval(progressInterval);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('language-audio')
        .getPublicUrl(data.path);

      setProgress(100);
      onChange(urlData.publicUrl, duration);
      
      toast({
        title: "Thành công",
        description: "Đã upload file audio",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Lỗi upload",
        description: error instanceof Error ? error.message : "Không thể upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!value) return;

    try {
      // Extract path from URL
      const url = new URL(value);
      const pathParts = url.pathname.split('/storage/v1/object/public/language-audio/');
      if (pathParts.length > 1) {
        await supabase.storage
          .from('language-audio')
          .remove([pathParts[1]]);
      }
    } catch (error) {
      console.error('Error removing file:', error);
    }

    onChange(undefined);
    setAudioDuration(null);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      <Label>File Audio</Label>
      
      {value ? (
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Audio đã upload</span>
              {audioDuration && (
                <span className="text-xs text-muted-foreground">
                  ({formatDuration(audioDuration)})
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <audio 
            ref={audioRef}
            src={value} 
            controls 
            className="w-full h-10"
            onLoadedMetadata={(e) => {
              const duration = Math.round(e.currentTarget.duration);
              if (!audioDuration) {
                setAudioDuration(duration);
                onDurationChange?.(duration);
              }
            }}
          />
        </div>
      ) : (
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-colors hover:border-primary/50 hover:bg-muted/30
            ${uploading ? 'pointer-events-none opacity-50' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        >
          {uploading ? (
            <div className="space-y-3">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Đang upload...</p>
              <Progress value={progress} className="w-full max-w-xs mx-auto" />
            </div>
          ) : (
            <>
              <Volume2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Nhấp để chọn file audio
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                MP3, WAV, OGG, WebM, M4A (tối đa 50MB)
              </p>
            </>
          )}
        </div>
      )}

      <Input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
      />
    </div>
  );
}
