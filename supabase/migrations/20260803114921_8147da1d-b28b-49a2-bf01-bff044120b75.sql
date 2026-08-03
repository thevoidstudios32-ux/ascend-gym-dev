CREATE POLICY "stories own upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "stories own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "stories read bros" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'stories' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.are_gym_bros(auth.uid(), ((storage.foldername(name))[1])::uuid)
  ));