---
title: Viz exploration — time bands & rates
---

# Viz exploration

Three approaches to showing time bands and rates together. Region: Eastern (UKPN).

```js
import * as Plot from "npm:@observablehq/plot";
import * as d3 from "npm:d3";

const duos  = await FileAttachment("data/duos.json").json();
const bands = await FileAttachment("data/bands.json").json();

const BSC_ID = "EELC";
const dnoBands = bands[BSC_ID];
const dnoRates = duos.filter(d => d.bsc_id === BSC_ID).sort((a,b) => a.year_label.localeCompare(b.year_label));
const allYears = dnoRates.map(d => d.year_label);

// Helper: for a given minute-of-day and day type, return the band
function getBand(minute, dayType = "weekday") {
  for (const {band, start_min, end_min} of dnoBands[dayType]) {
    if (minute >= start_min && minute < end_min) return band;
  }
  return "green";
}

// Expand to 48 half-hour slots for a day type, joined with rates for a given year
function halfHourly(yearLabel, dayType = "weekday") {
  const rates = dnoRates.find(d => d.year_label === yearLabel);
  return Array.from({length: 48}, (_, i) => {
    const minute = i * 30;
    const band = getBand(minute, dayType);
    return { minute, hour: minute / 60, band, rate: rates[`${band}_p_kwh`], year: yearLabel };
  });
}

const BAND_COLOR = { red: "#d62828", amber: "#f4a261", green: "#52b788" };
const BAND_OPACITY = { "2022/23": 0.18, "2023/24": 0.25, "2024/25": 0.35, "2025/26": 0.55, "2026/27": 0.75, "2027/28": 1.0 };
```

---

## Option 1 — Band timeline with rates (current style + year)

Horizontal bars showing band windows. Rate labels added per band. Year selector included.

```js
const o1Year = view(Inputs.select(allYears, { label: "Year", value: allYears.at(-1) }));
```

```js
const o1Rates = dnoRates.find(d => d.year_label === o1Year);

// Build rows with rate label
const o1Rows = [];
for (const [day_type, intervals] of Object.entries(dnoBands)) {
  for (const {band, start_min, end_min} of intervals) {
    o1Rows.push({
      day_type, band, start_min, end_min,
      rate: o1Rates[`${band}_p_kwh`],
      mid: (start_min + end_min) / 2,
      label: `${o1Rates[`${band}_p_kwh`].toFixed(2)}p`,
      span: end_min - start_min,
    });
  }
}
const dayTypes = ["weekday", "weekend"];

display(Plot.plot({
  width: 720,
  height: 140,
  marginLeft: 90,
  marginRight: 10,
  x: {
    domain: [0, 1440], label: null,
    tickFormat: d => `${String(Math.floor(d/60)).padStart(2,"0")}:00`,
    ticks: [0, 360, 720, 1080, 1440],
  },
  y: { domain: dayTypes, label: null, tickFormat: d => d === "weekday" ? "Weekday" : "Weekend" },
  color: {
    domain: ["red","amber","green"],
    range: [BAND_COLOR.red, BAND_COLOR.amber, BAND_COLOR.green],
    legend: true,
  },
  marks: [
    Plot.barX(o1Rows, {
      x1: "start_min", x2: "end_min", y: "day_type", fill: "band",
      insetTop: 6, insetBottom: 6,
    }),
    Plot.text(o1Rows.filter(r => r.span > 90), {
      x: "mid", y: "day_type", text: "label",
      fill: "white", fontWeight: "600", fontSize: 11,
    }),
  ],
}));
```

---

## Option 2 — Radial clock

24-hour clock face. Arc length = time window. Arc radius = rate (higher rate → longer spoke). Colour = band.

```js
const o2Year = view(Inputs.select(allYears, { label: "Year", value: allYears.at(-1) }));
```

```js
{
  const rates = dnoRates.find(d => d.year_label === o2Year);
  const size = 400;
  const cx = size / 2, cy = size / 2;
  const innerR = 80, maxR = 175;
  const maxRate = 30; // p/kWh scale ceiling

  // angle: 0 = midnight top, clockwise
  const toAngle = min => (min / 1440) * 2 * Math.PI - Math.PI / 2;
  const toR = rate => innerR + (rate / maxRate) * (maxR - innerR);

  const arcGen = d3.arc();

  const svg = d3.create("svg")
    .attr("width", size).attr("height", size)
    .attr("font-family", "IBM Plex Mono, monospace")
    .attr("font-size", 11);

  // Background circle
  svg.append("circle").attr("cx", cx).attr("cy", cy).attr("r", maxR + 8)
    .attr("fill", "none").attr("stroke", "#ccc").attr("stroke-width", 1);
  svg.append("circle").attr("cx", cx).attr("cy", cy).attr("r", innerR)
    .attr("fill", "none").attr("stroke", "#ccc").attr("stroke-width", 1);

  // Hour tick marks
  for (let h = 0; h < 24; h++) {
    const angle = (h / 24) * 2 * Math.PI - Math.PI / 2;
    const r1 = maxR + 4, r2 = maxR + 12;
    svg.append("line")
      .attr("x1", cx + r1 * Math.cos(angle)).attr("y1", cy + r1 * Math.sin(angle))
      .attr("x2", cx + r2 * Math.cos(angle)).attr("y2", cy + r2 * Math.sin(angle))
      .attr("stroke", "#999").attr("stroke-width", h % 6 === 0 ? 1.5 : 0.75);
    if (h % 6 === 0) {
      const labelR = maxR + 22;
      svg.append("text")
        .attr("x", cx + labelR * Math.cos(angle)).attr("y", cy + labelR * Math.sin(angle))
        .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
        .attr("fill", "#555").attr("font-size", 10)
        .text(`${String(h).padStart(2,"0")}:00`);
    }
  }

  // Draw arcs for weekday bands
  for (const {band, start_min, end_min} of dnoBands.weekday) {
    const rate = rates[`${band}_p_kwh`];
    const outerR = toR(rate);
    const path = arcGen({
      startAngle: toAngle(start_min),
      endAngle: toAngle(end_min),
      innerRadius: innerR,
      outerRadius: outerR,
    });
    svg.append("path").attr("d", path).attr("transform", `translate(${cx},${cy})`)
      .attr("fill", BAND_COLOR[band]).attr("opacity", 0.85);

    // Rate label at mid-arc if wide enough
    if (end_min - start_min > 120) {
      const midAngle = toAngle((start_min + end_min) / 2);
      const labelR = (innerR + outerR) / 2;
      svg.append("text")
        .attr("x", cx + labelR * Math.cos(midAngle))
        .attr("y", cy + labelR * Math.sin(midAngle))
        .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
        .attr("fill", "white").attr("font-weight", "600").attr("font-size", 10)
        .text(`${rate.toFixed(2)}p`);
    }
  }

  // Centre label
  svg.append("text").attr("x", cx).attr("y", cy - 8)
    .attr("text-anchor", "middle").attr("fill", "#333").attr("font-size", 12).attr("font-weight", "600")
    .text("Weekday");
  svg.append("text").attr("x", cx).attr("y", cy + 10)
    .attr("text-anchor", "middle").attr("fill", "#888").attr("font-size", 10)
    .text(o2Year);

  display(svg.node());
}
```

---

## Option 3 — 24hr stepped line with year-over-year

Stepped line across a 24-hour day. Each year drawn as a line; older years are faded. Current year is bold and coloured by band.

```js
const o3Year = view(Inputs.select(allYears, { label: "Current year", value: allYears.at(-1) }));
```

```js
// Build data for all years
const o3Data = allYears.flatMap(y => halfHourly(y));
const currentData = o3Data.filter(d => d.year === o3Year);
const prevData    = o3Data.filter(d => d.year !== o3Year);

// Segment current year by band for coloured fill
const segments = [];
for (let i = 0; i < currentData.length; i++) {
  const d = currentData[i];
  const next = currentData[i + 1];
  segments.push({
    x1: d.hour, x2: next ? next.hour : 24,
    y1: d.rate, y2: d.rate,
    band: d.band,
  });
}

display(Plot.plot({
  width: 720,
  height: 280,
  marginLeft: 50,
  marginRight: 10,
  x: {
    domain: [0, 24], label: "Hour of day",
    tickFormat: d => `${String(d).padStart(2,"0")}:00`,
    ticks: [0, 3, 6, 9, 12, 15, 18, 21, 24],
  },
  y: { label: "p/kWh", zero: true },
  marks: [
    // Previous years — grey stepped lines, faded
    ...allYears.filter(y => y !== o3Year).map(y =>
      Plot.line(o3Data.filter(d => d.year === y), {
        x: "hour", y: "rate",
        curve: "step-after",
        stroke: "#aaa",
        strokeWidth: 1,
        opacity: BAND_OPACITY[y] ?? 0.2,
      })
    ),
    // Current year — thick, coloured segments by band
    Plot.link(segments, {
      x1: "x1", y1: "y1", x2: "x2", y2: "y2",
      stroke: d => BAND_COLOR[d.band],
      strokeWidth: 3,
    }),
    // Vertical line at midnight end
    Plot.ruleX([0, 24], { stroke: "#ddd" }),
    Plot.ruleY([0], { stroke: "#ddd" }),
  ],
}));
```
