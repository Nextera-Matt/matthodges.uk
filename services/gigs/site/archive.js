(() => {
  const PLAYABLE = new Set(["mp4", "m4v", "webm", "ogg", "ogv", "mov"]);

  const statsEl = document.getElementById("stats");
  const diskEl = document.getElementById("disk");
  const diskMeter = document.getElementById("disk-meter");
  const diskBar = document.getElementById("disk-bar");
  const diskLabel = document.getElementById("disk-label");
  const railEl = document.getElementById("rail");
  const listEl = document.getElementById("list");
  const yearsEl = document.getElementById("years");
  const searchEl = document.getElementById("q");
  const statusEl = document.getElementById("status");
  const stage = document.getElementById("stage");
  const player = document.getElementById("player");
  const stageEmpty = document.getElementById("stage-empty");
  const stageCopy = document.getElementById("stage-copy");
  const timecode = document.getElementById("timecode");
  const fallback = document.getElementById("fallback");
  const nowEl = document.getElementById("now");
  const nowTitle = document.getElementById("now-title");
  const nowMeta = document.getElementById("now-meta");
  const nowNotes = document.getElementById("now-notes");
  const downloadEl = document.getElementById("download");
  const editToggle = document.getElementById("edit-toggle");
  const editor = document.getElementById("editor");
  const editTitle = document.getElementById("edit-title");
  const editDate = document.getElementById("edit-date");
  const editVenue = document.getElementById("edit-venue");
  const editName = document.getElementById("edit-name");
  const editNotes = document.getElementById("edit-notes");
  const editSave = document.getElementById("edit-save");
  const editCancel = document.getElementById("edit-cancel");
  const editorError = document.getElementById("editor-error");

  const dateFormat = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const monthFormat = new Intl.DateTimeFormat("en-GB", { month: "short" });
  const phoneQuery = window.matchMedia("(max-width: 800px)");

  let items = [];
  let year = "all";
  let currentFile = "";
  let animateList = true;
  let openedDate = "";
  let openedName = "";

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

  function formatClock(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const body = `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    return hours > 0 ? `${hours}:${body}` : body;
  }

  function formatDate(iso) {
    if (!iso) return "Undated";
    const parsed = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return iso;
    return dateFormat.format(parsed);
  }

  function dateParts(iso) {
    if (!iso) return null;
    const parsed = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return {
      day: String(parsed.getDate()),
      mon: monthFormat.format(parsed),
      year: String(parsed.getFullYear()),
    };
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
    stageCopy.textContent = "Nothing to play yet.";
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
        animateList = true;
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

  function rowMeta(item) {
    const parts = [];
    if (item.venue) parts.push(item.venue);
    const size = formatBytes(item.bytes);
    if (size) parts.push(size);
    return parts.join(" · ");
  }

  function setPlaying(on) {
    document.body.classList.toggle("is-playing", on);
  }

  function paintTimecode() {
    if (player.hidden || !player.getAttribute("src")) {
      timecode.hidden = true;
      return;
    }
    const now = formatClock(player.currentTime);
    const end = Number.isFinite(player.duration) && player.duration > 0
      ? formatClock(player.duration)
      : "";
    timecode.hidden = false;
    timecode.textContent = end ? `${now} / ${end}` : now;
  }

  function paintNow(item) {
    nowTitle.textContent = item.title || item.file;
    nowMeta.textContent = [formatDate(item.date), details(item)].filter(Boolean).join(" · ");
    nowNotes.hidden = !item.notes;
    nowNotes.textContent = item.notes || "";
    const url = mediaUrl(item.file);
    downloadEl.href = url;
    downloadEl.setAttribute("download", item.file.split("/").pop() || "recording");
  }

  function loadMedia(item) {
    fallback.hidden = true;
    timecode.hidden = true;
    setPlaying(false);
    if (PLAYABLE.has(extension(item.file))) {
      player.hidden = false;
      player.classList.remove("swap");
      void player.offsetWidth;
      player.classList.add("swap");
      player.src = mediaUrl(item.file);
    } else {
      player.hidden = true;
      player.removeAttribute("src");
      player.load();
      fallback.hidden = false;
      fallback.textContent = "This format will not play in the browser. Download it and open it locally.";
    }
  }

  function closeEditor() {
    editor.hidden = true;
    editorError.hidden = true;
    editToggle.setAttribute("aria-expanded", "false");
    editSave.disabled = false;
  }

  function openEditor() {
    const item = items.find((entry) => entry.file === currentFile);
    if (!item) return;
    editTitle.value = item.title || "";
    editDate.value = item.date || "";
    editVenue.value = item.venue || "";
    editNotes.value = item.notes || "";
    openedDate = item.date || "";
    openedName = item.file.split("/").pop() || "";
    editName.value = openedName;
    delete editName.dataset.touched;
    editorError.hidden = true;
    editor.hidden = false;
    editToggle.setAttribute("aria-expanded", "true");
    editTitle.focus();
  }

  function syncNameToDate() {
    if (editName.dataset.touched === "true") return;
    if (!openedDate || !openedName.startsWith(openedDate)) return;
    const rest = openedName.slice(openedDate.length);
    if (editDate.value) {
      editName.value = editDate.value + rest;
      return;
    }
    editName.value = rest.replace(/^[ _]/, "");
  }

  function sortItems() {
    items.sort((a, b) => (a.title || "").localeCompare(b.title || "", "en"));
    items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }

  function selectItem(item, options = {}) {
    const fileChanged = item.file !== currentFile;
    currentFile = item.file;
    closeEditor();
    document.body.classList.add("has-selection");
    stageEmpty.hidden = true;
    nowEl.hidden = false;
    if (fileChanged) {
      nowEl.classList.remove("arrive");
      void nowEl.offsetWidth;
      nowEl.classList.add("arrive");
    }
    paintNow(item);
    if (fileChanged) loadMedia(item);
    renderList();
    if (options.keepPlace) return;
    if (phoneQuery.matches) {
      stage.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (options.scrollList) {
      listEl.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: "nearest" });
    }
  }

  function replaceItem(previousFile, item) {
    items = items.filter((entry) => entry.file !== previousFile && entry.file !== item.file);
    items.push(item);
    sortItems();
    selectItem(item, { keepPlace: true });
  }

  function renderList() {
    const scrollTop = railEl.scrollTop;
    const visible = items.filter(matches);
    const totalBytes = items.reduce((sum, item) => sum + (Number(item.bytes) || 0), 0);
    const filtering = year !== "all" || searchEl.value.trim() !== "";
    if (items.length === 0) {
      statsEl.textContent = "No recordings yet";
      stageCopy.textContent = "Nothing to play yet.";
    } else if (filtering) {
      statsEl.textContent = `${visible.length} of ${items.length} · ${formatBytes(totalBytes)}`;
    } else {
      statsEl.textContent = `${items.length} recording${items.length === 1 ? "" : "s"} · ${formatBytes(totalBytes)}`;
    }
    statusEl.hidden = visible.length > 0;
    statusEl.textContent = items.length === 0
      ? "No recordings yet."
      : "Nothing matches that search.";
    const showYear = year === "all";
    listEl.replaceChildren();
    visible.forEach((item, index) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = animateList ? "row rise" : "row";
      if (animateList) button.style.animationDelay = `${Math.min(index, 16) * 35}ms`;
      button.setAttribute("aria-pressed", item.file === currentFile ? "true" : "false");

      const date = document.createElement("span");
      date.className = "row-date";
      const parts = dateParts(item.date);
      const day = document.createElement("span");
      day.className = "row-day";
      day.textContent = parts ? parts.day : "—";
      date.appendChild(day);
      if (parts) {
        const mon = document.createElement("span");
        mon.className = "row-mon";
        mon.textContent = parts.mon;
        date.appendChild(mon);
        if (showYear) {
          const y = document.createElement("span");
          y.className = "row-year";
          y.textContent = parts.year;
          date.appendChild(y);
        }
      }

      const body = document.createElement("span");
      body.className = "row-body";
      const titleLine = document.createElement("span");
      titleLine.className = "row-titleline";
      const eq = document.createElement("span");
      eq.className = "eq";
      eq.setAttribute("aria-hidden", "true");
      for (let i = 0; i < 3; i += 1) eq.appendChild(document.createElement("i"));
      const title = document.createElement("span");
      title.className = "row-title";
      title.textContent = item.title || item.file;
      titleLine.append(eq, title);
      const meta = document.createElement("span");
      meta.className = "row-meta";
      meta.textContent = rowMeta(item);
      body.append(titleLine, meta);

      button.append(date, body);
      const duration = formatDuration(item.duration);
      const ext = extension(item.file);
      const offline = !PLAYABLE.has(ext);
      if (duration || offline) {
        const side = document.createElement("span");
        side.className = "row-side";
        if (offline) {
          const tag = document.createElement("span");
          tag.className = "row-tag";
          tag.textContent = ext ? ext.toUpperCase() : "FILE";
          side.appendChild(tag);
        }
        if (duration) {
          const dur = document.createElement("span");
          dur.className = "row-dur";
          dur.textContent = duration;
          side.appendChild(dur);
        }
        button.appendChild(side);
      }

      button.addEventListener("click", () => selectItem(item));
      li.appendChild(button);
      listEl.appendChild(li);
    });
    renderYears();
    railEl.scrollTop = scrollTop;
    animateList = false;
  }

  player.addEventListener("error", () => {
    if (!player.getAttribute("src")) return;
    player.hidden = true;
    timecode.hidden = true;
    setPlaying(false);
    fallback.hidden = false;
    fallback.textContent = "This recording will not play in this browser. Download it and open it locally.";
  });
  player.addEventListener("play", () => setPlaying(true));
  player.addEventListener("pause", () => setPlaying(false));
  player.addEventListener("ended", () => setPlaying(false));
  player.addEventListener("timeupdate", paintTimecode);
  player.addEventListener("loadedmetadata", paintTimecode);
  player.addEventListener("emptied", () => {
    timecode.hidden = true;
    setPlaying(false);
  });

  searchEl.addEventListener("input", () => renderList());

  editToggle.addEventListener("click", () => {
    if (editor.hidden) openEditor();
    else closeEditor();
  });
  editCancel.addEventListener("click", () => closeEditor());
  editName.addEventListener("input", () => {
    editName.dataset.touched = "true";
  });
  editDate.addEventListener("input", syncNameToDate);
  editor.addEventListener("submit", (event) => {
    event.preventDefault();
    const previousFile = currentFile;
    editorError.hidden = true;
    editSave.disabled = true;
    fetch("/api/recording", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file: previousFile,
        title: editTitle.value,
        venue: editVenue.value,
        date: editDate.value,
        notes: editNotes.value,
        name: editName.value,
      }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const fallbackMessage = response.status === 404
            ? "Saving is not available on the server yet."
            : "Could not save that recording.";
          throw new Error(payload.error || fallbackMessage);
        }
        if (!payload || typeof payload.file !== "string") {
          throw new Error("Could not save that recording.");
        }
        replaceItem(previousFile, payload);
      })
      .catch((error) => {
        editorError.hidden = false;
        editorError.textContent = error instanceof Error && error.message
          ? error.message
          : "Could not save that recording.";
        editSave.disabled = false;
      });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !editor.hidden) {
      closeEditor();
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (editor.contains(event.target)) return;
    if (
      event.target === searchEl
      || event.target instanceof HTMLInputElement
      || event.target instanceof HTMLTextAreaElement
    ) return;
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const visible = items.filter(matches);
    if (!visible.length) return;
    event.preventDefault();
    const index = visible.findIndex((item) => item.file === currentFile);
    let next = 0;
    if (index === -1) next = event.key === "ArrowDown" ? 0 : visible.length - 1;
    else next = event.key === "ArrowDown"
      ? Math.min(visible.length - 1, index + 1)
      : Math.max(0, index - 1);
    selectItem(visible[next], { scrollList: true });
  });

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
    })
    .finally(() => {
      document.body.classList.add("is-ready");
    });
})();
