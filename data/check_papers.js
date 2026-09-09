const fs = require("fs");
const files = process.argv.slice(2);
const src = files.map(f => fs.readFileSync(f, "utf8")).join("\n");
const run = new Function(src + "\n; return {PAPERS, CAP_OF};");
const { PAPERS, CAP_OF } = run();
let bad = 0;
const seen = {};
PAPERS.forEach(p => {
  const caps = {};
  const add = (c, m) => { const k = CAP_OF[c]; if(!k){ console.log("  !! no capability for chapter", c); bad++; } caps[k] = (caps[k]||0) + m; };
  p.a1.forEach(q => add(q.c,1)); p.a2.forEach(q => add(q.c,2)); p.b.forEach(q => add(q.c,4));
  const total = p.a1.length + p.a2.length*2 + p.b.length*4;
  console.log(p.name, "| 1-mark:", p.a1.length, " 2-mark:", p.a2.length, " MTQ:", p.b.length, " | TOTAL", total, total===100?"OK":"*** NOT 100 ***");
  if(total !== 100) bad++;
  if(p.a1.length !== 16 || p.a2.length !== 30 || p.b.length !== 6) bad++;
  console.log("  marks by capability:", JSON.stringify(caps));
  const check = (q, where) => {
    if(!q.o || q.o.length < 2){ console.log("  !! options", where); bad++; }
    const arr = Array.isArray(q.a) ? q.a : [q.a];
    arr.forEach(x => { if(typeof x !== "number" || x < 0 || x >= q.o.length){ console.log("  !! answer index", where, q.q); bad++; } });
    if(new Set(arr).size !== arr.length){ console.log("  !! duplicate answer index", where); bad++; }
    if(!q.e || q.e.length < 20){ console.log("  !! thin explanation", where, q.q); bad++; }
    if(new Set(q.o).size !== q.o.length){ console.log("  !! duplicate option text", where, q.q); bad++; }
    const key = q.q.slice(0,60);
    if(seen[key]){ console.log("  !! duplicate stem across papers:", key); bad++; }
    seen[key] = 1;
  };
  p.a1.forEach((q,i) => check(q, p.name+" A1#"+(i+1)));
  p.a2.forEach((q,i) => check(q, p.name+" A2#"+(i+1)));
  p.b.forEach((m,i) => {
    if(m.t.length !== 2){ console.log("  !! MTQ tasks", m.c); bad++; }
    if(!m.s || m.s.length < 60){ console.log("  !! thin scenario", m.c); bad++; }
    m.t.forEach((t,j) => check(t, p.name+" B"+(i+1)+"."+(j+1)));
  });
  const bc = p.b.map(m => CAP_OF[m.c]).sort().join("");
  console.log("  section B capabilities:", bc, bc === "ABCDEF" ? "OK" : "*** MISMATCH ***");
  if(bc !== "ABCDEF") bad++;
});
console.log(bad ? "\nPROBLEMS: " + bad : "\nAll checks passed.");
