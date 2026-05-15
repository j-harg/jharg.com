/**
 * RAG band day-timeline chart.
 *
 * Renders a horizontal stacked-bar showing how a 24-hour day is split
 * into Red/Amber/Green DUoS bands for a given DNO.
 *
 * Usage:
 *   import { timeline } from "../components/timeline.js";
 *   const chart = timeline(bandsForDno);  // bandsForDno = bands[bscId]
 */

import * as Plot from "npm:@observablehq/plot";

const BAND_COLORS = {
  red:   "#d62828",
  amber: "#f4a261",
  green: "#52b788",
};

const BAND_LABELS = {
  red:   "Peak",
  amber: "Shoulder",
  green: "Off-peak",
};

/**
 * Format integer minutes-from-midnight as "HH:00".
 */
function fmtMin(min) {
  const h = Math.floor(min / 60);
  return `${h.toString().padStart(2, "0")}:00`;
}

/**
 * @param {Object} dnoBands  - { weekday: [...], weekend: [...] }
 *   where each element is { band, start_min, end_min }
 * @param {Object} [options]
 * @param {number} [options.width=680]
 * @returns {SVGElement} Observable Plot chart
 */
export function timeline(dnoBands, {width = 680} = {}) {
  if (!dnoBands) return null;

  const rows = [];
  for (const [day_type, intervals] of Object.entries(dnoBands)) {
    for (const {band, start_min, end_min} of intervals) {
      rows.push({day_type, band, start_min, end_min});
    }
  }

  // Only show day types that have data
  const dayTypes = [...new Set(rows.map((r) => r.day_type))].sort().reverse(); // weekday first

  return Plot.plot({
    width,
    height: dayTypes.length * 52 + 40,
    marginLeft: 90,
    marginRight: 10,
    x: {
      domain: [0, 1440],
      label: null,
      tickFormat: (d) => fmtMin(d),
      ticks: [0, 180, 360, 540, 720, 900, 1080, 1260, 1440],
    },
    y: {
      domain: dayTypes,
      label: null,
      tickFormat: (d) => (d === "weekday" ? "Weekday" : "Weekend"),
    },
    color: {
      domain: ["red", "amber", "green"],
      range: [BAND_COLORS.red, BAND_COLORS.amber, BAND_COLORS.green],
      tickFormat: (d) => BAND_LABELS[d],
      legend: true,
    },
    marks: [
      Plot.barX(rows, {
        x1: "start_min",
        x2: "end_min",
        y: "day_type",
        fill: "band",
        insetTop: 6,
        insetBottom: 6,
      }),
      Plot.ruleX([0, 1440]),
    ],
  });
}
