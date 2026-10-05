(() => {
  const PLAYABLE = new Set(["mp4", "m4v", "webm", "ogg", "ogv", "mov"]);

  const statsEl = document.getElementById("stats");
  const diskEl = document.getElementById("disk");
  const diskMeter = document.getElementById("disk-meter");
  const diskBar = document.getElementById("disk-bar");
  const diskLabel = document.getElementById("disk-label");
  const listEl = document.getElementById("list");
  const yearsEl = document.getElementById("years");
  const searchEl = document.getElementById("q");
  const statusEl = document.getElementById("status");
  const player = document.getElementById("player");
  const stageEmpty = document.getElementById("stage-empty");
  const fallback = document.getElementById("fallback");
  const nowEl = document.getElementById("now");
  const nowTitle = document.getElementById("now-title");
  const nowMeta = document.getElementById("now-meta");
  const nowNotes = document.getElementById("now-notes");
  const downloadEl = document.getElementById("download");

  const dateFormat = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  let items = [];
  let year = "all";
  let currentFile = "";

  function extension(file) {
    const base = file.split("/").pop() || "";
    const dot = base.lastIndexOf(".");
    return dot === -1 ? "" : base.slice(dot + 1).toLowerCase();
  }

  function mediaUrl(file) {
    return "/media/" + file.split("/").map(encodeURIComponent).join("/");
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    const digits = value >= 10 || unit === 0 ? 0 : 1;
    return `${value.toFixed(digits)} ${units[unit]}`;
  }

  function formatDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return "";
    const total = Math.round(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  }

  function formatDate(iso) {
    if (!iso) return "Undated";
    const parsed = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return iso;
    return dateFormat.format(parsed);
  }

  function itemYear(item) {
    return typeof item.date === "string" && item.date.length >= 4 ? item.date.slice(0, 4) : "";
  }

  function matches(item) {
    if (year !== "all" && itemYear(item) !== year) return false;
    const query = searchEl.value.trim().toLowerCase();
    if (!query) return true;
    const haystack = [item.title, item.venue, item.notes, item.file, item.date]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  }

  function showMessage(text) {
    statsEl.textContent = text;
    listEl.replaceChildren();
    yearsEl.replaceChildren();
  }

  function renderDisk(disk) {
    if (!disk || !Number.isFinite(disk.total) || disk.total <= 0) {
      diskEl.hidden = true;
      return;
    }
    const usedPct = Math.min(100, Math.max(0, (disk.used / disk.total) * 100));
    diskEl.hidden = false;
    diskBar.style.width = `${usedPct}%`;
    diskMeter.setAttribute("aria-valuenow", String(Math.round(usedPct)));
    diskMeter.classList.toggle("tight", disk.free / disk.total < 0.1);
    diskLabel.textContent = `${formatBytes(disk.free)} free of ${formatBytes(disk.total)}`;
  }

  function renderYears() {
    const found = new Set();
    items.forEach((item) => {
      const value = itemYear(item);
      if (value) found.add(value);
    });
    const options = ["all", ...Array.from(found).sort((a, b) => b.localeCompare(a))];
    if (!options.includes(year)) year = "all";
    yearsEl.replaceChildren();
    options.forEach((value) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "year";
      button.textContent = value === "all" ? "All" : value;
      button.setAttribute("aria-pressed", value === year ? "true" : "false");
      button.addEventListener("click", () => {
        year = value;
        renderList();
      });
      yearsEl.appendChild(button);
    });
  }

  function details(item) {
    const parts = [];
    if (item.venue) parts.push(item.venue);
    const size = formatBytes(item.bytes);
    if (size) parts.push(size);
    const duration = formatDuration(item.duration);
    if (duration) parts.push(duration);
    return parts.join(" · ");
  }

  function selectItem(item) {
    currentFile = item.file;
    stageEmpty.hidden = true;
    nowEl.hidden = false;
    nowTitle.textContent = item.title || item.file;
    nowMeta.textContent = [formatDate(item.date), details(item)].filter(Boolean).join(" · ");
    nowNotes.hidden = !item.notes;
    nowNotes.textContent = item.notes || "";
    const url = mediaUrl(item.file);
    downloadEl.href = url;
    downloadEl.setAttribute("download", item.file.split("/").pop() || "recording");
    fallback.hidden = true;
    if (PLAYABLE.has(extension(item.file))) {
      player.hidden = false;
      player.src = url;
    } else {
      player.hidden = true;
      player.removeAttribute("src");
      player.load();
      fallback.hidden = false;
      fallback.textContent = "This format will not play in the browser. Download it and open it locally.";
    }
    renderList();
  }

  function renderList() {
    const visible = items.filter(matches);
    const totalBytes = items.reduce((sum, item) => sum + (Number(item.bytes) || 0), 0);
    statsEl.textContent = `${items.length} recording${items.length === 1 ? "" : "s"} · ${formatBytes(totalBytes)}`;
    statusEl.hidden = visible.length > 0;
    statusEl.textContent = items.length === 0
      ? "No recordings yet."
      : "Nothing matches that search.";
    listEl.replaceChildren();
    visible.forEach((item) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "row";
      button.setAttribute("aria-pressed", item.file === currentFile ? "true" : "false");
      const date = document.createElement("span");
      date.className = "row-date";
      date.textContent = formatDate(item.date);
      const body = document.createElement("span");
      const title = document.createElement("span");
      title.className = "row-title";
      title.textContent = item.title || item.file;
      const meta = document.createElement("span");
      meta.className = "row-meta";
      meta.textContent = details(item);
      body.append(title, meta);
      button.append(date, body);
      button.addEventListener("click", () => selectItem(item));
      li.appendChild(button);
      listEl.appendChild(li);
    });
    renderYears();
  }

  player.addEventListener("error", () => {
    if (!player.getAttribute("src")) return;
    player.hidden = true;
    fallback.hidden = false;
    fallback.textContent = "This recording will not play in this browser. Download it and open it locally.";
  });

  searchEl.addEventListener("input", () => renderList());

  fetch("/catalog.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
      return response.json();
    })
    .then((catalog) => {
      items = Array.isArray(catalog.items)
        ? catalog.items.filter((item) => item && typeof item.file === "string" && !item.file.includes(".."))
        : [];
      renderDisk(catalog.disk);
      renderList();
    })
    .catch(() => {
      showMessage("The catalog is not on the server yet.");
      statusEl.hidden = false;
      statusEl.textContent = "Copy the recordings onto the disk, then rebuild the catalog. The site should ask for a password before it opens.";
    });
})();
