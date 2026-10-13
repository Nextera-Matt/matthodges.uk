<div align="center">

# 🌐 matthodges.uk

**Personal portfolio site, private gig archive, and self-hosted services — deployed by a real CI/CD pipeline.**

[![Live Site](https://img.shields.io/badge/live-matthodges.uk-4a9c6a?style=for-the-badge)](https://matthodges.uk)
[![Deploy](https://img.shields.io/badge/deploy-GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](.github/workflows/deploy.yml)
[![Docker](https://img.shields.io/badge/contact_API-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](services/contact-api)

</div>

---

## 🎯 What this is

The source for [matthodges.uk](https://matthodges.uk) — a self-hosted setup covering the portfolio site itself, a private gig archive, a contact form handler, and the pipeline that builds, tests, and deploys all of it to a personal VPS on every push to `main`.

## ✨ Site experience

The portfolio pages are static HTML/CSS/JS with no framework, layered with progressive enhancement:

- **Flow-field hero** (`js/flow3d.js`) — a Three.js canvas behind the hero, loaded via importmap with a CSS fallback if WebGL or the CDN fails.
- **Ops HUD** (`js/hud.js`) — terminal-style boot preloader plus a status bar showing session uptime, 3D state, and the current section. Everything shown is real local state.
- **Motion system** (`js/motion.js`) — scroll progress, 3D card tilt (fine pointers only), scroll reveals, and a two-way link between the interactive terminal (`js/main.js`) and the 3D scene.
- All motion respects `prefers-reduced-motion`.

## 🏗️ Structure

```
.
├── index.html, cv.html, services.html    # Portfolio pages
├── projects/                             # Project detail pages
├── tools/                                # Browser-based ops tools
├── css/, js/                             # Shared styles and scripts
├── files/, images/                       # CV PDF + generator, images
├── services/contact-api/                 # FastAPI contact form handler (Dockerised)
├── services/support-dashboard-demo/      # Demo support dashboard (Dockerised)
├── services/gigs/                        # Private gig archive (own vhost, see its README)
└── .github/workflows/deploy.yml          # CI/CD pipeline
```

## 🚀 Pipeline

```
push to main
     │
     ├─▶ build contact-api + dashboard-demo images ──▶ push to GHCR
     │
     ▼
stamp last-updated dates, then rsync to VPS
     │
     ├─▶ static site ───────────────▶ /var/www/matthodges.uk/
     ├─▶ gig archive frontend ──────▶ /var/www/gigs.matthodges.uk/
     ├─▶ gig archive tools ─────────▶ /home/rocky/gigs/
     └─▶ contact-api compose file ──▶ /home/rocky/contact-api/
     │
     ▼
pull images + restart containers on VPS
```

nginx on the VPS serves the static files directly and reverse-proxies `/api/contact` to the containerised handler, which only listens on localhost. The gig archive is a separate password-protected vhost.

## 🛠️ Stack

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" />
  <img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/nginx-009639?style=for-the-badge&logo=nginx&logoColor=white" />
  <img src="https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" />
</p>

## 📄 License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

**[Matt Hodges](https://matthodges.uk)** · [GitHub](https://github.com/Nextera-Matt) · [LinkedIn](https://www.linkedin.com/in/matt-hodges-7b0642192/)

</div>
