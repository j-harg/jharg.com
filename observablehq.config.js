export default {
  root: "src",
  title: "jharg",

  // Blueprint Design System: IBM Plex Mono from Google Fonts
  head: `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>">
<script data-goatcounter="https://jharg.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>`,

  // Blueprint theme — overrides Framework variables + sets type/colour
  style: "theme.css",

  pages: [
    {
      name: "Energy",
      pages: [
        {name: "Electricity pricing: overview", path: "/electricity-pricing/"},
        {name: "DUoS: Distribution charges",   path: "/duos/"},
        {name: "TNUoS: Transmission charges",  path: "/tnuos/"},
        {name: "AAHEDC: High-cost distribution", path: "/aahedc/"},
      ]
    }
  ],

  footer: "jharg.com",
};
