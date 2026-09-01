-- Users created straight from SQL leave these columns NULL, and GoTrue reads
-- them into non-nullable Go strings: the token endpoint then answers
-- `500 Database error querying schema` and the login form only sees an
-- unexpected error.
--
-- Applies to the seeded demo user. Real users should be created through the
-- admin API once the invitation flow exists.

update auth.users
set confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change = coalesce(email_change, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    phone_change = coalesce(phone_change, ''),
    phone_change_token = coalesce(phone_change_token, ''),
    reauthentication_token = coalesce(reauthentication_token, '')
where confirmation_token is null
   or recovery_token is null
   or email_change is null
   or email_change_token_new is null;
