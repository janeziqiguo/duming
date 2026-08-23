const t = require("../data/pronunciation_table_full.json");
const by = Object.fromEntries(t.rows.map(r => [r.ascii, r]));
const norm = s => s.toLowerCase().replace(/ü/g,"v").replace(/[1-5]/g,"");

function card(name, syllables, variant="hans") {
  const rows = syllables.map(s => by[norm(s)]).filter(Boolean);
  console.log("\n" + "─".repeat(56));
  console.log("  " + name + "   " + rows.map(r=>r.respell).join("-").toUpperCase());
  console.log("─".repeat(56));
  for (const r of rows) {
    console.log("  " + r.syllable.padEnd(8) + "→  " + r.respell);
    for (const tr of r.traps) {
      console.log("      ⚠ " + tr.note_en);
      console.log("        " + (variant==="hant"?tr.note_hant:tr.note_hans));
    }
  }
}
card("徐晓晴  Xu Xiaoqing", ["xu","xiao","qing"]);
card("郑思远  Zheng Siyuan", ["zheng","si","yuan"]);
card("蔡瑞  Cai Rui", ["cai","rui"]);
card("李维  Li Wei", ["li","wei"]);
