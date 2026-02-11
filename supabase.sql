create table if not exists public.activity_logs (
  id bigserial primary key,
  action text not null,
  description text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_logs_created_at
  on public.activity_logs (created_at desc);

