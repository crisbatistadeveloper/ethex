-- Ethex — busca manual: localização e mídia própria do imóvel

alter table imovel_encontrado
  add column latitude numeric,
  add column longitude numeric,
  add column endereco_texto text,
  add column midia_propria jsonb not null default '[]'::jsonb;

-- Bucket para fotos/vídeos tirados em visitas presenciais.
insert into storage.buckets (id, name, public)
values ('midia-imoveis', 'midia-imoveis', true)
on conflict (id) do nothing;

create policy "authenticated_insert_midia" on storage.objects
  for insert with check (bucket_id = 'midia-imoveis' and auth.role() = 'authenticated');

create policy "authenticated_delete_midia" on storage.objects
  for delete using (bucket_id = 'midia-imoveis' and auth.role() = 'authenticated');

create policy "public_read_midia" on storage.objects
  for select using (bucket_id = 'midia-imoveis');
