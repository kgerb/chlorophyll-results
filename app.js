"use strict";

const $ = (id) => document.getElementById(id);
const stateLabels = {
  baseline: "Neither removed",
  default_structure: "Structures removed",
  no_wood: "Predicted wood removed",
  default_both: "Both removed",
};
const dateColors = {
  "2026-03-12": "#7f5d89",
  "2026-04-07": "#ae752e",
  "2026-04-24": "#798b38",
  "2026-05-01": "#31746c",
  "2026-06-02": "#4b78a2",
  "2026-06-18": "#233e31",
};
const descriptions = {
  Beech:
    "The pooled pattern is strong. Removing each date’s mean leaves a more moderate association. Individual dates still vary considerably.",
  Douglas:
    "The pooled association is weak and uncertain. A common seasonal relationship is not established for these locations.",
  Mixed:
    "An association remains after removing each date’s mean. The tower contains different foliage types, and the result depends on the sampled cohort.",
};
const dateLabel = (date) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
const number = (v) => v.toFixed(3);
const svgNS = "http://www.w3.org/2000/svg";

function svgElement(tag, attributes, text) {
  const element = document.createElementNS(svgNS, tag);
  Object.entries(attributes).forEach(([key, value]) =>
    element.setAttribute(key, value),
  );
  if (text !== undefined) element.textContent = text;
  return element;
}

async function fetchData(path) {
  const response = await fetch(path);
  if (!response.ok)
    throw new Error(`Unable to load ${path}: ${response.status}`);
  return response.json();
}

function mountResults(data) {
  const params = new URLSearchParams(location.search);
  let tower = Object.hasOwn(data.summaries, params.get("tower"))
    ? params.get("tower")
    : "Beech";
  let state = Object.hasOwn(stateLabels, params.get("cleaning"))
    ? params.get("cleaning")
    : "default_both";
  const domain = (key) => {
    const values = data.rows.map((row) => row[key]);
    return [
      Math.floor((Math.min(...values) - 0.1) * 2) / 2,
      Math.ceil((Math.max(...values) + 0.1) * 2) / 2,
    ];
  };
  const [xmin, xmax] = domain("cfr");
  const [ymin, ymax] = domain("ratio");
  function updateURL() {
    const url = new URL(location.href);
    url.searchParams.set("tower", tower);
    url.searchParams.set("cleaning", state);
    history.replaceState(null, "", url);
  }
  function render() {
    const summary = data.summaries[tower][state];
    const rows = data.rows
      .filter((row) => row.tower === tower && row.state === state)
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.sample.localeCompare(b.sample),
      );
    document.querySelectorAll("[data-tower]").forEach((button) => {
      const active = button.dataset.tower === tower;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    $("cleaning").value = state;
    $("selection-label").textContent =
      `${tower.toUpperCase()} · ${stateLabels[state].toUpperCase()}`;
    $("pooled").textContent = number(summary.r);
    $("adjusted").textContent = number(summary.adjusted);
    $("range").textContent =
      `${number(summary.low)} to ${number(summary.high)}`;
    $("selection-count").textContent =
      `${summary.n} observations · ${summary.locations} locations · ${summary.dates} dates`;
    $("interpretation").textContent = descriptions[tower];
    $("scatter-title").textContent =
      `${tower} · paired field and LiDAR measurements`;
    $("table-caption").textContent =
      `${tower} · ${stateLabels[state]} · ${summary.n} exact-date observations`;
    const svg = $("scatter");
    const width = Math.max(350, Math.round(svg.getBoundingClientRect().width));
    const height = width < 450 ? 355 : 425;
    const left = 62,
      right = width - 18,
      bottom = height - 62,
      top = 24;
    const x = (v) => left + ((v - xmin) / (xmax - xmin)) * (right - left);
    const y = (v) => bottom - ((v - ymin) / (ymax - ymin)) * (bottom - top);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.replaceChildren(
      svgElement(
        "desc",
        { id: "scatter-desc" },
        `${rows.length} observations at ${tower}. Field CFR on the horizontal axis and LiDAR reflectance ratio on the vertical axis. Pooled Pearson r ${number(summary.r)}. All displayed data also appear in the expandable table.`,
      ),
    );
    for (let i = 0; i <= 4; i++) {
      const vx = xmin + ((xmax - xmin) * i) / 4;
      const vy = ymin + ((ymax - ymin) * i) / 4;
      svg.append(
        svgElement("line", {
          x1: left,
          x2: right,
          y1: y(vy),
          y2: y(vy),
          stroke: "#e0e6d8",
          "stroke-width": 1,
        }),
      );
      svg.append(
        svgElement(
          "text",
          { x: x(vx), y: bottom + 25, "text-anchor": "middle" },
          vx.toFixed(1),
        ),
      );
      svg.append(
        svgElement(
          "text",
          { x: left - 12, y: y(vy) + 4, "text-anchor": "end" },
          vy.toFixed(1),
        ),
      );
    }
    svg.append(
      svgElement("path", {
        d: `M${left} ${top}V${bottom}H${right}`,
        fill: "none",
        stroke: "#9cac90",
        "stroke-width": 1.2,
      }),
    );
    svg.append(
      svgElement(
        "text",
        {
          x: (left + right) / 2,
          y: height - 9,
          "text-anchor": "middle",
          class: "axis-title",
        },
        "Field CFR · 735 / 700 nm",
      ),
    );
    svg.append(
      svgElement(
        "text",
        {
          transform: `translate(17 ${(top + bottom) / 2}) rotate(-90)`,
          "text-anchor": "middle",
          class: "axis-title",
        },
        "LiDAR ratio · 1064 / 532 nm",
      ),
    );
    const tooltip = $("tooltip");
    tooltip.hidden = true;
    rows.forEach((row) => {
      const label = `${row.sample} · ${dateLabel(row.date)} 2026. CFR ${number(row.cfr)}, LiDAR ratio ${number(row.ratio)}. ${row.n0} and ${row.n2} accepted returns.`;
      const point = svgElement("circle", {
        cx: x(row.cfr),
        cy: y(row.ratio),
        r: 4.7,
        fill: dateColors[row.date],
        "fill-opacity": 0.86,
        stroke: "#fcfdf8",
        "stroke-width": 1,
        class: "point",
        tabindex: 0,
        "aria-label": label,
      });
      function show() {
        tooltip.textContent = label;
        tooltip.hidden = false;
      }
      function hide() {
        tooltip.hidden = true;
      }
      point.addEventListener("pointerenter", show);
      point.addEventListener("pointerleave", hide);
      point.addEventListener("focus", show);
      point.addEventListener("blur", hide);
      point.addEventListener("click", show);
      point.addEventListener("keydown", (event) => {
        if (event.key === "Escape") hide();
      });
      svg.append(point);
    });
    $("date-legend").replaceChildren(
      ...[...new Set(rows.map((row) => row.date))].map((date) => {
        const label = document.createElement("span");
        const swatch = document.createElement("i");
        swatch.style.background = dateColors[date];
        label.append(swatch, document.createTextNode(dateLabel(date)));
        return label;
      }),
    );
    $("observation-table").replaceChildren(
      ...rows.map((row) => {
        const tr = document.createElement("tr");
        [
          row.date,
          row.sample,
          number(row.cfr),
          number(row.ratio),
          `${row.n0} / ${row.n2}`,
        ].forEach((value) => {
          const td = document.createElement("td");
          td.textContent = value;
          tr.append(td);
        });
        return tr;
      }),
    );
  }
  document.querySelectorAll("[data-tower]").forEach((button) =>
    button.addEventListener("click", () => {
      tower = button.dataset.tower;
      render();
      updateURL();
    }),
  );
  $("cleaning").addEventListener("change", (event) => {
    state = event.target.value;
    render();
    updateURL();
  });
  render();
  let lastWidth = $("scatter").getBoundingClientRect().width;
  new ResizeObserver(() => {
    const width = $("scatter").getBoundingClientRect().width;
    if (Math.abs(width - lastWidth) > 1) {
      lastWidth = width;
      render();
    }
  }).observe($("scatter"));
}

function mountCanopy(data) {
  const canvas = $("canopy");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  let angle = -0.35;
  let mode = "all";
  let drag = null;
  const points = data.points;
  const zs = points.map((p) => p[2]);
  const minZ = Math.min(...zs),
    maxZ = Math.max(...zs);
  const middle = (minZ + maxZ) / 2;
  const radius = Math.max(...points.map((p) => Math.hypot(p[0], p[1])));
  const colors = ["#b9cfa1", "#efb35e", "#c5a8dc"];
  function draw() {
    const { width, height } = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    const scale = Math.min(
      (height - 22) / (maxZ - minZ + radius * 0.3),
      (width - 48) / (radius * 2.2),
    );
    const cos = Math.cos(angle),
      sin = Math.sin(angle);
    const projected = points
      .filter(
        (p) =>
          mode === "all" || (p[3] !== 1 && (mode !== "both" || p[3] !== 2)),
      )
      .map((p) => [
        p[0] * cos - p[1] * sin,
        p[0] * sin + p[1] * cos,
        p[2],
        p[3],
      ])
      .sort((a, b) => a[1] - b[1]);
    for (const [px, depth, z, label] of projected) {
      ctx.fillStyle = colors[label];
      ctx.globalAlpha = label === 0 ? 0.43 + (depth / radius + 1) * 0.13 : 0.95;
      const size = label === 0 ? 1.35 : 2;
      ctx.fillRect(
        width / 2 + px * scale,
        height / 2 - (z - middle + depth * 0.13) * scale,
        size,
        size,
      );
    }
    ctx.globalAlpha = 1;
    canvas.dataset.visiblePoints = String(projected.length);
    canvas.dataset.angle = String(angle);
  }
  new ResizeObserver(draw).observe(canvas);
  document.querySelectorAll("[data-cloud]").forEach((button) =>
    button.addEventListener("click", () => {
      mode = button.dataset.cloud;
      document.querySelectorAll("[data-cloud]").forEach((b) => {
        b.classList.toggle("active", b === button);
        b.setAttribute("aria-pressed", String(b === button));
      });
      draw();
    }),
  );
  canvas.addEventListener("pointerdown", (event) => {
    drag = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (drag === null) return;
    angle += (event.clientX - drag) * 0.009;
    drag = event.clientX;
    draw();
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((name) =>
    canvas.addEventListener(name, () => {
      drag = null;
    }),
  );
  canvas.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) return;
    event.preventDefault();
    angle =
      event.key === "Home"
        ? -0.35
        : angle + (event.key === "ArrowLeft" ? -0.15 : 0.15);
    draw();
  });
  $("cloud-status").hidden = true;
  draw();
}

fetchData("./data/results.json")
  .then(mountResults)
  .catch(() => {
    $("data-status").textContent =
      "The interactive data could not be loaded. Reload the page, or use the downloadable tables; the headline snapshot remains visible.";
    document.querySelectorAll("[data-tower], #cleaning").forEach((control) => {
      control.disabled = true;
    });
  });
fetchData("./data/canopy.json")
  .then(mountCanopy)
  .catch(() => {
    $("cloud-status").textContent =
      "The point-cloud sample could not be loaded. The research results below remain available.";
    document.querySelectorAll("[data-cloud]").forEach((control) => {
      control.disabled = true;
    });
  });
