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
  const viewsEl = document.getElementById("views");
  const inboxCountEl = document.getElementById("inbox-count");
  const inboxNoteEl = document.getElementById("inbox-note");
  const searchEl = document.getElementById("q");
  const statusEl = document.getElementById("status");
  const stage = document.getElementById("stage");
  const player = document.getElementById("player");
  const stageEmpty = document.getElementById("stage-empty");
  const stageCopy = document.getElementById("stage-copy");
  const timecode = document.getElementById("timecode");
  const fallback = document.getElementById("fallback");
  const nowEl = document.getElementById("now");
  const nowKicker = document.getElementById("now-kicker");
  const nowTitle = document.getElementById("now-title");
  const nowMeta = document.getElementById("now-meta");
  const nowNotes = document.getElementById("now-notes");
  const upNextEl = document.getElementById("up-next");
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

  const phoneQuery = window.matchMedia("(max-width: 900px)");
  const dateFormat = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const monthFormat = new Intl.DateTimeFormat("en-GB", { month: "short" });

  let items = [];
  let year = "all";
  let mode = "all";
  let currentFile = "";
  let viewOrder = [];
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

  function isUntagged(item) {
    return !item.venue || item.venue.trim() === "";
  }

  function groupKey(item) {
    return `${item.date || "undated"} ${(item.venue || "").trim().toLowerCase()}`;
  }

  function untaggedCount() {
    return items.filter(isUntagged).length;
  }

  function totalRuntime(list) {
    const total = list.reduce((sum, entry) => sum + (Number(entry.duration) || 0), 0);
    return formatDuration(total);
  }

  function matches(item) {
    if (year !== "all" && itemYear(item) !== year) return false;
    if (mode === "untagged" && !isUntagged(item)) return false;
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

  function renderViews() {
    const untagged = untaggedCount();
    viewsEl.querySelectorAll(".view").forEach((button) => {
      const value = button.dataset.mode || "all";
      button.setAttribute("aria-pressed", value === mode ? "true" : "false");
      if (value === "untagged") {
        inboxCountEl.textContent = untagged > 0 ? String(untagged) : "";
        button.disabled = untagged === 0 && mode !== "untagged";
      }
    });
    inboxNoteEl.hidden = untagged === 0;
    if (untagged > 0) {
      inboxNoteEl.textContent = untagged === 1
        ? "1 clip waiting for a name and venue."
        : `${untagged} clips waiting for names and venues. Press T on any clip to tag it.`;
    }
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
    const current = formatClock(player.currentTime);
    const total = Number.isFinite(player.duration) && player.duration > 0
      ? ` / ${formatClock(player.duration)}`
      : "";
    timecode.hidden = false;
    timecode.textContent = `${current}${total}`;
  }

  function paintNow(item) {
    nowKicker.textContent = isUntagged(item) ? "Needs tagging" : (item.venue || "Unknown venue");
    nowTitle.textContent = item.title || item.file;
    nowMeta.replaceChildren();
    const bits = [formatDate(item.date)];
    const extra = details(item);
    if (extra) bits.push(extra);
    nowMeta.append(bits.join(" · "));
    if (item.dateSource === "mtime") {
      const auto = document.createElement("span");
      auto.className = "auto";
      auto.textContent = " · date from file";
      nowMeta.appendChild(auto);
    }
    nowNotes.hidden = !item.notes;
    nowNotes.textContent = item.notes || "";
    const url = mediaUrl(item.file);
    downloadEl.href = url;
    downloadEl.setAttribute("download", item.file.split("/").pop() || "recording");
    paintUpNext();
  }

  function paintUpNext() {
    const at = viewOrder.indexOf(currentFile);
    const next = at !== -1 && at + 1 < viewOrder.length
      ? items.find((entry) => entry.file === viewOrder[at + 1])
      : null;
    upNextEl.hidden = !next;
    upNextEl.replaceChildren();
    if (next) {
      upNextEl.append("Up next · ");
      const strong = document.createElement("strong");
      strong.textContent = next.title || next.file;
      upNextEl.appendChild(strong);
    }
  }

  function fitStage() {
    const portrait = !player.hidden
      && player.videoHeight > 0
      && player.videoHeight > player.videoWidth;
    stage.classList.toggle("portrait", portrait);
  }

  function loadMedia(item) {
    fallback.hidden = true;
    timecode.hidden = true;
    stage.classList.remove("portrait");
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

  function clipRow(item, index, showYear) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = animateList ? "row rise" : "row";
    if (animateList) button.style.animationDelay = `${Math.min(index, 16) * 35}ms`;
    button.setAttribute("aria-pressed", item.file === currentFile ? "true" : "false");

    const date = document.createElement("span");
    date.className = "row-date";
    const parts = dateParts(item.date);
    if (parts) {
      const day = document.createElement("span");
      day.className = "row-day";
      day.textContent = parts.day;
      const mon = document.createElement("span");
      mon.className = "row-mon";
      mon.textContent = parts.mon;
      date.append(day, mon);
      if (showYear) {
        const yr = document.createElement("span");
        yr.className = "row-year";
        yr.textContent = parts.year;
        date.appendChild(yr);
      }
    } else {
      const day = document.createElement("span");
      day.className = "row-day";
      day.textContent = "–";
      date.appendChild(day);
    }

    const main = document.createElement("span");
    main.className = "row-main";
    const title = document.createElement("span");
    title.className = "row-title";
    title.textContent = item.title || item.file;
    const meta = document.createElement("span");
    meta.className = "row-meta";
    meta.textContent = rowMeta(item);
    main.append(title, meta);

    const side = document.createElement("span");
    side.className = "row-side";
    const eq = document.createElement("span");
    eq.className = "eq";
    eq.setAttribute("aria-hidden", "true");
    eq.append(
      document.createElement("i"),
      document.createElement("i"),
      document.createElement("i"),
      document.createElement("i"),
    );
    side.appendChild(eq);
    const ext = extension(item.file);
    const offline = !PLAYABLE.has(ext);
    if (isUntagged(item)) {
      const tag = document.createElement("span");
      tag.className = "row-tag warn";
      tag.textContent = "NEEDS TAG";
      side.appendChild(tag);
    }
    if (offline) {
      const tag = document.createElement("span");
      tag.className = "row-tag off";
      tag.textContent = ext ? ext.toUpperCase() : "FILE";
      side.appendChild(tag);
    }
    const duration = formatDuration(item.duration);
    if (duration) {
      const dur = document.createElement("span");
      dur.className = "row-dur";
      dur.textContent = duration;
      side.appendChild(dur);
    }

    button.append(date, main, side);
    button.addEventListener("click", () => selectItem(item));
    li.appendChild(button);
    return li;
  }

  function gigRuntime(gigItems) {
    return totalRuntime(gigItems);
  }

  function renderStats(visible) {
    const totalBytes = items.reduce((sum, item) => sum + (Number(item.bytes) || 0), 0);
    const size = formatBytes(totalBytes);
    const filtering = year !== "all" || mode !== "all" || searchEl.value.trim() !== "";
    if (items.length === 0) {
      statsEl.textContent = "No recordings yet";
      stageCopy.textContent = "Nothing to play yet.";
      return;
    }
    if (mode === "untagged") {
      statsEl.textContent = `${visible.length} to tag${size ? ` · ${size} on disk` : ""}`;
      return;
    }
    if (filtering) {
      statsEl.textContent = `${visible.length} of ${items.length}${size ? ` · ${size}` : ""}`;
      return;
    }
    const gigs = new Set(items.map(groupKey)).size;
    const runtime = totalRuntime(items);
    const bits = [
      `${items.length} clip${items.length === 1 ? "" : "s"}`,
      `${gigs} gig${gigs === 1 ? "" : "s"}`,
    ];
    if (runtime) bits.push(runtime);
    if (size) bits.push(size);
    statsEl.textContent = bits.join(" · ");
  }

  function renderList() {
    const scrollTop = railEl.scrollTop;
    const visible = items.filter(matches);
    viewOrder = visible.map((item) => item.file);
    renderStats(visible);
    statusEl.hidden = visible.length > 0;
    statusEl.textContent = items.length === 0
      ? "No recordings yet."
      : "Nothing matches that search.";
    renderViews();
    const showYear = year === "all";
    listEl.replaceChildren();
    if (mode === "untagged") {
      visible.forEach((item, index) => listEl.appendChild(clipRow(item, index, showYear)));
    } else {
      const groups = new Map();
      visible.forEach((item) => {
        const key = groupKey(item);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(item);
      });
      let index = 0;
      groups.forEach((gigItems) => {
        const first = gigItems[0];
        const gig = document.createElement("li");
        gig.className = "gig";
        const head = document.createElement("div");
        head.className = "gig-head";
        const when = document.createElement("p");
        when.className = "gig-when";
        when.textContent = formatDate(first.date);
        const where = document.createElement("p");
        where.className = "gig-where";
        where.textContent = first.venue || "Unknown venue";
        const sub = document.createElement("p");
        sub.className = "gig-sub";
        const runtime = gigRuntime(gigItems);
        sub.textContent = `${gigItems.length} clip${gigItems.length === 1 ? "" : "s"}${runtime ? ` · ${runtime}` : ""}`;
        head.append(when, where, sub);
        if (gigItems.every((entry) => entry.dateSource === "mtime")) {
          const auto = document.createElement("span");
          auto.className = "gig-auto";
          auto.textContent = " · date from file";
          sub.appendChild(auto);
        }
        const clips = document.createElement("ol");
        clips.className = "gig-clips";
        gigItems.forEach((item) => {
          clips.appendChild(clipRow(item, index, showYear));
          index += 1;
        });
        gig.append(head, clips);
        listEl.appendChild(gig);
      });
    }
    renderYears();
    railEl.scrollTop = scrollTop;
    animateList = false;
    if (currentFile) paintUpNext();
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
  player.addEventListener("ended", () => {
    setPlaying(false);
    // Review flow: roll on to the next clip in the current view.
    const at = viewOrder.indexOf(currentFile);
    if (at !== -1 && at + 1 < viewOrder.length) {
      const next = items.find((entry) => entry.file === viewOrder[at + 1]);
      if (next) selectItem(next, { scrollList: true });
    }
  });
  player.addEventListener("timeupdate", paintTimecode);
  player.addEventListener("loadedmetadata", () => {
    paintTimecode();
    fitStage();
  });
  player.addEventListener("emptied", () => {
    timecode.hidden = true;
    setPlaying(false);
  });

  searchEl.addEventListener("input", () => renderList());

  viewsEl.addEventListener("click", (event) => {
    const button = event.target.closest(".view");
    if (!button || button.disabled) return;
    mode = button.dataset.mode === "untagged" ? "untagged" : "all";
    animateList = true;
    renderList();
  });

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
        if (mode === "untagged") {
          // Inbox flow: tagging removes the clip from this view, so move on.
          animateList = true;
          const next = items.filter(matches)[0];
          if (next) selectItem(next, { keepPlace: true, scrollList: true });
          else {
            mode = "all";
            renderList();
          }
        }
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
    if (event.key === "t" || event.key === "T") {
      // Quick-tag the clip under review (or the first visible one).
      const item = items.find((entry) => entry.file === currentFile)
        || items.filter(matches)[0];
      if (!item) return;
      if (item.file !== currentFile) selectItem(item, { keepPlace: true });
      openEditor();
      return;
    }
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
      sortItems();
      renderDisk(catalog.disk);
      renderList();
    })
    .catch(() => {
      showMessage("The catalog is not on the server yet.");
      statusEl.hidden = false;
      statusEl.textContent = "Copy the recordings onto the disk, then rebuild the catalog. The site should ask for a password before it opens.";
    });
})();
