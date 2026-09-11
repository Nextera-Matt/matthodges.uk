# contact-api

Small FastAPI service that handles the portfolio site's contact form.
Self-hosted rather than Formspree - relays mail via Gmail SMTP, has a
honeypot field and basic per-IP rate limiting.

## How it deploys

On every push to `main`, `.github/workflows/deploy.yml`:
1. Builds this service into a Docker image, pushes to `ghcr.io/nextera-matt/matthodges-contact`
2. Rsyncs the static site to `/var/www/matthodges.uk` on the VPS
3. Rsyncs `docker-compose.yml` to `/home/rocky/contact-api/` on the VPS
4. SSHes in as `rocky` and runs `docker compose pull && docker compose up -d`

nginx (on the host, not containerized) proxies `/api/contact` to the
container on `127.0.0.1:8091` - see `nginx-snippet.conf`.

## One-time VPS setup (not automated - do this manually)

1. Install Docker + compose plugin (Rocky Linux):
   ```
   sudo dnf install -y dnf-plugins-core
   sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
   sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
   sudo systemctl enable --now docker
   sudo usermod -aG docker rocky
   ```
   Log out/in (or `newgrp docker`) for the group change to apply.

2. Create the deploy directory and real `.env` (copy `.env.example`, fill in
   a Gmail **App Password** - not your normal password - from
   Google Account → Security → App Passwords, requires 2FA enabled):
   ```
   mkdir -p /home/rocky/contact-api
   cp services/contact-api/.env.example /home/rocky/contact-api/.env
   chmod 600 /home/rocky/contact-api/.env
   # edit it with real values
   ```

3. Add the nginx block from `nginx-snippet.conf`, then:
   ```
   sudo nginx -t && sudo systemctl reload nginx
   ```

4. Generate a dedicated SSH deploy keypair (don't reuse your personal key):
   ```
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key -N ""
   ```
   Append `deploy_key.pub` to `/home/rocky/.ssh/authorized_keys` on the VPS.
   Add `deploy_key` (the private key) as a GitHub Actions secret.

5. GitHub repo secrets needed (Settings → Secrets and variables → Actions):
   - `VPS_HOST` - the VPS IP or hostname
   - `VPS_USER` - `rocky`
   - `VPS_SSH_KEY` - contents of the private deploy key from step 4

   `GITHUB_TOKEN` (used for GHCR push) is automatic, no setup needed.

6. First deploy will push an image to GHCR under this repo. By default
   GHCR packages inherit private visibility - either make the package
   public (Package settings → Change visibility, fine here since no
   secrets are baked into the image), or `docker login ghcr.io` once on
   the VPS with a `read:packages`-scoped token so it can pull.

## If it breaks

- `docker compose logs contact-api` on the VPS for runtime errors
- `docker compose ps` to check it's actually running
- Health check: `curl http://127.0.0.1:8091/health` from the VPS
- Fallback if the service is down: the contact form will show a "Something
  went wrong" error client-side, site otherwise keeps working normally -
  this is deliberately isolated from the static site.
