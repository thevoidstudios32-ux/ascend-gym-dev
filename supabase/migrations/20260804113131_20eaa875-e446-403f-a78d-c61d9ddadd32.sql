
CREATE POLICY "Battle fotos: envia proprio arquivo"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'battle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Battle fotos: visiveis para autenticados"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'battle-photos');

CREATE POLICY "Battle fotos: apaga proprio arquivo"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'battle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Battle fotos: atualiza proprio arquivo"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'battle-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'battle-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
