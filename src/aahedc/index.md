---
title: AAHEDC — Assistance for Areas with High Electricity Distribution Costs
---

# Assistance for Areas with High Electricity Distribution Costs

AAHEDC socialises the high distribution costs of northern Scotland across all GB electricity consumers. SSEN (Scottish Hydro Electric Power Distribution) serves vast, sparsely populated geography — network costs per customer are structurally higher than anywhere else in GB. The scheme transfers the excess to all licensed suppliers, who recover it through their customer bases. A separate Shetland Assistance Amount sits alongside the main levy for the Shetland network.

The rate is flat — no regional variation, no time-of-use variation — and falls entirely in the unit rate (no standing-charge component). It is applied at **G**: supplier gross demand at the GSP boundary, LLF-scaled, with no further TLM adjustment. NESO administers the scheme under the Energy Act 2004; the tariff is set annually and has been remarkably stable, running at around 0.04 p/kWh throughout the 2020s.

---

```js
import * as Plot from "npm:@observablehq/plot";
import * as Inputs from "npm:@observablehq/inputs";
import * as d3 from "npm:d3";

const raw = await FileAttachment("../data/aahedc_tariffs.csv").csv({typed: true});

const LLF = 1.08;

function yearLabel(fy) {
  return `${fy - 1}/${String(fy).slice(2)}`;
}

// Pick best per year: Final > most-recent Draft
const data = [...d3.group(raw, d => d.year_fy).values()]
  .map(pubs => {
    const final = pubs.find(p => p.publication === "Final");
    const draft = pubs.filter(p => p.publication === "Draft")
                      .sort((a, b) => b.published_date - a.published_date)[0];
    const chosen = final ?? draft;
    return { ...chosen, year_fy: +chosen.year_fy, pub_class: final ? "final" : "forecast" };
  })
  .sort((a, b) => a.year_fy - b.year_fy)
  .map(d => ({ ...d, year_label: yearLabel(d.year_fy) }));
```

## Rate trends

```js
const annualKwh = view(Inputs.range([500, 6000], {
  label: "Annual consumption (kWh)",
  value: 2700,
  step: 50,
}));
```

```js
{
  const yMin = d3.min(data, d => d.total_scheme_p_kwh) * 0.97;
  const yMax = d3.max(data, d => d.total_scheme_p_kwh) * 1.03;

  display(Plot.plot({
    width: 560,
    height: 300,
    marginRight: 100,
    marginBottom: 40,
    x: { type: "band", label: null, tickRotate: -30 },
    y: {
      domain: [yMin, yMax],
      label: "Rate (p/kWh)",
      tickFormat: d => d.toFixed(4),
    },
    marks: [
      Plot.ruleY([yMin], { stroke: "var(--theme-foreground-faintest)" }),
      Plot.line(data, {
        x: "year_label", y: "total_scheme_p_kwh",
        stroke: "#4e6fa3", strokeWidth: 2, curve: "linear",
      }),
      Plot.dot(data, {
        x: "year_label", y: "total_scheme_p_kwh",
        fill: "#4e6fa3", r: 5, tip: true,
        title: d => `${d.year_label}\n${d.total_scheme_p_kwh.toFixed(4)} p/kWh\n£${(d.total_scheme_p_kwh * annualKwh * LLF / 100).toFixed(2)}/year`,
      }),
      Plot.text(data, {
        x: "year_label", y: "total_scheme_p_kwh",
        text: d => d.total_scheme_p_kwh.toFixed(4),
        dy: -12,
        fontSize: 10,
        fill: "#4e6fa3",
        stroke: "var(--cream-paper)",
        strokeWidth: 5,
        paintOrder: "stroke",
        fontFamily: "var(--font-mono)",
      }),
      Plot.axisY({
        anchor: "right",
        label: `Annual cost — ${annualKwh.toLocaleString()} kWh, LLF 1.08 (£)`,
        tickFormat: p => `£${(p * annualKwh * LLF / 100).toFixed(2)}`,
      }),
    ],
  }));
}
```

---

## About this data

Rates are the total scheme tariff from NESO's annual published tariff statements — this includes both the main AAHEDC amount and the Shetland Assistance Amount. Annual cost calculations apply a flat Line Loss Factor of **1.08**; in practice LLF varies by DNO area and time period, typically 1.07–1.10 for domestic low-voltage connections.

→ [How electricity is priced](../electricity-pricing/)
→ [TNUoS: Transmission charges](../tnuos/)
