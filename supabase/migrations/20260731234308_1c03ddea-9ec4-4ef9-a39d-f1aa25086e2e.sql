CREATE POLICY "own photos read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own photos insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own photos update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own photos delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);