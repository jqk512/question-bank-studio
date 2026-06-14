update public.registration_invites
set max_uses = greatest(max_uses, 15)
where code_hash = '73d0d409b252d8db21c6fe5b13fd04e92ab49dc522d82f0f1bed5f58b3ce028f';
