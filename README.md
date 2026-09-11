<div align="center">

# 🌐 matthodges.uk

**Personal portfolio site — static frontend, self-hosted contact API, and a real CI/CD pipeline deploying both.**

[![Live Site](https://img.shields.io/badge/live-matthodges.uk-4a9c6a?style=for-the-badge)](https://matthodges.uk)
[![Deploy](https://img.shields.io/badge/deploy-GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](.github/workflows/deploy.yml)
[![Docker](https://img.shields.io/badge/contact_API-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](services/contact-api)

</div>

---

## 🎯 What this is

The source for [matthodges.uk](https://matthodges.uk) — a static HTML/CSS/JS site, plus a small self-hosted contact form handler and the pipeline that builds, tests, and deploys both to a personal VPS on every push to `main`.

## 🏗️ Structure

```
.
├── index.html, cv.html, services.html    # Static pages
├── projects/                             # Project detail pages
├── css/, js/                             # Shared styles and scripts
├── services/contact-api/                 # FastAPI contact form handler (Dockerised)
└── .github/workflows/deploy.yml          # CI/CD pipeline
```

## 🚀 Pipeline

```
push to main
     │
     ▼
build contact-api Docker image ──▶ push to GHCR
     │
     ▼
rsync static site + docker-compose.yml to VPS
     │
     ▼
pull image + restart container on VPS
```

nginx on the VPS serves the static files directly and reverse-proxies `/api/contact` to the containerised handler, which only listens on localhost.

## 🛠️ Stack

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" />
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
