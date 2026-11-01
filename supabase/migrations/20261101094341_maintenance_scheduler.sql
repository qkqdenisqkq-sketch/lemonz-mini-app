create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Generate and encrypt the scheduler credential inside Supabase. Never put
-- its value in this migration or in cron.job.command. Copy it to the Vercel
-- production CRON_SECRET through a secure administrative channel.
select vault.create_secret(
    encode(extensions.gen_random_bytes(32), 'hex'),
    'lemonz_cron_secret',
    'LEMONZ production maintenance endpoint'
)
where not exists (select 1 from vault.secrets where name = 'lemonz_cron_secret');

select cron.schedule(
    'lemonz-maintenance',
    '*/5 * * * *',
    $job$
    select net.http_get(
        url := 'https://lemonz-mini-app.vercel.app/api/cron',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || (
                select decrypted_secret from vault.decrypted_secrets
                where name = 'lemonz_cron_secret'
            )
        ),
        timeout_milliseconds := 30000
    );
    $job$
);
