-- Chat: replies and emoji reactions.
-- Safe to run more than once. Run in Supabase -> SQL Editor.

alter table public.messages
  add column if not exists reply_to uuid references public.messages(id) on delete set null;
alter table public.messages
  add column if not exists reactions jsonb not null default '{}'::jsonb;

-- One reaction per person per message. Participants may only change their own
-- reaction (never the message text), so this goes through a function instead
-- of a general UPDATE policy on messages.
create or replace function public.react_to_message(p_message_id uuid, p_emoji text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;
  if p_emoji is not null and char_length(p_emoji) > 16 then
    raise exception 'Invalid reaction';
  end if;
  if not exists (
    select 1 from public.messages m
    join public.threads t on t.id = m.thread_id
    where m.id = p_message_id and v_uid = any (t.participant_ids)
  ) then
    raise exception 'Not allowed';
  end if;
  if p_emoji is null or p_emoji = '' then
    update public.messages set reactions = reactions - v_uid::text where id = p_message_id;
  else
    update public.messages
      set reactions = jsonb_set(reactions, array[v_uid::text], to_jsonb(p_emoji), true)
      where id = p_message_id;
  end if;
end $$;

revoke all on function public.react_to_message(uuid, text) from public, anon;
grant execute on function public.react_to_message(uuid, text) to authenticated;

notify pgrst, 'reload schema';
