-- ========== documentos ==========
create table public.documentos (
  id             uuid        primary key default gen_random_uuid(),
  chamada_id     uuid        not null references public.chamadas(id) on delete cascade,
  nome_arquivo   text        not null,
  tipo_mime      text        not null,
  tamanho_bytes  integer     not null,
  storage_path   text        not null,
  conteudo_texto text,
  created_at     timestamptz not null default now()
);

create index documentos_chamada_id_idx on public.documentos(chamada_id);

alter table public.documentos enable row level security;

create policy "documentos_select_own" on public.documentos
  for select using (
    exists (
      select 1 from public.chamadas
      where chamadas.id = documentos.chamada_id
        and chamadas.user_id = (select auth.uid())
    )
  );
create policy "documentos_insert_own" on public.documentos
  for insert with check (
    exists (
      select 1 from public.chamadas
      where chamadas.id = documentos.chamada_id
        and chamadas.user_id = (select auth.uid())
    )
  );
create policy "documentos_delete_own" on public.documentos
  for delete using (
    exists (
      select 1 from public.chamadas
      where chamadas.id = documentos.chamada_id
        and chamadas.user_id = (select auth.uid())
    )
  );
