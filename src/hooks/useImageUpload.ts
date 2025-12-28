import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UploadResult {
  url: string;
  path: string;
}

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = async (file: File): Promise<UploadResult | null> => {
    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ được upload file hình ảnh');
      return null;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Kích thước file không được vượt quá 5MB');
      return null;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Bạn cần đăng nhập để upload hình ảnh');
        return null;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('question-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        toast.error('Lỗi khi upload hình ảnh');
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('question-images')
        .getPublicUrl(data.path);

      return {
        url: publicUrl,
        path: data.path,
      };
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Lỗi khi upload hình ảnh');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const uploadFromClipboard = async (clipboardData: DataTransfer): Promise<UploadResult | null> => {
    const items = clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          return await uploadImage(file);
        }
      }
    }
    return null;
  };

  const deleteImage = async (path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from('question-images')
        .remove([path]);

      if (error) {
        console.error('Delete error:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  };

  return {
    uploadImage,
    uploadFromClipboard,
    deleteImage,
    isUploading,
  };
}
