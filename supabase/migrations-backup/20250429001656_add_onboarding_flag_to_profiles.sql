alter table public.profiles
add column if not exists has_completed_onboarding boolean not null default false;
