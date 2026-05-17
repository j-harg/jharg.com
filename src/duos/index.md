---
title: DUoS — Distribution Use of System
---

# Distribution Use of System

Every electricity bill in Great Britain includes a charge you almost certainly haven't heard of: DUoS, the Distribution Use of System charge. It pays for the wires, transformers, and substations that make up your local distribution network — the infrastructure that runs between the high-voltage national grid and the socket on your wall.

DUoS is collected by the fourteen Distribution Network Operators (DNOs) that divide up Great Britain geographically. Each DNO sets its own rates, which is why someone in South West England pays a materially different network charge from someone in Yorkshire, even on otherwise identical tariffs.

## The Red, Amber, and Green system

The unit-rate portion of DUoS isn't flat — it varies by time of day using a three-band system:

- **Red** — peak demand periods (typically 16:00–19:00 on weekdays). The most expensive band. Rates are 10–100× higher than Green in some regions.
- **Amber** — shoulder periods (mornings and early evenings). Mid-range.
- **Green** — nights, weekends, and most of the day. Cheapest or free.

This structure was designed to send a price signal: if you can shift consumption out of the peak window, the network needs less capacity investment and everyone pays less over time.

## The standing charge

Alongside the unit rates, DUoS includes a fixed daily charge (p/MPAN/day) — one component of the standing charge you see on your bill. This covers the baseline cost of being connected to the network at all, regardless of how much electricity you use.

```js
import * as Plot from "npm:@observablehq/plot";
import * as Inputs from "npm:@observablehq/inputs";

const BAND_COLOR = { red: "#d62828", amber: "#f4a261", green: "#52b788" };

const duos  = await FileAttachment("../data/duos.json").json();
const bands = await FileAttachment("../data/bands.json").json();

// Derived lookups
const allYears = [...new Set(duos.map(d => d.year_label))].sort();
const allDnos  = [...new Map(duos.map(d => [d.bsc_id, d])).values()]
  .sort((a, b) => a.dno_name.localeCompare(b.dno_name));

// Helper: calculate annual costs for a record at a given kWh level
function calcCosts(r, kwh) {
  const red_gbp      = r.red_fraction   * kwh * r.red_p_kwh   / 100;
  const amber_gbp    = r.amber_fraction * kwh * r.amber_p_kwh / 100;
  const green_gbp    = r.green_fraction * kwh * r.green_p_kwh / 100;
  const standing_gbp = r.standing_p_day * 365 / 100;
  const total_gbp    = red_gbp + amber_gbp + green_gbp + standing_gbp;
  return {red_gbp, amber_gbp, green_gbp, standing_gbp, total_gbp};
}
```

---

## Rates by region

Each DNO defines its own Red/Amber/Green windows. The grid shows band structure across all 14 regions for ${allYears.at(-1)}. Numbers on the bars are rates in p/kWh — hover a band for the full breakdown. Below, select a region to see how rates have changed year-over-year.

```js
const shortDno = name => {
  const s = name.replace(/\s*\([^)]+\)\s*$/, "").trim();
  return s.length > 28 ? s.slice(0, 27) + "…" : s;
};

const latestYear = allYears.at(-1);
const dnoOrder = allDnos.map(d => shortDno(d.dno_name));

const fmtMin = m => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const gridRows = allDnos.flatMap(dno => {
  const rec = duos.find(d => d.bsc_id === dno.bsc_id && d.year_label === latestYear);
  return ["weekday", "weekend"].flatMap(dayType =>
    (bands[dno.bsc_id][dayType] ?? []).map(({band, start_min, end_min}) => ({
      short_name: shortDno(dno.dno_name),
      dno_name: dno.dno_name,
      day_type: dayType,
      band,
      start_min,
      end_min,
      rate: rec ? rec[`${band}_p_kwh`] : null,
      span: end_min - start_min,
      mid: (start_min + end_min) / 2,
      label: rec ? rec[`${band}_p_kwh`].toFixed(1) : "",
    }))
  );
});

display(Plot.plot({
  width,
  height: allDnos.length * 32 + 60,
  marginLeft: 195,
  marginRight: 10,
  fx: {
    domain: ["weekday", "weekend"],
    label: null,
    tickFormat: d => d === "weekday" ? "Weekday" : "Weekend",
    paddingInner: 0.15,
  },
  x: {
    domain: [0, 1440],
    label: null,
    axis: "top",
    tickFormat: d => `${String(Math.floor(d / 60)).padStart(2, "0")}:00`,
    ticks: [0, 360, 720, 1080, 1440],
  },
  y: {
    domain: dnoOrder,
    label: null,
  },
  color: {
    domain: ["red", "amber", "green"],
    range: [BAND_COLOR.red, BAND_COLOR.amber, BAND_COLOR.green],
    legend: true,
  },
  marks: [
    Plot.barX(gridRows, {
      x1: "start_min",
      x2: "end_min",
      y: "short_name",
      fx: "day_type",
      fill: "band",
      insetTop: 4,
      insetBottom: 4,
      channels: {
        Region: "dno_name",
        Band: d => d.band.charAt(0).toUpperCase() + d.band.slice(1),
        "p/kWh": d => d.rate != null ? d.rate.toFixed(2) : "—",
        Time: d => `${fmtMin(d.start_min)}–${fmtMin(d.end_min)}`,
      },
      tip: { format: { x1: false, x2: false, y: false, fill: false } },
    }),
    Plot.text(gridRows.filter(r => r.span > 120 && r.label), {
      x: "mid",
      y: "short_name",
      fx: "day_type",
      text: "label",
      fill: "white",
      fontWeight: "600",
      fontSize: 9,
    }),
  ],
}));
```

```js
const tbDno = view(Inputs.select(
  allDnos,
  {
    label: "Region",
    format: d => d.dno_name.length > 28 ? d.dno_name.slice(0, 27) + "…" : d.dno_name,
    value: allDnos.find(d => d.bsc_id === "EELC"),
  }
));
```

```js
{
  const tbYears = allYears.filter(y => duos.some(d => d.bsc_id === tbDno.bsc_id && d.year_label === y));
  const tbLatest = tbYears.at(-1);
  const n = tbYears.length;
  const opacity = Object.fromEntries(tbYears.map((y, i) => [
    y, n === 1 ? 1 : 0.12 + (i / (n - 1)) * 0.88,
  ]));
  const segs = tbYears.flatMap(year => {
    const rec = duos.find(d => d.bsc_id === tbDno.bsc_id && d.year_label === year);
    return bands[tbDno.bsc_id].weekday.map(({band, start_min, end_min}) => ({
      x1: start_min / 60,
      x2: end_min / 60,
      y:  rec[`${band}_p_kwh`],
      band, year,
    }));
  });

  display(Plot.plot({
    width: 680,
    height: 260,
    marginLeft: 50,
    marginRight: 16,
    x: {
      domain: [0, 24],
      label: "Hour of day",
      tickFormat: h => `${String(h).padStart(2, "0")}:00`,
      ticks: [0, 3, 6, 9, 12, 15, 18, 21, 24],
    },
    y: { label: "p/kWh", domain: [0, Math.max(...segs.map(s => s.y)) * 1.05] },
    marks: [
      Plot.ruleY([0], { stroke: "var(--theme-foreground-faintest)" }),
      ...tbYears.flatMap(year =>
        Plot.link(segs.filter(s => s.year === year), {
          x1: "x1", x2: "x2", y1: "y", y2: "y",
          stroke: d => BAND_COLOR[d.band],
          strokeWidth: year === tbLatest ? 3 : 1,
          strokeOpacity: opacity[year],
          strokeLinecap: "round",
        })
      ),
      Plot.tip(segs, Plot.pointer({
        x: d => (d.x1 + d.x2) / 2,
        y: "y",
        channels: {
          Year: "year",
          Band: "band",
          "Rate (p/kWh)": d => d.y.toFixed(3),
        },
        format: { x: false, y: false },
      })),
    ],
  }));
}
```

---

## Annual cost calculator

Use the controls below to estimate the DUoS component of an electricity bill for a given region, year, and consumption level. The cost is split into what goes to each time band and to the standing charge.

```js
const calcDno = view(Inputs.select(
  allDnos,
  {
    label: "Region",
    format: d => d.dno_name.length > 28 ? d.dno_name.slice(0, 27) + "…" : d.dno_name,
    value: allDnos.find(d => d.bsc_id === "EELC"),
  }
));
```

```js
// Only show years available for this DNO
const calcYears = allYears.filter(y =>
  duos.some(d => d.bsc_id === calcDno.bsc_id && d.year_label === y)
);
const calcYear = view(Inputs.select(calcYears, {label: "Year", value: calcYears.at(-1)}));
```

```js
const calcKwh = view(Inputs.range([500, 6000], {
  label: "Annual consumption (kWh)",
  value: 2700,
  step: 50,
}));
```

```js
const calcRecord = duos.find(d => d.bsc_id === calcDno.bsc_id && d.year_label === calcYear);

if (!calcRecord) {
  display(html`<p style="color: #888">No data available for this region and year.</p>`);
} else {
  const c = calcCosts(calcRecord, calcKwh);
  const stackData = [
    {component: "Peak (red)",       value: c.red_gbp,      order: 0},
    {component: "Shoulder (amber)", value: c.amber_gbp,    order: 1},
    {component: "Off-peak (green)", value: c.green_gbp,    order: 2},
    {component: "Standing charge",  value: c.standing_gbp, order: 3},
  ];

  display(html`
    <p>
      At <strong>${calcKwh.toLocaleString()} kWh</strong> in
      <strong>${calcRecord.dno_name}</strong> (${calcYear}),
      the DUoS charge would be approximately
      <strong>£${c.total_gbp.toFixed(2)}</strong> per year
      — <strong>£${(c.total_gbp / calcKwh * 100).toFixed(2)}p/kWh</strong> effective rate.
    </p>
  `);

  display(Plot.plot({
    width: 680,
    height: 90,
    marginLeft: 10,
    marginRight: 10,
    x: {label: "Annual DUoS cost (£)", axis: "top"},
    color: {
      domain: ["Peak (red)", "Shoulder (amber)", "Off-peak (green)", "Standing charge"],
      range:  ["#d62828",    "#f4a261",           "#52b788",          "#6c757d"],
      legend: true,
    },
    marks: [
      Plot.barX(stackData, Plot.stackX({
        order: "order",
        x: "value",
        fill: "component",
        y: () => "",
        insetTop: 8,
        insetBottom: 8,
        rx: 3,
      })),
      Plot.text(stackData, Plot.stackX({
        order: "order",
        x: "value",
        fill: "white",
        y: () => "",
        text: d => d.value >= 3 ? `£${d.value.toFixed(0)}` : "",
        textAnchor: "middle",
        fontWeight: "bold",
        fontSize: 13,
      })),
      Plot.ruleX([0]),
    ],
  }));

  const dot = (color) => {
    const s = document.createElement("span");
    Object.assign(s.style, {display:"inline-block", width:"10px", height:"10px", background:color, marginRight:"5px", verticalAlign:"middle"});
    return s;
  };
  display(html`
    <table style="width:100%; border-collapse:collapse; font-size:0.9rem; margin-top:0.5rem">
      <thead>
        <tr style="border-bottom:1px solid #ddd; text-align:left">
          <th style="padding:4px 8px">Component</th>
          <th style="padding:4px 8px; text-align:right">% of usage</th>
          <th style="padding:4px 8px; text-align:right">kWh</th>
          <th style="padding:4px 8px; text-align:right">Rate (p/kWh)</th>
          <th style="padding:4px 8px; text-align:right">Cost (£/yr)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:4px 8px">${dot(BAND_COLOR.red)}Peak (red)</td>
          <td style="padding:4px 8px; text-align:right">${(calcRecord.red_fraction * 100).toFixed(1)}%</td>
          <td style="padding:4px 8px; text-align:right">${(calcRecord.red_fraction * calcKwh).toFixed(0)}</td>
          <td style="padding:4px 8px; text-align:right">${calcRecord.red_p_kwh.toFixed(2)}p</td>
          <td style="padding:4px 8px; text-align:right">£${c.red_gbp.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:4px 8px">${dot(BAND_COLOR.amber)}Shoulder (amber)</td>
          <td style="padding:4px 8px; text-align:right">${(calcRecord.amber_fraction * 100).toFixed(1)}%</td>
          <td style="padding:4px 8px; text-align:right">${(calcRecord.amber_fraction * calcKwh).toFixed(0)}</td>
          <td style="padding:4px 8px; text-align:right">${calcRecord.amber_p_kwh.toFixed(2)}p</td>
          <td style="padding:4px 8px; text-align:right">£${c.amber_gbp.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:4px 8px">${dot(BAND_COLOR.green)}Off-peak (green)</td>
          <td style="padding:4px 8px; text-align:right">${(calcRecord.green_fraction * 100).toFixed(1)}%</td>
          <td style="padding:4px 8px; text-align:right">${(calcRecord.green_fraction * calcKwh).toFixed(0)}</td>
          <td style="padding:4px 8px; text-align:right">${calcRecord.green_p_kwh.toFixed(2)}p</td>
          <td style="padding:4px 8px; text-align:right">£${c.green_gbp.toFixed(2)}</td>
        </tr>
        <tr style="border-top:1px solid #ddd">
          <td style="padding:4px 8px">Standing charge</td>
          <td style="padding:4px 8px; text-align:right">—</td>
          <td style="padding:4px 8px; text-align:right">—</td>
          <td style="padding:4px 8px; text-align:right">${calcRecord.standing_p_day.toFixed(2)}p/day</td>
          <td style="padding:4px 8px; text-align:right">£${c.standing_gbp.toFixed(2)}</td>
        </tr>
        <tr style="font-weight:bold; border-top:2px solid #333">
          <td style="padding:4px 8px">Total DUoS</td>
          <td style="padding:4px 8px; text-align:right">100%</td>
          <td style="padding:4px 8px; text-align:right">${calcKwh.toLocaleString()}</td>
          <td style="padding:4px 8px; text-align:right">—</td>
          <td style="padding:4px 8px; text-align:right">£${c.total_gbp.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  `);
}
```

---

## Compare regions

How does DUoS cost vary across all 14 DNOs at the same consumption level? Select a year and consumption to compare.

```js
const cmpYear = view(Inputs.select(allYears, {
  label: "Year",
  value: allYears.at(-2),  // default to most recent complete year
}));
```

```js
const cmpKwh = view(Inputs.range([500, 6000], {
  label: "Annual consumption (kWh)",
  value: 2700,
  step: 50,
}));
```

```js
const cmpRecords = duos
  .filter(d => d.year_label === cmpYear)
  .map(d => {
    const c = calcCosts(d, cmpKwh);
    return {...d, ...c};
  })
  .sort((a, b) => b.total_gbp - a.total_gbp);

const cmpData = cmpRecords.flatMap(d => [
  {dno_name: d.dno_name, component: "Peak (red)",       value: d.red_gbp,      order: 0},
  {dno_name: d.dno_name, component: "Shoulder (amber)", value: d.amber_gbp,    order: 1},
  {dno_name: d.dno_name, component: "Off-peak (green)", value: d.green_gbp,    order: 2},
  {dno_name: d.dno_name, component: "Standing charge",  value: d.standing_gbp, order: 3},
]);

const dnoOrder = cmpRecords.map(d => d.dno_name);

display(Plot.plot({
  width: 680,
  height: cmpRecords.length * 30 + 60,
  marginLeft: 260,
  marginRight: 60,
  x: {label: "Annual DUoS cost (£)", axis: "top"},
  y: {
    domain: dnoOrder,
    label: null,
  },
  color: {
    domain: ["Peak (red)", "Shoulder (amber)", "Off-peak (green)", "Standing charge"],
    range:  ["#d62828",    "#f4a261",           "#52b788",          "#6c757d"],
    legend: true,
  },
  marks: [
    Plot.barX(cmpData, Plot.stackX({
      order: "order",
      x: "value",
      y: "dno_name",
      fill: "component",
      insetTop: 3,
      insetBottom: 3,
      rx: 2,
    })),
    Plot.text(cmpRecords, {
      x: d => d.total_gbp,
      y: "dno_name",
      text: d => `£${d.total_gbp.toFixed(0)}`,
      dx: 6,
      fontSize: 11,
      textAnchor: "start",
    }),
    Plot.ruleX([0]),
  ],
}));

const missing = ["HYDE", "NORW", "SPOW"].filter(id =>
  !cmpRecords.some(d => d.bsc_id === id)
);
if (missing.length > 0) {
  display(html`<p style="font-size:0.85rem; color:#888">
    ⚠ No data for ${missing.join(", ")} in ${cmpYear}.
  </p>`);
}
```

---

## Rate trends

How have rates changed over time? Select one or more regions to compare.

```js
const trendDnos = view(Inputs.checkbox(
  allDnos,
  {
    label: "Regions",
    format: d => d.dno_name,
    value: allDnos.filter(d => ["EELC", "SEEB", "SWEB", "YELG"].includes(d.bsc_id)),
  }
));
```

```js
const trendData = duos
  .filter(d => trendDnos.some(t => t.bsc_id === d.bsc_id))
  .map(d => {
    const c = calcCosts(d, 2700);
    return {...d, ...c};
  });

if (trendData.length === 0) {
  display(html`<p style="color:#888">Select at least one region above.</p>`);
} else {
  display(Plot.plot({
    width: 680,
    height: 320,
    marginLeft: 50,
    x: {
      type: "band",
      label: "Year",
      tickRotate: -30,
    },
    y: {
      label: "Annual DUoS cost at 2,700 kWh (£)",
      zero: true,
    },
    color: {
      legend: true,
      tickFormat: d => allDnos.find(n => n.bsc_id === d)?.dno_name ?? d,
    },
    marks: [
      Plot.line(trendData, {
        x: "year_label",
        y: "total_gbp",
        stroke: "bsc_id",
        marker: "circle",
        strokeWidth: 2,
        curve: "linear",
      }),
      Plot.dot(trendData, {
        x: "year_label",
        y: "total_gbp",
        fill: "bsc_id",
        r: 4,
        tip: true,
        title: d => `${allDnos.find(n => n.bsc_id === d.bsc_id)?.dno_name}\n${d.year_label}: £${d.total_gbp.toFixed(2)}`,
      }),
    ],
  }));
}
```

---

## About this data

Rates are sourced from each DNO's annual charging statements (published each spring for the following April–March charging year). All figures are for the **Domestic Aggregated** tariff class — the tariff applied to standard domestic (household) meters.

**Data gaps:** HYDE (Scottish Hydro) is missing 2022/23 and 2025/26; NORW (Electricity North West) and SPOW (SP Distribution) are missing 2023/24 and 2024/25 due to non-standard PDF formats in those years.

**Methodology note:** The cost calculator uses the D0018 PC1 demand profile (actual settlement data from 2023/24) to estimate what fraction of a typical household's annual consumption falls in each time band. This fraction is fixed regardless of total consumption — the underlying demand *shape* doesn't change when you use more or less electricity.
