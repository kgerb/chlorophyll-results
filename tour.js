const $ = (id) => document.getElementById(id);
const dateLabel = (date) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const definitions = [
  {
    key: "survey",
    label: "The survey",
    tower: "Beech",
    cleaning: "baseline",
    pose: { z: -10, range: 60, heading: 0.65, elevation: 0.16 },
  },
  {
    key: "alignment",
    label: "Bringing flights together",
    tower: "Beech",
    view: "alignment",
    cleaning: "baseline",
    pose: { z: 0, range: 10, heading: 0.8, elevation: 0.28 },
  },
  {
    key: "structures",
    label: "Tower structures",
    tower: "Beech",
    cleaning: "baseline",
    pose: { z: -5, range: 32, heading: -0.55, elevation: 0.12 },
  },
  {
    key: "wood",
    label: "Predicted wood",
    tower: "Beech",
    cleaning: "default_structure",
    pose: { z: -1, range: 29, heading: -0.85, elevation: 0.2 },
  },
  {
    key: "samples",
    label: "The sample cubes",
    tower: "Beech",
    cleaning: "default_both",
    samples: true,
    pose: { z: -2, range: 25, heading: 0.6, elevation: 0.18 },
  },
  {
    key: "beech",
    label: "Beech · a seasonal pattern",
    tower: "Beech",
    cleaning: "default_both",
    samples: true,
    pose: { z: -9, range: 56, heading: 0.8, elevation: 0.2 },
  },
  {
    key: "douglas",
    label: "Douglas · a weaker link",
    tower: "Douglas",
    cleaning: "default_both",
    samples: true,
    pose: { z: -11, range: 63, heading: -0.6, elevation: 0.16 },
  },
  {
    key: "mixed",
    label: "Mixed · another perspective",
    tower: "Mixed",
    cleaning: "default_both",
    samples: true,
    pose: { z: -9, range: 58, heading: 0.5, elevation: 0.2 },
  },
];
const cards = [...document.querySelectorAll(".story-step")];
let active = -1,
  inspecting = false,
  scene,
  data,
  results,
  state,
  revision = 0;

function selectResults(sample) {
  document.dispatchEvent(
    new CustomEvent("showcase-selection", {
      detail: { tower: state.tower, cleaning: state.cleaning, sample },
    }),
  );
}

function fillControls() {
  const tower = data.towers[state.tower];
  $("scene-tower").value = state.tower;
  $("scene-date-select").replaceChildren(
    ...tower.clouds.map((c) => new Option(dateLabel(c.date), c.date)),
  );
  $("scene-date-select").value = state.date;
  $("scene-channel").value = state.channel;
  $("scene-cleaning").value = state.cleaning;
  $("scene-sample").replaceChildren(
    new Option("Choose a location", ""),
    ...tower.samples.map((s) => new Option(s.id, s.id)),
  );
  document.querySelectorAll(".inspection-grid select").forEach((el) => {
    el.disabled = state.view === "alignment";
  });
}

function legend() {
  const el = $("scene-legend");
  el.replaceChildren();
  if (state.view === "alignment") {
    data.alignment.dates.forEach((date, i) => {
      const span = document.createElement("span"),
        dot = document.createElement("i");
      dot.style.setProperty(
        "--swatch",
        ["#68a9db", "#c49bc9", "#dca64c", "#78b8a6", "#dc8fa7"][i],
      );
      span.append(
        dot,
        document.createTextNode(dateLabel(date).replace(" 2026", "")),
      );
      el.append(span);
    });
  } else if (state.channel !== "all") {
    const bar = document.createElement("b");
    bar.className = "spectral-bar";
    el.append(
      document.createTextNode("Reflectance 0"),
      bar,
      document.createTextNode("100 · distance 15–50 m"),
    );
  } else {
    [
      ["#b9d9b2", "Remaining"],
      ["#f7ba68", "Structure"],
      ["#b999df", "Predicted wood"],
      ["#819295", "Unknown"],
    ].forEach(([color, label]) => {
      const span = document.createElement("span"),
        dot = document.createElement("i");
      dot.style.setProperty("--swatch", color);
      span.append(dot, document.createTextNode(label));
      el.append(span);
    });
  }
}

async function show() {
  const id = ++revision;
  $("scene-status").textContent = "Loading the observed point cloud…";
  $("scene-status").hidden = false;
  $("scene-count").textContent = "Loading the selected view…";
  $("scene-title").textContent =
    state.view === "alignment"
      ? "Beech · five survey dates"
      : `${state.tower} · ${inspecting ? "free inspection" : definitions[active].label.replace(`${state.tower} · `, "")}`;
  $("scene-date").textContent =
    state.view === "alignment"
      ? `${state.endpoint === "before" ? "Before" : "After"} saved translation · diagnostic`
      : dateLabel(state.date);
  $("alignment-controls").hidden = state.view !== "alignment";
  $("alignment-endpoint").textContent =
    state.endpoint === "before"
      ? "Show after translation"
      : "Show before translation";
  legend();
  try {
    const n = await scene.show(state);
    if (id !== revision || n === null) return;
    $("scene-status").hidden = true;
    $("scene-count").textContent =
      `${n.toLocaleString("en-GB")} displayed returns · ${state.view === "alignment" ? "same points at both endpoints" : "sampled, not used for statistics"}`;
    $("inspect-scene").disabled = false;
    if ($("scene-sample").value) sampleDetail($("scene-sample").value, false);
  } catch (error) {
    if (id !== revision) return;
    $("scene-status").textContent =
      "This 3D view could not be loaded. Try another date or reload. The written story and results remain available.";
    $("scene-count").textContent = "Point-cloud view unavailable";
  }
}

function sampleDetail(id, focus = true) {
  const sample = data.towers[state.tower].samples.find((s) => s.id === id);
  const panel = $("sample-detail");
  panel.hidden = !sample;
  if (!sample) return;
  $("scene-sample").value = id;
  const rows = results.rows.filter(
    (r) =>
      r.tower === state.tower && r.sample === id && r.state === state.cleaning,
  );
  panel.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = `${state.tower} · ${id}`;
  const note = document.createElement("p");
  note.textContent = `65 cm cube · surveyed ${sample.survey.slice(0, 10)} (${sample.status}). Position uncertainty E/N/Z: ${sample.uncertaintyM.map((x) => x.toFixed(3)).join(" / ")} m.${id === "dt24wg" ? " Approved May FIX exception." : ""}`;
  const table = document.createElement("table"),
    head = document.createElement("tr");
  ["Date", "Field CFR", "LiDAR ratio"].forEach((x) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = x;
    head.append(th);
  });
  table.append(head);
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    if (r.date === state.date) tr.style.fontWeight = "bold";
    [
      dateLabel(r.date).replace(" 2026", ""),
      r.cfr.toFixed(3),
      r.ratio.toFixed(3),
    ].forEach((x) => {
      const td = document.createElement("td");
      td.textContent = x;
      tr.append(td);
    });
    table.append(tr);
  });
  const link = document.createElement("a");
  link.href = "#results";
  link.textContent = "See these locations in the full comparison ↗";
  link.style.textDecoration = "underline";
  link.addEventListener("click", () => selectResults(id));
  panel.append(title, note, table, link);
  if (!rows.some((r) => r.date === state.date)) {
    const missing = document.createElement("p");
    missing.textContent =
      "No supported exact-date pair for this location on the displayed flight.";
    panel.append(missing);
  }
  if (focus) scene.focus(sample.position);
  selectResults(id);
}

function chapter(index) {
  active = index;
  const def = definitions[index];
  cards.forEach((el, i) => el.classList.toggle("is-active", i === index));
  [...$("story-nav").children].forEach((el, i) => {
    if (i === index) el.setAttribute("aria-current", "step");
    else el.removeAttribute("aria-current");
  });
  state = {
    ...def,
    date: "2026-06-18",
    channel: "all",
    endpoint: "after",
    pointSize: Number($("point-size").value),
  };
  $("sample-detail").hidden = true;
  fillControls();
  scene.view(def.pose);
  show();
}

function onScroll() {
  if (!scene || inspecting) return;
  const mobile = innerWidth <= 850,
    threshold = innerHeight * (mobile ? 0.78 : 0.5);
  let index = 0;
  cards.forEach((el, i) => {
    if (el.getBoundingClientRect().top < threshold) index = i;
  });
  if (index !== active) chapter(index);
  const r = cards[index].getBoundingClientRect();
  const p = Math.max(0, Math.min(1, (threshold - r.top) / r.height));
  scene.view(definitions[index].pose, p);
  $("story-progress-fill").style.height =
    `${((index + p) / cards.length) * 100}%`;
}

function setInspect(value) {
  inspecting = value;
  $("walkthrough").classList.toggle("is-inspecting", value);
  $("inspection-controls").hidden = !value;
  $("reset-scene").hidden = !value;
  $("inspect-scene").textContent = value
    ? "Return to story ↩"
    : "Explore this scene ↗";
  $("inspect-scene").setAttribute("aria-expanded", String(value));
  scene.inspect(value);
  if (value) {
    state.samples = state.view !== "alignment";
    fillControls();
    show();
  } else {
    chapter(active);
    if (innerWidth <= 850)
      cards[active].scrollIntoView({ behavior: "instant", block: "start" });
  }
}

async function start() {
  const values = await Promise.all([
    fetch("./data/scene.json").then((r) => {
      if (!r.ok) throw Error();
      return r.json();
    }),
    fetch("./data/results.json").then((r) => {
      if (!r.ok) throw Error();
      return r.json();
    }),
    import("./scene.js"),
  ]);
  [data, results] = values;
  scene = new values[2].CloudScene($("scene-container"), data, (id) =>
    sampleDetail(id),
  );
  definitions.forEach((def, i) => {
    const a = document.createElement("a");
    a.href = `#story-${def.key}`;
    a.setAttribute("aria-label", `${i + 1}. ${def.label}`);
    a.title = def.label;
    a.addEventListener("click", () => {
      if (inspecting) setInspect(false);
    });
    $("story-nav").append(a);
  });
  document.querySelectorAll("[data-story-metrics]").forEach((el) => {
    const s = results.summaries[el.dataset.storyMetrics].default_both;
    el.innerHTML = `<div><span>Pooled correlation r</span><strong>${s.r.toFixed(3)}</strong></div><div><span>Within-date r</span><strong>${s.adjusted.toFixed(3)}</strong></div><p>${s.n} paired observations · ${s.locations} locations<br>Structures and predicted wood removed · all supported dates</p>`;
  });
  document.querySelectorAll("[data-result-tower]").forEach((el) =>
    el.addEventListener("click", () => {
      document.dispatchEvent(
        new CustomEvent("showcase-selection", {
          detail: { tower: el.dataset.resultTower, cleaning: "default_both" },
        }),
      );
    }),
  );
  $("inspect-scene").addEventListener("click", () => setInspect(!inspecting));
  $("reset-scene").addEventListener("click", () => {
    const pose =
      state.view === "alignment"
        ? definitions[1].pose
        : definitions.find((d) => d.key === state.tower.toLowerCase()).pose;
    scene.view(pose);
    scene.inspect(false);
    scene.camera.position.copy(scene.goalPosition);
    scene.controls.target.copy(scene.goalTarget);
    scene.controls.update();
    scene.inspect(true);
  });
  $("scene-tower").addEventListener("change", () => {
    state.tower = $("scene-tower").value;
    state.view = undefined;
    state.date = "2026-06-18";
    $("sample-detail").hidden = true;
    fillControls();
    $("reset-scene").click();
    show();
    selectResults();
  });
  [
    ["scene-date-select", "date"],
    ["scene-channel", "channel"],
    ["scene-cleaning", "cleaning"],
    ["point-size", "pointSize"],
  ].forEach(([id, key]) => {
    $(id).addEventListener("change", () => {
      state[key] = key === "pointSize" ? Number($(id).value) : $(id).value;
      show();
      if (key === "cleaning") selectResults($("scene-sample").value);
    });
  });
  $("scene-sample").addEventListener("change", () =>
    sampleDetail($("scene-sample").value),
  );
  $("alignment-endpoint").addEventListener("click", () => {
    state.endpoint = state.endpoint === "after" ? "before" : "after";
    show();
  });
  $("scene-container").addEventListener("scene-error", (e) => {
    $("scene-status").hidden = false;
    $("scene-status").textContent = e.detail;
    $("inspect-scene").disabled = true;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && inspecting) setInspect(false);
  });
  let pending = false;
  window.addEventListener(
    "scroll",
    () => {
      if (!pending) {
        pending = true;
        requestAnimationFrame(() => {
          pending = false;
          onScroll();
        });
      }
    },
    { passive: true },
  );
  window.addEventListener("resize", onScroll);
  reduced.addEventListener("change", onScroll);
  onScroll();
}

start().catch(() => {
  $("scene-status").hidden = false;
  $("scene-status").textContent =
    "The 3D viewer is unavailable in this browser. Read the complete story alongside, or continue to the interactive results below.";
  $("inspect-scene").disabled = true;
  cards.forEach((c) => c.classList.add("is-active"));
});
