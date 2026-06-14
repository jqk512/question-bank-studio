-- Add display_number to questions.
-- sequence is now a unique per-bank parse-order index; display_number keeps the
-- original question number shown in the source so the UI and continuity checks
-- still reflect what the user wrote. Existing rows fall back to sequence.

alter table public.questions
  add column if not exists display_number integer;

update public.questions
  set display_number = sequence
  where display_number is null;
