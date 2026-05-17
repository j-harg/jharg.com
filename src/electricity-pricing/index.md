---
title: How electricity is priced
---

# How electricity is priced

The unit rate on your electricity bill is not a single number — it is a stack of separate cost components, each set by a different part of the industry. Understanding the stack is the prerequisite for understanding why prices vary, why they move, and why someone in Wales pays more than someone in London.

---

## The cost stack

A domestic unit rate in Great Britain is built from four broad layers:

```js
import * as Plot from "npm:@observablehq/plot";

const stack = [
  {component: "Wholesale",     pct: 37, note: "Spot price + BSUoS balancing charge"},
  {component: "Network",       pct: 23, note: "DUoS + TNUoS + AAHEDC"},
  {component: "Policy levies", pct: 23, note: "RO, FIT, CfD, Capacity Market, ECO, WHD"},
  {component: "Supplier + VAT",pct: 17, note: "Operating costs, margin, 5% VAT"},
];

const COLORS = ["#4e6fa3", "#e07b39", "#52b788", "#aaaaaa"];

display(Plot.plot({
  width: 560,
  height: 72,
  marginLeft: 0, marginRight: 0, marginTop: 8, marginBottom: 32,
  x: {domain: [0, 100], label: "Indicative share of unit rate (%)", ticks: 5, tickFormat: d => `${d}%`},
  y: {domain: [""], label: null, axis: null},
  color: {domain: stack.map(d => d.component), range: COLORS, legend: true},
  marks: [
    Plot.barX(stack, Plot.stackX({
      x: "pct", y: () => "", fill: "component",
      insetTop: 4, insetBottom: 4, rx: 2,
    })),
  ],
}));
```

Indicative for a typical 2024/25 domestic tariff. During the 2022–23 energy crisis, wholesale's share exceeded 60%.

---

## Components in detail

**Wholesale** — the half-hourly market price for electricity, paid at transmission level. BSUoS (Balancing Services Use of System) is added on top: a charge National Grid ESO levies each half-hour to cover the cost of keeping the grid in balance. Both are billed on gross transmission volume.

**Network** covers three separate charges:

| Charge | Who charges | What it covers |
|---|---|---|
| DUoS | 14 regional DNOs | Local distribution network (substation to meter) |
| TNUoS | National Grid ESO | High-voltage transmission across GB |
| AAHEDC | Ofgem | Assistance for high-cost distribution areas (Hydro) |

DUoS is where regional variation is most pronounced — rates differ by up to 4× across DNO areas and vary by time of day. → [Explore DUoS charges by region](../duos/)

**Policy levies** are flat per-kWh charges set annually to fund government energy policy:

- **RO** — Renewables Obligation (support for renewable generation)
- **FIT** — Feed-in Tariff (legacy small-scale generation payments)
- **CfD** — Contracts for Difference (newer renewable support mechanism)
- **CM** — Capacity Market levy (payment to keep backup capacity available)
- **ECO / WHD** — Energy Company Obligation and Warm Home Discount (social obligations)

**Supplier costs** cover metering, customer services, hedging, and a retail margin, with 5% VAT applied to the total.

---

## Losses and the volume hierarchy

Electricity is lost as heat in wires — roughly 7–10% of what generators inject never reaches a customer meter. Suppliers account for this by purchasing more wholesale energy than their customers consume. Each cost component is charged on a different gross-up basis:

```
d  =  metered demand          (what the customer actually uses, kWh)
g  =  d × LLF                 (grossed up to Grid Supply Point for distribution losses)
f  =  g × TLM                 (grossed up to transmission level for transmission losses)
```

- **LLF** (Line Loss Factor) — set per DNO per time period, typically **1.07–1.10** for domestic LV
- **TLM** (Transmission Loss Multiplier) — set per zone per BSC season, typically **1.00–1.02**

Charges billed at each level:

| Volume basis | Charges |
|---|---|
| **d** (metered) | DUoS, RO, FIT, ECO, WHD |
| **g** (GSP) | TNUoS, AAHEDC |
| **f** (transmission) | Wholesale spot, BSUoS, NCC |

---

## The formula

For each half-hour settlement period, the cost to serve one unit of metered demand is:

```
cost = f × spot    +  f × BSUoS
     + g × TNUoS   +  g × AAHEDC
     + d × DUoS    +  d × RO  +  d × FIT  +  d × ECO  +  d × WHD
     + supplier opex + margin
     × 1.05  (VAT)
```

The nested structure (d → g → f) means transmission-level charges are amplified by **both** LLF and TLM. A supplier with a high-loss-factor customer effectively pays more for wholesale and BSUoS even at identical spot prices.
