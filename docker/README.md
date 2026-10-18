# Local Docker development

The app and Supabase backend run locally in Docker. You do not need Node.js, Supabase CLI, or a hosted Supabase project on the development machine.

## Install and start

From the project root, run:

```bash
./docker/install.sh
```

The script checks Docker and Compose, offers to install them on Debian/Ubuntu if missing, generates local Supabase secrets, asks which host name or IP devices should use, starts and waits for Supabase (including Storage), applies the app migrations once, then starts the app.

Press Enter at the host prompt to use the app on the development computer only. To test from other devices, enter a LAN DNS name or IP address that those devices can reach. A DNS name with both IPv4 and IPv6 records is easiest for a mixed network. The host firewall must allow TCP ports **3000** (app) and **8000** (Supabase API/Studio).

When installation completes, the script prints the app and Supabase addresses. The generated local configuration and keys are stored in `docker/supabase/.env`; keep that file private. If a migration fails or the installer finds a partial database, it stops and explains how to reset the local development database before retrying.

## Everyday commands

```bash
(cd docker/supabase && sh run.sh status)
(cd docker/supabase && sh run.sh logs)
(cd docker/supabase && sh run.sh stop)
(cd docker/supabase && sh run.sh start)
```

The official Supabase Docker Compose files are vendored under [`supabase/`](./supabase/) from revision `7425d49`. Update those files together from an official self-hosted release rather than changing service image tags individually.
