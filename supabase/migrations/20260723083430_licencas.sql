-- Estado remoto das licencas do Maqo: permite revogar uma chave ja entregue.
-- A chave em si (assinatura Ed25519) so prova quem a emitiu; esta tabela e que
-- diz se ainda deve ser aceite.
create table if not exists public.licencas (
  id text primary key,                 -- mesmo id de 8 chars gerado em emitir-licenca.mjs
  nome text not null,
  emitida date not null,
  expira date,
  notas text,
  revogada boolean not null default false,
  revogada_em timestamptz,
  device_id text,                      -- id da primeira maquina a ativar esta chave
  ultima_verificacao timestamptz,
  criada_em timestamptz not null default now()
);

comment on table public.licencas is
  'Estado remoto das licencas emitidas para o Maqo. A Edge Function verificar-licenca e a unica consumidora (via service role); o RLS abaixo bloqueia qualquer acesso direto com a anon key da app.';

alter table public.licencas enable row level security;
-- Sem policies: por omissao ninguem (anon/authenticated) le ou escreve.
-- Só a service role (usada dentro da Edge Function e no script de emissao) contorna o RLS.
