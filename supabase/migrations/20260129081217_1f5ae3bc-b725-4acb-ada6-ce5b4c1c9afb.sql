-- Create storage bucket for language audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'language-audio', 
  'language-audio', 
  true,
  52428800, -- 50MB limit
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/m4a', 'audio/x-m4a']
) ON CONFLICT (id) DO NOTHING;

-- RLS policies for language-audio bucket
CREATE POLICY "Anyone can view language audio files"
ON storage.objects FOR SELECT
USING (bucket_id = 'language-audio');

CREATE POLICY "Authenticated users can upload language audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'language-audio' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own language audio"
ON storage.objects FOR UPDATE
USING (bucket_id = 'language-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own language audio"
ON storage.objects FOR DELETE
USING (bucket_id = 'language-audio' AND auth.uid()::text = (storage.foldername(name))[1]);