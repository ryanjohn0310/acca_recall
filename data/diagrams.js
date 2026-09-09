/* =====================================================================
   Diagrams for hot spot and hot area questions.

   ACCA's hot spot questions present a graph or diagram and ask you to
   click the right part of it. These are inline SVGs so they need no
   network request, scale on a phone, and inherit the page's theme
   through currentColor and CSS custom properties.

   Each diagram declares its zones; a question references the diagram by
   id and gives the index of the correct zone.
   ===================================================================== */
const DIAGRAMS = {

  /* Mendelow's power/interest matrix — four quadrants. */
  mendelow: {
    name: "Power and interest matrix",
    vb: "0 0 340 300",
    zones: [
      { label: "Low power, low interest",  x: 46,  y: 160, w: 130, h: 110 },
      { label: "Low power, high interest", x: 46,  y: 46,  w: 130, h: 110 },
      { label: "High power, low interest", x: 180, y: 160, w: 130, h: 110 },
      { label: "High power, high interest",x: 180, y: 46,  w: 130, h: 110 }
    ],
    chrome:
      '<line x1="44" y1="278" x2="314" y2="278" class="dg-axis"/>' +
      '<line x1="44" y1="278" x2="44" y2="42" class="dg-axis"/>' +
      '<text x="179" y="296" class="dg-lab" text-anchor="middle">Power →</text>' +
      '<text x="-160" y="20" class="dg-lab" text-anchor="middle" transform="rotate(-90)">Interest →</text>' +
      '<text x="111" y="36" class="dg-tick" text-anchor="middle">Low power</text>' +
      '<text x="245" y="36" class="dg-tick" text-anchor="middle">High power</text>'
  },

  /* Maslow's hierarchy — five bands, widest at the base. */
  maslow: {
    name: "Hierarchy of needs",
    vb: "0 0 340 290",
    zones: [
      { label: "Physiological", poly: "20,270 320,270 284,220 56,220" },
      { label: "Safety",        poly: "56,218 284,218 248,168 92,168" },
      { label: "Belonging",     poly: "92,166 248,166 212,116 128,116" },
      { label: "Esteem",        poly: "128,114 212,114 176,64 164,64" },
      { label: "Self-actualisation", poly: "164,62 176,62 170,20" }
    ],
    chrome: '<text x="170" y="288" class="dg-tick" text-anchor="middle">widest need at the base</text>'
  },

  /* Two organisation charts side by side — tall against flat. */
  spans: {
    name: "Two organisation structures",
    vb: "0 0 360 250",
    zones: [
      { label: "The tall structure", x: 8,   y: 24, w: 164, h: 210 },
      { label: "The flat structure", x: 188, y: 24, w: 164, h: 210 }
    ],
    chrome:
      /* tall: one box per level, four levels */
      '<text x="90" y="18" class="dg-tick" text-anchor="middle">Structure 1</text>' +
      '<rect x="76" y="34"  width="28" height="16" class="dg-node"/>' +
      '<rect x="50" y="74"  width="28" height="16" class="dg-node"/>' +
      '<rect x="102" y="74" width="28" height="16" class="dg-node"/>' +
      '<rect x="36" y="114" width="28" height="16" class="dg-node"/>' +
      '<rect x="88" y="114" width="28" height="16" class="dg-node"/>' +
      '<rect x="36" y="154" width="28" height="16" class="dg-node"/>' +
      '<rect x="88" y="154" width="28" height="16" class="dg-node"/>' +
      '<line x1="90" y1="50" x2="64" y2="74" class="dg-link"/>' +
      '<line x1="90" y1="50" x2="116" y2="74" class="dg-link"/>' +
      '<line x1="64" y1="90" x2="50" y2="114" class="dg-link"/>' +
      '<line x1="116" y1="90" x2="102" y2="114" class="dg-link"/>' +
      '<line x1="50" y1="130" x2="50" y2="154" class="dg-link"/>' +
      '<line x1="102" y1="130" x2="102" y2="154" class="dg-link"/>' +
      /* flat: one manager over six */
      '<text x="270" y="18" class="dg-tick" text-anchor="middle">Structure 2</text>' +
      '<rect x="256" y="34" width="28" height="16" class="dg-node"/>' +
      '<rect x="196" y="98" width="24" height="16" class="dg-node"/>' +
      '<rect x="226" y="98" width="24" height="16" class="dg-node"/>' +
      '<rect x="256" y="98" width="24" height="16" class="dg-node"/>' +
      '<rect x="286" y="98" width="24" height="16" class="dg-node"/>' +
      '<rect x="316" y="98" width="24" height="16" class="dg-node"/>' +
      '<line x1="270" y1="50" x2="208" y2="98" class="dg-link"/>' +
      '<line x1="270" y1="50" x2="238" y2="98" class="dg-link"/>' +
      '<line x1="270" y1="50" x2="268" y2="98" class="dg-link"/>' +
      '<line x1="270" y1="50" x2="298" y2="98" class="dg-link"/>' +
      '<line x1="270" y1="50" x2="328" y2="98" class="dg-link"/>'
  },

  /* The three lines of a money laundering scheme. */
  laundering: {
    name: "Stages of money laundering",
    vb: "0 0 360 150",
    zones: [
      { label: "First stage",  x: 12,  y: 46, w: 100, h: 58 },
      { label: "Second stage", x: 130, y: 46, w: 100, h: 58 },
      { label: "Third stage",  x: 248, y: 46, w: 100, h: 58 }
    ],
    chrome:
      '<text x="180" y="26" class="dg-tick" text-anchor="middle">criminal cash → apparently clean funds</text>' +
      '<line x1="114" y1="75" x2="128" y2="75" class="dg-axis"/>' +
      '<line x1="232" y1="75" x2="246" y2="75" class="dg-axis"/>'
  }
};
