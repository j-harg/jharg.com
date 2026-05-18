---
title: TNUoS — Transmission Network Use of System
---

# Transmission Network Use of System

TNUoS (Transmission Network Use of System) covers the cost of building, operating and maintaining the high-voltage national transmission grid — the cables, transformers and substations that carry electricity across Great Britain at 400kV and 275kV. Like DUoS, it never appears by name on a household bill: NESO (the National Energy System Operator) levies TNUoS on licensed suppliers, who recover it through retail tariffs. For domestic customers on standard variable tariffs, the allowance is embedded in the Ofgem price cap.

TNUoS for domestic customers has two components. A **standing charge** — the Transmission Demand Residual (TDR), a flat daily charge per meter identical for all domestic customers regardless of location or consumption. And a **locational rate** — a smaller p/kWh charge that applies only to consumption during the evening peak: **4pm to 7pm on weekdays**. That balance between fixed and variable has changed significantly since 2023.

## How it has changed

Before April 2023, both the residual and locational elements were bundled into a single volumetric p/kWh rate applied against evening-peak consumption. All 14 zones had nonzero rates.

**April 2023 — TCR:** Residual costs moved to a flat daily standing charge (TDR). Only the locational element stayed volumetric, and northern zones (surplus generation) fell to zero. Costs converged sharply across regions.

**April 2026 — RIIO-ET3:** No methodology change — but TNUoS revenue rose substantially to fund net-zero grid investment. Standing charges increased 28–116% by region, the largest single contributor to the April 2026 price cap rise.

---

```js
import * as Plot from "npm:@observablehq/plot";
import * as Inputs from "npm:@observablehq/inputs";
import * as d3 from "npm:d3";

const nhhRaw     = await FileAttachment("../data/tnuos_nhh_locational.csv").csv({typed: true});
const tdrRaw     = await FileAttachment("../data/tnuos_tdr.csv").csv({typed: true});
const zoneMapRaw = await FileAttachment("../data/dno_tnuos_zone.csv").csv({typed: true});
const boundaries = await FileAttachment("../data/dno_boundaries.geojson").json();

const LLF = 1.08;

function yearLabel(fy) {
  return `${fy - 1}/${String(fy).slice(2)}`;
}

// For each (zone_no, year_fy): prefer Final > most-recent Draft > most-recent Forecast
function pickBestNHH(rows) {
  const byKey = d3.group(rows, d => `${d.zone_no}_${d.year_fy}`);
  return [...byKey.values()].map(pubs => {
    const final    = pubs.find(p => p.publication === "Final");
    const draft    = pubs.filter(p => p.publication === "Draft")
                         .sort((a, b) => b.published_date - a.published_date)[0];
    const forecast = pubs.filter(p => p.publication === "Forecast")
                         .sort((a, b) => b.published_date - a.published_date)[0];
    const chosen = final ?? draft ?? forecast;
    return { ...chosen, pub_class: final ? "final" : "forecast", year_label: yearLabel(+chosen.year_fy) };
  });
}

function pickBestTDR(rows) {
  const byYear = d3.group(rows, d => d.year_fy);
  return [...byYear.values()].map(pubs => {
    const final    = pubs.find(p => p.publication === "Final");
    const draft    = pubs.filter(p => p.publication === "Draft")
                         .sort((a, b) => b.published_date - a.published_date)[0];
    const forecast = pubs.filter(p => p.publication === "Forecast")
                         .sort((a, b) => b.published_date - a.published_date)[0];
    const chosen = final ?? draft ?? forecast;
    return { ...chosen, pub_class: final ? "final" : "forecast", year_label: yearLabel(+chosen.year_fy) };
  });
}

const nhhBest   = pickBestNHH(nhhRaw);
const tdrBest   = pickBestTDR(tdrRaw);
const tdrByYear = Object.fromEntries(tdrBest.map(d => [+d.year_fy, d]));

// Sorted zone list (zone_no ascending = N to S)
const allZones = d3.sort(
  [...d3.group(nhhBest, d => d.zone_no).values()].map(arr => ({
    zone_no:   +arr[0].zone_no,
    zone_name: arr[0].zone_name,
  })),
  d => d.zone_no
);

const allYears      = [...new Set(nhhBest.map(d => +d.year_fy))].sort((a, b) => a - b);
const allYearLabels = allYears.map(yearLabel);
const finalYears    = allYears.filter(fy => nhhBest.some(d => +d.year_fy === fy && d.pub_class === "final"));

// bsc_id → zone_no (number) for map colouring
const bscToZone = Object.fromEntries(zoneMapRaw.map(d => [d.bsc_id, +d.tnuos_zone_no]));

// Combined records: NHH + TDR joined, one row per (zone_no, year_fy)
const combined = nhhBest.map(d => {
  const tdr = tdrByYear[+d.year_fy];
  return {
    ...d,
    zone_no:     +d.zone_no,
    year_fy:     +d.year_fy,
    tdr_gbp_day: tdr?.tariff_gbp_site_day ?? 0,
  };
});

// Annual cost: locational (grossed up by LLF) + TDR standing charge
function calcCost(nhh_p_kwh, tdr_gbp_day, annual_kwh, peak_frac) {
  const loc_gbp = annual_kwh * peak_frac * LLF * nhh_p_kwh / 100;
  const tdr_gbp = (tdr_gbp_day ?? 0) * 365;
  return { loc_gbp, tdr_gbp, total_gbp: loc_gbp + tdr_gbp };
}
```

## Rate trends

How annual TNUoS costs have evolved — and where official NESO forecasts point. Fixed at 2,700 kWh with 15% evening peak consumption and a flat LLF of 1.08. **Solid lines** are final published tariffs; **dashed lines** are official NESO forecast tariffs, subject to revision.

The step at 2023/24 is TCR: residual costs moved from peak-window rates to the flat TDR, causing northern zones to jump sharply (they lost locational exposure but gained the same TDR floor as everyone else) while southern zones saw a smaller change. Costs converged significantly. The second step at 2026/27 is RIIO-ET3 — network investment costs landing directly on standing charges.

```js
{
  const TREND_KWH  = 2700;
  const TREND_PEAK = 0.15;

  const colorScale = Plot.scale({
    color: { type: "ordinal", domain: allZones.map(d => d.zone_no) },
  });

  const selected = new Set(allZones.map(d => d.zone_no));

  const chartDiv  = document.createElement("div");
  const legendDiv = document.createElement("div");
  legendDiv.style.cssText = "display:flex;flex-direction:column;gap:0;font-size:0.78rem;font-family:var(--font-mono);flex-shrink:0;padding-top:20px";

  const btn = document.createElement("button");
  Object.assign(btn.style, { fontSize: "0.78rem", cursor: "pointer", marginBottom: "6px", display: "inline-block", fontFamily: "var(--font-mono)" });
  const refreshBtn = () => { btn.textContent = selected.size === allZones.length ? "Deselect all" : "Select all"; };
  refreshBtn();

  const outer = document.createElement("div");
  outer.style.cssText = "display:flex;align-items:flex-start;gap:16px";
  outer.append(chartDiv, legendDiv);

  const wrapper = document.createElement("div");
  wrapper.append(btn, outer);

  const renderChart = (h) => {
    const trendData = combined
      .filter(d => selected.has(d.zone_no))
      .map(d => {
        const c = calcCost(d.nhh_tariff_floored_p_kwh, d.tdr_gbp_day, TREND_KWH, TREND_PEAK);
        return { ...d, ...c, zone_name: allZones.find(z => z.zone_no === d.zone_no)?.zone_name };
      })
      .sort((a, b) => a.year_fy - b.year_fy);

    const lastFinalFy = finalYears.at(-1);
    const finalData   = trendData.filter(d => d.pub_class === "final");
    // Forecast series bridges from the last final point so lines connect
    const forecastData = trendData.filter(d => d.pub_class === "forecast" || d.year_fy === lastFinalFy);

    const maxCost = Math.max(...trendData.map(d => d.total_gbp), 1);

    const annotations = [
      { year_label: "2023/24", text: "TCR" },
      { year_label: "2026/27", text: "RIIO-ET3" },
    ].filter(a => allYearLabels.includes(a.year_label));

    chartDiv.innerHTML = "";
    chartDiv.append(Plot.plot({
      width:        Math.max(400, width - 200),
      height:       h ?? Math.max(300, 20 + allZones.length * 26),
      marginLeft:   50,
      marginBottom: 60,
      x: { type: "band", label: null, tickRotate: -30 },
      y: {
        label: "Annual TNUoS cost — 2,700 kWh, 15% peak, LLF 1.08 (£)",
        zero: true,
        domain: [0, maxCost * 1.12],
      },
      color: {
        domain: allZones.map(d => d.zone_no),
        range:  allZones.map(d => colorScale.apply(d.zone_no)),
      },
      marks: [
        Plot.ruleY([0], { stroke: "var(--theme-foreground-faintest)" }),
        // Epoch annotations
        Plot.ruleX(annotations.map(a => a.year_label), {
          stroke: "var(--ink-navy)", strokeOpacity: 0.18, strokeWidth: 1.5,
        }),
        Plot.text(annotations, {
          x: "year_label", y: () => maxCost * 1.08,
          text: "text",
          fontSize: 8, fill: "var(--ink-navy)", fillOpacity: 0.5,
          textAnchor: "middle",
        }),
        // Solid lines: final published rates
        Plot.line(finalData, {
          x: "year_label", y: "total_gbp", stroke: "zone_no",
          marker: "circle", strokeWidth: 2, curve: "linear",
        }),
        // Dashed lines: official forecasts (bridged from last final)
        ...(forecastData.length > 0 ? [
          Plot.line(forecastData, {
            x: "year_label", y: "total_gbp", stroke: "zone_no",
            strokeWidth: 1.5, strokeDasharray: "5,3", strokeOpacity: 0.65, curve: "linear",
          }),
        ] : []),
        Plot.dot(finalData, {
          x: "year_label", y: "total_gbp", fill: "zone_no", r: 4, tip: true,
          title: d => `${d.zone_name}\n${d.year_label}: £${d.total_gbp.toFixed(2)}`,
        }),
      ],
    }));
  };

  btn.addEventListener("click", () => {
    const addAll = selected.size < allZones.length;
    allZones.forEach(d => addAll ? selected.add(d.zone_no) : selected.delete(d.zone_no));
    rows.forEach(({ zone_no, row, swatch }) => {
      const on = selected.has(zone_no);
      row.style.opacity = on ? "1" : "0.35";
      swatch.style.background = on ? colorScale.apply(zone_no) : "var(--ink-mute, #aaa)";
    });
    refreshBtn();
    renderChart(legendDiv.offsetHeight);
  });

  const rows = allZones.map(d => {
    const color = colorScale.apply(d.zone_no);
    const on    = selected.has(d.zone_no);

    const row = document.createElement("div");
    row.style.cssText = `display:flex;align-items:center;gap:7px;white-space:nowrap;cursor:pointer;padding:3px 4px;border-radius:3px;opacity:${on ? 1 : 0.35}`;

    const swatch = document.createElement("span");
    swatch.style.cssText = `display:inline-block;width:16px;height:3px;border-radius:1px;flex-shrink:0;background:${on ? color : "var(--ink-mute, #aaa)"}`;

    const label = document.createElement("span");
    label.textContent = d.zone_name.length > 26 ? d.zone_name.slice(0, 25) + "…" : d.zone_name;

    row.append(swatch, label);
    row.addEventListener("click", () => {
      if (selected.has(d.zone_no)) {
        selected.delete(d.zone_no);
        row.style.opacity = "0.35";
        swatch.style.background = "var(--ink-mute, #aaa)";
      } else {
        selected.add(d.zone_no);
        row.style.opacity = "1";
        swatch.style.background = color;
      }
      refreshBtn();
      renderChart(legendDiv.offsetHeight);
    });
    row.addEventListener("mouseover", () => { row.style.background = "color-mix(in srgb, var(--ink-navy) 6%, var(--cream-paper))"; });
    row.addEventListener("mouseout",  () => { row.style.background = ""; });

    legendDiv.append(row);
    return { zone_no: d.zone_no, row, swatch };
  });

  renderChart();
  display(wrapper);
  requestAnimationFrame(() => {
    const legH = legendDiv.offsetHeight;
    if (legH > 50) renderChart(legH);
  });
}
```

---

## Compare regions

Annual TNUoS cost across all 14 transmission zones at your chosen consumption level and year. Before April 2023 (years up to 2022/23), the TDR standing charge did not exist — only the locational component is shown for those years. The shift from a purely variable charge to fixed + small variable is visible in the bar composition as you move through years.

```js
const cmpYear = view(Inputs.select(
  allYears,
  { label: "Year", format: yearLabel, value: finalYears.at(-1) }
));
```

```js
const cmpKwh = view(Inputs.range([500, 6000], {
  label: "Annual consumption (kWh)",
  value: 2700,
  step: 50,
}));
```

```js
const cmpPeak = view(Inputs.range([5, 40], {
  label: "% of consumption in evening peak (4–7pm weekdays)",
  value: 15,
  step: 1,
}));
```

```js
const cmpView = view(Inputs.radio(["Bar chart", "Map"], { value: "Bar chart", label: "View" }));
```

```js
{
  const cmpRecords = allZones.map(z => {
    const rec = combined.find(d => d.zone_no === z.zone_no && d.year_fy === cmpYear);
    if (!rec) return null;
    const c = calcCost(rec.nhh_tariff_floored_p_kwh, rec.tdr_gbp_day, cmpKwh, cmpPeak / 100);
    return { zone_no: z.zone_no, zone_name: z.zone_name, pub_class: rec.pub_class, ...c };
  }).filter(Boolean).sort((a, b) => b.total_gbp - a.total_gbp);

  const isForecast = cmpRecords.some(d => d.pub_class === "forecast");
  if (isForecast) display(html`<p style="font-size:0.85rem;color:#888;margin-bottom:8px">⚠ Rates for ${yearLabel(cmpYear)} are official NESO forecast tariffs, not final published rates.</p>`);

  if (cmpView === "Bar chart") {
    const cmpData = cmpRecords.flatMap(d => [
      { zone_name: d.zone_name, component: "Evening peak (locational)", value: d.loc_gbp, order: 0 },
      { zone_name: d.zone_name, component: "Standing charge (TDR)",     value: d.tdr_gbp, order: 1 },
    ]);

    display(Plot.plot({
      width: 680,
      height: cmpRecords.length * 30 + 60,
      marginLeft: 210,
      marginRight: 60,
      x: { label: "Annual TNUoS cost (£)", axis: "top" },
      y: { domain: cmpRecords.map(d => d.zone_name), label: null },
      color: {
        domain: ["Evening peak (locational)", "Standing charge (TDR)"],
        range:  ["#4e6fa3", "#6c757d"],
        legend: true,
      },
      marks: [
        Plot.barX(cmpData, Plot.stackX({
          order: "order",
          x: "value",
          y: "zone_name",
          fill: "component",
          insetTop: 3,
          insetBottom: 3,
          rx: 2,
        })),
        Plot.text(cmpRecords, {
          x: d => d.total_gbp,
          y: "zone_name",
          text: d => `£${d.total_gbp.toFixed(0)}`,
          dx: 6,
          fontSize: 11,
          textAnchor: "start",
        }),
        Plot.ruleX([0]),
      ],
    }));

  } else {
    const costByZone  = Object.fromEntries(cmpRecords.map(d => [d.zone_no, d.total_gbp]));
    const costByBscId = Object.fromEntries(
      Object.entries(bscToZone).map(([bsc, zone]) => [bsc, costByZone[zone]])
    );
    const costs = Object.values(costByBscId).filter(v => v != null);

    const featureData = boundaries.features
      .filter(f => costByBscId[f.properties.bsc_id] != null)
      .map(f => ({
        bsc_id:    f.properties.bsc_id,
        area:      f.properties.Area,
        zone_no:   bscToZone[f.properties.bsc_id],
        zone_name: allZones.find(z => z.zone_no === bscToZone[f.properties.bsc_id])?.zone_name,
        centroid:  d3.geoCentroid(f),
        cost:      costByBscId[f.properties.bsc_id],
      }));

    const leaderOffsets = {
      LOND: { dx:  90, dy: -20 },
      SEEB: { dx: 100, dy:  25 },
    };
    const inRegion   = featureData.filter(d => !leaderOffsets[d.bsc_id]);
    const withLeader = featureData.filter(d =>  leaderOffsets[d.bsc_id]);

    const mapW = Math.min(370, width - 240);
    const mapH = Math.min(640, mapW * 1.52);

    const plt = Plot.plot({
      width: mapW, height: mapH,
      projection: { type: "mercator", domain: boundaries },
      color: {
        type: "linear",
        domain: [Math.min(...costs), Math.max(...costs)],
        scheme: "YlOrRd",
        legend: true,
        label: "Annual TNUoS cost (£)",
        tickFormat: d => `£${d.toFixed(0)}`,
      },
      marks: [
        Plot.geo(boundaries.features, {
          fill: d => costByBscId[d.properties.bsc_id] ?? null,
          stroke: "white",
          strokeWidth: 0.5,
          tip: true,
          title: d => {
            const zno  = bscToZone[d.properties.bsc_id];
            const zn   = allZones.find(z => z.zone_no === zno)?.zone_name ?? d.properties.Area;
            const cost = costByBscId[d.properties.bsc_id];
            return `${zn}\n${cost != null ? `£${cost.toFixed(2)}` : "no data"}`;
          },
        }),
        Plot.text(inRegion, {
          x: d => d.centroid[0],
          y: d => d.centroid[1],
          text: d => `£${d.cost.toFixed(0)}`,
          fill: "white",
          stroke: "rgba(0,0,0,0.35)",
          strokeWidth: 3,
          paintOrder: "stroke",
          fontWeight: 600,
          fontSize: 10,
          fontFamily: "var(--font-mono)",
        }),
        Plot.text(withLeader, {
          x: d => d.centroid[0],
          y: d => d.centroid[1],
          text: d => `£${d.cost.toFixed(0)}`,
          dx: d => leaderOffsets[d.bsc_id].dx,
          dy: d => leaderOffsets[d.bsc_id].dy,
          fill: "var(--ink-navy)",
          stroke: "var(--cream-paper)",
          strokeWidth: 3,
          paintOrder: "stroke",
          fontWeight: 600,
          fontSize: 10,
          fontFamily: "var(--font-mono)",
        }),
      ],
    });

    const rankDiv = document.createElement("div");
    rankDiv.style.cssText = "display:flex;flex-direction:column;gap:3px;font-size:0.78rem;font-family:var(--font-mono);flex-shrink:0;width:210px;padding-top:56px";

    cmpRecords.forEach((d, i) => {
      const row   = document.createElement("div");
      row.style.cssText = "display:flex;justify-content:space-between;gap:8px;white-space:nowrap";
      const left  = document.createElement("span");
      left.style.cssText = "color:var(--ink-mute,#888);flex-shrink:0";
      left.textContent = `${i + 1}.`;
      const mid   = document.createElement("span");
      mid.style.cssText = "flex:1;overflow:hidden;text-overflow:ellipsis";
      mid.textContent = d.zone_name.length > 27 ? d.zone_name.slice(0, 26) + "…" : d.zone_name;
      const right = document.createElement("span");
      right.style.cssText = "flex-shrink:0;font-weight:600";
      right.textContent = `£${d.total_gbp.toFixed(0)}`;
      row.append(left, mid, right);
      rankDiv.append(row);
    });

    const mapWrapper = document.createElement("div");
    mapWrapper.style.cssText = "display:flex;align-items:flex-start;gap:16px";
    mapWrapper.append(plt, rankDiv);
    display(mapWrapper);

    requestAnimationFrame(() => {
      for (const fd of withLeader) {
        const pathEl = [...plt.querySelectorAll("path")].find(p =>
          p.querySelector("title")?.textContent.startsWith(fd.zone_name ?? fd.area)
        );
        const label  = `£${fd.cost.toFixed(0)}`;
        const textEl = [...plt.querySelectorAll("text")].filter(t => t.textContent.trim() === label).at(-1);
        if (!pathEl || !textEl) continue;
        const pb   = pathEl.getBBox();
        const tb   = textEl.getBBox();
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", pb.x + pb.width  / 2);
        line.setAttribute("y1", pb.y + pb.height / 2);
        line.setAttribute("x2", tb.x + tb.width  / 2);
        line.setAttribute("y2", tb.y + tb.height / 2);
        line.setAttribute("stroke", "var(--ink-navy)");
        line.setAttribute("stroke-width", "1");
        line.setAttribute("opacity", "0.5");
        const firstTextGroup = plt.querySelector("g[aria-label*='text']");
        plt.insertBefore(line, firstTextGroup ?? null);
      }
    });
  }
}
```

---

## About this data

Rates are sourced from NESO's annual published tariff statements, available via the NESO Data Portal. The locational rate applies only to consumption during the **4pm–7pm weekday** peak window and is charged at Grid Supply Point (GSP) level — that is, against metered demand grossed up for distribution line losses. All calculations on this page apply a flat Line Loss Factor of **1.08** (8%). In practice, LLF varies by DNO area and season, typically 1.07–1.10 for domestic low-voltage connections.

The TDR standing charge did not exist before April 2023. For years up to 2022/23, all costs shown are locational only.

**Forecasts** (dashed lines and ⚠ notices) are official NESO forecast tariff publications. They are updated periodically and are subject to revision. They are not indicative of Ofgem price cap allowances.

→ [How electricity is priced](../electricity-pricing/)
→ [DUoS: Distribution charges by region](../duos/)
