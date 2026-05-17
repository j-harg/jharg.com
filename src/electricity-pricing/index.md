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
  {component: "Wholesale energy",    pct: 37, note: "Cost of buying electricity in the market"},
  {component: "Network charges",     pct: 23, note: "Moving electricity from generators to your home"},
  {component: "Policy levies",       pct: 23, note: "Renewables support, capacity market, social obligations"},
  {component: "Supplier costs + VAT",pct: 17, note: "Operating costs, margin, 5% VAT"},
];

const COLORS = ["#4e6fa3", "#e07b39", "#52b788", "#aaaaaa"];

display(Plot.plot({
  width: 560,
  height: 72,
  marginLeft: 0, marginRight: 0, marginTop: 8, marginBottom: 32,
  x: {domain: [0, 100], label: "Share of unit rate (%)", ticks: 5, tickFormat: d => `${d}%`},
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

These percentages are indicative for a typical 2024/25 domestic tariff. They shift substantially with wholesale prices — during the 2022–23 energy crisis, wholesale's share exceeded 60%.

| Layer | Who sets it | Varies by |
|---|---|---|
| Wholesale | Market (half-hourly auctions) | Time, season, fuel prices |
| Network | Ofgem-regulated DNOs + National Grid | **Region**, time of day |
| Policy levies | Government / Ofgem | Year (set annually) |
| Supplier costs | Each supplier | Supplier efficiency, tariff type |

---

## Network charges in detail

Network costs split into two tiers:

**Transmission (TNUoS)** — charged by National Grid for the high-voltage wires running across the country. Set annually, broadly uniform for demand customers.

**Distribution (DUoS)** — charged by the 14 regional Distribution Network Operators for the local network from the substation to your meter. This is where regional variation lives: rates differ by up to 4× between the cheapest and most expensive DNO areas, and vary by time of day through the red/amber/green band system.

→ [Explore DUoS charges by region](../duos/)

---

## Losses

Electricity is lost as heat in wires during transmission and distribution — roughly 7–10% of what enters the grid never reaches a meter. Suppliers must account for this by buying more wholesale energy than their customers actually consume.

Each metering point is assigned a **Line Loss Factor (LLF)**, the product of a Transmission Loss Multiplier (TLM) and a Distribution Loss Factor (DLF):

$$\text{LLF} = \text{TLM} \times \text{DLF}$$

A typical domestic LLF is **1.07–1.10**, meaning a supplier buys ~8–10% more energy than the customer uses. This uplift is applied to the wholesale cost and, as a result, also amplifies the exposure to spot price volatility.

---

## The formula

Combining the layers, a simplified retail unit rate (p/kWh) looks like:

$$\text{unit rate} = \left(\frac{\text{wholesale}}{\text{LLF}} + \text{DUoS} + \text{TNUoS} + \text{levies} + \text{opex}\right) \times 1.05$$

Where:
- **wholesale / LLF** — effective wholesale cost adjusted for losses
- **DUoS** — distribution charge, region- and time-varying
- **TNUoS** — transmission charge, annually set
- **levies** — RO, FIT, CfD, Capacity Market, WHD, ECO
- **opex** — supplier operating costs and margin
- **× 1.05** — 5% VAT

The standing charge follows a parallel structure: a fixed daily sum covering metering, network connection costs, and a share of social levies, regardless of consumption.

---

## What this site covers

The model underlying this site focuses on the **network layer** — specifically DUoS charges across all 14 DNO regions from 2022/23 to 2027/28. Wholesale and levy components are not yet modelled.

→ [DUoS: Distribution charges by region](../duos/)
