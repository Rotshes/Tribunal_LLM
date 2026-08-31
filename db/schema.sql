-- The Tribunal — Supabase / Postgres schema
--
-- Run this once in the Supabase SQL editor. It is idempotent enough to re-run:
-- every create is IF NOT EXISTS.
--
-- THE MOST IMPORTANT PROPERTY OF THIS FILE IS A COLUMN THAT DOES NOT EXIST.
-- There is nowhere in this schema to store a combined, majority, averaged or
-- scored result derived from the three rulings. That is not an omission and it
-- is not a TODO. It is the cheapest possible enforcement of the fixed course
-- specification: not a check that catches an aggregation, but a shape with
-- nowhere to put one. docs/decisions/0002-verdicts-are-never-combined.md
--
-- Field names match src/log.js and src/persist.js exactly, because those wrote
-- to files first specifically so that moving to a database would be a change of
-- destination and not of shape.

-- ---------------------------------------------------------------- cases

create table if not exists charge_sheets (
  case_id         text primary key,
  title           text        not null,
  fictional       boolean     not null default true,
  accused         text        not null,
  affected_party  text        not null,
  act_alleged     text        not null,
  background      text        not null,
  agreed_facts    jsonb       not null,   -- ORDER IS SIGNIFICANT AND PERMANENT
  issue           text        not null,
  scope           jsonb       not null,
  representatives jsonb       not null,   -- exactly 4, exactly 2 per seat (G1)
  provenance      jsonb       not null,
  created_at      timestamptz not null default now(),

  constraint charge_sheets_fictional_only check (fictional = true),
  constraint charge_sheets_never_combines check ((scope->>'combines_opinions')::boolean = false),
  constraint charge_sheets_never_sentences check ((scope->>'imposes_sentence')::boolean = false)
);

comment on column charge_sheets.agreed_facts is
  'Order is permanent. Opinions cite facts by zero-based index into this array; '
  'reordering or deleting an entry silently invalidates every opinion already '
  'stored against the case. A correction appends.';

-- ---------------------------------------------------------------- runs

create table if not exists deliberations (
  deliberation_id uuid primary key,
  case_id         text        not null references charge_sheets(case_id),
  ran_at          timestamptz not null default now(),
  status          text        not null,
  provider        text,
  json_mode       text,
  model           text,
  model_map       jsonb,   -- per-role allocation; `model` alone lies on a mixed run
  temperature     real,

  -- Two different measurements, kept apart because conflating them cost a
  -- session. wall_ms is what a person waited. model_time_ms is the SUM of the
  -- seven call latencies, which concurrency does not change. Reading the second
  -- as the first made a working fix look ineffective.
  wall_ms         integer,
  model_time_ms   integer,
  calls_attempted integer,
  calls_succeeded integer,
  tokens_in       integer,
  tokens_out      integer,
  gate_problems   jsonb       not null default '[]'::jsonb,
  cap_error       text,
  reported        jsonb,
  case_snapshot   jsonb       not null,   -- the facts as they stood at run time

  constraint deliberations_status check (status in ('complete', 'partial', 'failed'))
);

-- For a database created before turn 008, when the picker was added:
alter table deliberations add column if not exists model_map jsonb;

-- For a database created before turn 009, when app runs became observable:
alter table deliberations add column if not exists wall_ms         integer;
alter table deliberations add column if not exists model_time_ms   integer;
alter table deliberations add column if not exists calls_attempted integer;
alter table deliberations add column if not exists calls_succeeded integer;
alter table deliberations add column if not exists tokens_in       integer;
alter table deliberations add column if not exists tokens_out      integer;

comment on column deliberations.model_map is
  'The model used for each of the seven roles. A single `model` column is wrong '
  'the moment two roles differ, and anything grouping runs by it would compare '
  'things that are not comparable.';

comment on table deliberations is
  'A run. NOTE: there is deliberately no column for a combined result. The three '
  'rulings live in `opinions` as three peers and are reported side by side. If a '
  'migration ever proposes adding one, that migration is the defect.';

-- ---------------------------------------------------------------- opinions

create table if not exists opinions (
  id                bigserial primary key,
  deliberation_id   uuid        not null references deliberations(deliberation_id) on delete cascade,
  case_id           text        not null,
  role              text        not null,

  -- advocate
  representative_id text,
  seat              text,
  position          text,
  case_for_seat     text,
  key_points        jsonb,
  concedes          jsonb,
  argument          text,

  -- judge
  judge_id          text,
  method            text,
  ruling            text,
  grounds           jsonb,
  responds_to       jsonb,
  reasoning         text,
  disclaimer        text,

  -- both
  relies_on_facts   jsonb       not null,
  model_id          text        not null,
  prompt_version    text        not null,
  prompt_sha256     text        not null,
  created_at        timestamptz not null default now(),

  constraint opinions_role check (role in ('advocate', 'judge')),
  constraint opinions_ruling check (ruling is null or ruling in ('justified', 'not_justified')),
  constraint opinions_position check (position is null or position in ('justified', 'not_justified', 'mixed')),
  constraint opinions_seat check (seat is null or seat in ('defense', 'prosecution')),

  -- An advocate must carry the case for its seat. Turn 005: without it the
  -- unpopular side went unargued in three runs of five.
  constraint opinions_advocate_shape check (
    role <> 'advocate' or (representative_id is not null and seat is not null
      and position is not null and case_for_seat is not null and argument is not null)
  ),
  constraint opinions_judge_shape check (
    role <> 'judge' or (judge_id is not null and ruling is not null
      and grounds is not null and reasoning is not null and disclaimer is not null)
  )
);

comment on column opinions.position is
  'The advocate''s own conclusion. MAY contradict its seat and its own '
  'case_for_seat. No constraint ties them: decision 0004 fixes the procedural '
  'role only, and a check requiring agreement would enforce the opposite of the '
  'specification while looking like data integrity.';

create index if not exists opinions_by_deliberation on opinions (deliberation_id);
create index if not exists opinions_by_case_role on opinions (case_id, role);

-- ---------------------------------------------------------------- every call

create table if not exists model_calls (
  id              bigserial primary key,
  deliberation_id uuid        not null references deliberations(deliberation_id) on delete cascade,
  case_id         text        not null,
  role            text        not null,
  role_id         text        not null,
  model           text,
  prompt_version  text,
  prompt_sha256   text,
  succeeded       boolean     not null,
  failure_reason  text,
  tokens_in       integer,
  tokens_out      integer,
  cost            numeric,
  latency_ms      integer,
  ts              timestamptz not null default now()
);

comment on table model_calls is
  'One row per call ATTEMPTED, including the ones that failed. The failures are '
  'the interesting rows: without them the failure rate is unknowable. '
  'docs/decisions/0001-log-every-model-call.md';

create index if not exists model_calls_by_deliberation on model_calls (deliberation_id);
create index if not exists model_calls_failures on model_calls (succeeded) where succeeded = false;

-- ---------------------------------------------------------------- access

-- RLS on, no policies. Nothing reaches these tables except through the backend
-- using the SECRET key, which bypasses RLS. The browser never holds a key that
-- can read or write here.
--
-- The public read-only view now exists — GET /api/runs, turn 011 — and it
-- still has no policies, deliberately. A policy grants a whole table including
-- columns added to it later; the function grants the projection it selects.
-- The reasoning, and what it was chosen over, is in
-- docs/decisions/0010-reads-go-through-the-backend-and-rls-stays-closed.md.
--
-- So: adding a policy here is not a small convenience. It is reopening 0010.

alter table charge_sheets enable row level security;
alter table deliberations enable row level security;
alter table opinions      enable row level security;
alter table model_calls   enable row level security;
