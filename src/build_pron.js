const fs = require('fs');

// ---------------------------------------------------------------
// SCOPE: syllables that occur in Chinese personal names.
// Deliberately EXCLUDES interjection-only syllables (yo 哟, lo 咯, ê 欸,
// m/n/ng/hm/hng). A reviewer flagged these as missing; they are excluded by
// design because this is a name tool, not a dictionary. Documented, not silent.
// ---------------------------------------------------------------
const INVENTORY = {
  b: "ba bo bai bei bao ban ben bang beng bi bie biao bian bin bing bu",
  p: "pa po pai pei pao pou pan pen pang peng pi pie piao pian pin ping pu",
  m: "ma mo me mai mei mao mou man men mang meng mi mie miao miu mian min ming mu",
  f: "fa fo fei fou fan fen fang feng fu",
  d: "da de dai dei dao dou dan den dang deng dong di die diao diu dian ding du duo dui duan dun",
  t: "ta te tai tao tou tan tang teng tong ti tie tiao tian ting tu tuo tui tuan tun",
  n: "na ne nai nei nao nou nan nen nang neng nong ni nie niao niu nian nin niang ning nu nuo nuan nv nve",
  l: "la le lai lei lao lou lan lang leng long li lia lie liao liu lian lin liang ling lu luo luan lun lv lve",
  g: "ga ge gai gei gao gou gan gen gang geng gong gu gua guo guai gui guan gun guang",
  k: "ka ke kai kei kao kou kan ken kang keng kong ku kua kuo kuai kui kuan kun kuang",
  h: "ha he hai hei hao hou han hen hang heng hong hu hua huo huai hui huan hun huang",
  j: "ji jia jie jiao jiu jian jin jiang jing jiong ju jue juan jun",
  q: "qi qia qie qiao qiu qian qin qiang qing qiong qu que quan qun",
  x: "xi xia xie xiao xiu xian xin xiang xing xiong xu xue xuan xun",
  zh: "zha zhe zhi zhai zhei zhao zhou zhan zhen zhang zheng zhong zhu zhua zhuo zhuai zhui zhuan zhun zhuang",
  ch: "cha che chi chai chao chou chan chen chang cheng chong chu chua chuo chuai chui chuan chun chuang",
  sh: "sha she shi shai shei shao shou shan shen shang sheng shu shua shuo shuai shui shuan shun shuang",
  r: "re ri rao rou ran ren rang reng rong ru rua ruo rui ruan run",
  z: "za ze zi zai zei zao zou zan zen zang zeng zong zu zuo zui zuan zun",
  c: "ca ce ci cai cao cou can cen cang ceng cong cu cuo cui cuan cun",
  s: "sa se si sai sao sou san sen sang seng song su suo sui suan sun",
  "": "a o e ai ei ao ou an en ang eng er yi ya ye yao you yan yin yang ying yong wu wa wo wai wei wan wen wang weng yu yue yuan yun"
};

// Colloquial / northern-speech syllables. Kept so pasted input resolves, but
// flagged: they are not standard name-forming syllables.
const COLLOQUIAL = new Set(["kei", "rua", "zhei", "dei", "shei", "zei", "den"]);

const INITIALS = {
  b:"b", p:"p", m:"m", f:"f", d:"d", t:"t", n:"n", l:"l", g:"g", k:"k", h:"h",
  j:"j", q:"ch", x:"sh", zh:"j", ch:"ch", sh:"sh", r:"r", z:"dz", c:"ts", s:"s", "":""
};

// severity: 3 =英语读者几乎必然读错  2 = 很可能读错  1 = 偏差较小但值得一提
const T = (label, sev, en, hans, hant) => ({ label, sev, en, hans, hant });

const INITIAL_TRAPS = {
  q: T("q", 3, "Pinyin q is a 'ch' sound — never the 'kw' in queen.",
       "英语母语者看到 q 会读成 kw，需要说明这是 ch 的音。", "英語母語者看到 q 會讀成 kw，需要說明這是 ch 的音。"),
  x: T("x", 3, "Pinyin x is close to 'sh' — not 'ks' or 'z'.",
       "x 是最容易读错的字母，英语里没有对应，最接近 sh。", "x 是最容易讀錯的字母，英語裡沒有對應，最接近 sh。"),
  zh: T("zh", 3, "zh is the 'j' in judge.",
       "zh 读作 j，英语母语者常读成 z 的浊音。", "zh 讀作 j，英語母語者常讀成 z 的濁音。"),
  c: T("c", 3, "Pinyin c is 'ts' as in cats — say the t and s together, not a k or s.",
       "c 读作 ts（如 cats 词尾），要把 t 和 s 连读，英语母语者几乎总会读成 k 或 s。",
       "c 讀作 ts（如 cats 詞尾），要把 t 和 s 連讀，英語母語者幾乎總會讀成 k 或 s。"),
  z: T("z", 3, "Pinyin z is 'dz' — say the d and z together, as in kids.",
       "z 读作 dz（如 kids 词尾），d 和 z 要连读。", "z 讀作 dz（如 kids 詞尾），d 和 z 要連讀。"),
  r: T("r", 3, "Between an English r and the s in measure — curl the tongue back.",
       "r 介于英语 r 与 measure 的 s 之间，舌尖后卷。", "r 介於英語 r 與 measure 的 s 之間，舌尖後捲。")
};

const FINALS = {
  a:"ah", o:"aw", e:"uh", i:"ee", u:"oo", v:"yew",
  ai:"eye", ei:"ay", ao:"ow", ou:"oh",
  an:"ahn", en:"un", ang:"ahng", eng:"ung", ong:"oong", er:"urr",
  ia:"yah", ie:"yeh", iao:"yow", iu:"yoh", ian:"yen",
  in:"een", iang:"yahng", ing:"ing", iong:"yoong",
  ua:"wah", uo:"waw", uai:"why", ui:"way",
  uan:"wahn", un:"wun", uang:"wahng", ueng:"wung",
  ve:"yweh", van:"ywen", vn:"yewn"
};

const FINAL_TRAPS = {
  ian: T("ian",3,"ian is 'yen', not 'ee-an'.","ian 读作 yen，这是极常见的误读。","ian 讀作 yen，這是極常見的誤讀。"),
  ie:  T("ie",3,"ie is 'yeh' — resist the English 'eye' in die, tie, pie.",
        "ie 读作 yeh；英语的 die/tie/pie 会强烈诱导读成 eye 的音。","ie 讀作 yeh；英語的 die/tie/pie 會強烈誘導讀成 eye 的音。"),
  ui:  T("ui",2,"ui sounds like 'way', not 'oo-ee'.","ui 读作 way，英语母语者常拆成 oo-ee。","ui 讀作 way，英語母語者常拆成 oo-ee。"),
  iu:  T("iu",2,"iu is a single glide, 'yoh' — not 'ee-oo'.","iu 是一个滑音，读作 yoh。","iu 是一個滑音，讀作 yoh。"),
  e:   T("e",2,"This e is an 'uh' sound, like the u in run.","e 是 uh 的音，不是英语 e 的音。","e 是 uh 的音，不是英語 e 的音。"),
  en:  T("en",2,"en rhymes with 'un', not 'en' in pen.","en 读作 un。","en 讀作 un。"),
  eng: T("eng",2,"eng rhymes with 'ung', not 'eng' in length.","eng 读作 ung。","eng 讀作 ung。"),
  ao:  T("ao",2,"ao is 'ow' as in cow.","ao 读作 ow，如 cow。","ao 讀作 ow，如 cow。"),
  ai:  T("ai",2,"ai is 'eye', not 'ay'.","ai 读作 eye，不是 ay。","ai 讀作 eye，不是 ay。"),
  ou:  T("ou",2,"ou is a long 'oh', not 'ow'.","ou 读作 oh，不是 ow。","ou 讀作 oh，不是 ow。"),
  uo:  T("uo",2,"uo is one gliding sound, 'waw' — don't split it.","uo 是一个滑音，不要拆成两个音节。","uo 是一個滑音，不要拆成兩個音節。"),
  ong: T("ong",2,"The oo is short, as in book — not the long oo in moon.",
        "ong 的 oo 是 book 里的短音，不是 moon 的长音。","ong 的 oo 是 book 裡的短音，不是 moon 的長音。"),
  er:  T("er",2,"er is 'urr' with the tongue curled — not 'ar' as in car.",
        "er 读作 urr，舌尖上卷，不是 car 的 ar。","er 讀作 urr，舌尖上捲，不是 car 的 ar。"),
  v:   T("ü",3,"Round your lips as if saying 'oo' but say 'ee'.",
        "ü 在英语中没有对应音，yew 是最接近的近似。","ü 在英語中沒有對應音，yew 是最接近的近似。"),
  ve:  T("üe",3,"Start with the ü lip-round, then glide to 'eh'.",
        "üe 先摆出 ü 的口型再滑向 eh。","üe 先擺出 ü 的口型再滑向 eh。"),
  van: T("üan",3,"üan ends in 'yen', not 'wahn'.","üan 结尾是 yen，不是 wahn。","üan 結尾是 yen，不是 wahn。"),
  vn:  T("ün",3,"ün keeps the ü lip-round before the n.","ün 保持 ü 的口型再收 n。","ün 保持 ü 的口型再收 n。"),
  bpmf_o: T("o",2,"After b/p/m/f the o carries a hidden w glide — 'waw', not 'oh'.",
        "b p m f 后的 o 带有隐含的 w 滑音，读作 waw 而非 oh。","b p m f 後的 o 帶有隱含的 w 滑音，讀作 waw 而非 oh。"),
  // Added after review: milder but systematic English misreadings.
  u:   T("u",1,"Pinyin u is always 'oo' as in moon — English u rarely reads that way.",
        "拼音 u 恒为 oo 的音，英语的 u 很少这样读。","拼音 u 恆為 oo 的音，英語的 u 很少這樣讀。"),
  in:  T("in",1,"in is 'een' — a longer vowel than English 'in'.",
        "in 的元音比英语 in 更长更前。","in 的元音比英語 in 更長更前。"),
  ing: T("ing",1,"The i is longer than the English -ing ending.",
        "ing 的 i 比英语 -ing 词尾更长更前，但差异较小。","ing 的 i 比英語 -ing 詞尾更長更前，但差異較小。"),
  ei:  T("ei",1,"ei is 'ay' as in day — English ei is unreliable (either, height, vein).",
        "ei 读作 ay；英语的 ei 拼写读音极不稳定。","ei 讀作 ay；英語的 ei 拼寫讀音極不穩定。")
};

const ZERO_SPELL = T("y/w",1,"The y and w here are spelling rules, not extra consonants.",
  "零声母的 y/w 只是拼写规则，不是额外的辅音。","零聲母的 y/w 只是拼寫規則，不是額外的輔音。");

// ---- Buzzed apical vowel after zh ch sh r z c s ----
// Reviewer was right that jr/chr/shr/r are not readable as syllables.
// zh/ch/sh now use a real English-shaped syllable. z/c/s/r have NO adequate
// English respelling and are flagged needs_audio.
const BUZZ = {
  zh: { respell:"jur",  audio:false },
  ch: { respell:"chur", audio:false },
  sh: { respell:"shur", audio:false },
  r:  { respell:"rr",   audio:true  },
  z:  { respell:"dzz",  audio:true  },
  c:  { respell:"tsz",  audio:true  },
  s:  { respell:"sz",   audio:true  }
};
const BUZZ_TRAP = T("i",3,"This i is a held buzz on the tongue, not 'ee'.",
  "这里的 i 不是 ee 的音，而是舌位保持的嗡音。","這裡的 i 不是 ee 的音，而是舌位保持的嗡音。");

const BPMF_O = new Set(["b","p","m","f"]);

const ZERO_OVERRIDES = {
  yi:"ee", ya:"yah", ye:"yeh", yao:"yow", you:"yoh", yan:"yen",
  yin:"een", yang:"yahng", ying:"ing", yong:"yoong",
  wu:"oo", wa:"wah", wo:"waw", wai:"why", wei:"way",
  wan:"wahn", wen:"wun", wang:"wahng", weng:"wung",
  yu:"yew", yue:"yweh", yuan:"ywen", yun:"yewn",
  a:"ah", o:"aw", e:"uh", ai:"eye", ei:"ay", ao:"ow", ou:"oh",
  an:"ahn", en:"un", ang:"ahng", eng:"ung", er:"urr"
};
const ZERO_TRAPS = {
  yi:[ZERO_SPELL], ya:[ZERO_SPELL], ye:[FINAL_TRAPS.ie,ZERO_SPELL],
  yao:[FINAL_TRAPS.ao], you:[FINAL_TRAPS.ou], yan:[FINAL_TRAPS.ian],
  yin:[FINAL_TRAPS.in,ZERO_SPELL], yang:[ZERO_SPELL], ying:[FINAL_TRAPS.ing,ZERO_SPELL],
  yong:[FINAL_TRAPS.ong], wu:[FINAL_TRAPS.u,ZERO_SPELL], wa:[ZERO_SPELL],
  wo:[FINAL_TRAPS.uo], wai:[ZERO_SPELL], wei:[FINAL_TRAPS.ui],
  wan:[ZERO_SPELL], wen:[FINAL_TRAPS.en], wang:[ZERO_SPELL], weng:[FINAL_TRAPS.eng],
  yu:[FINAL_TRAPS.v], yue:[FINAL_TRAPS.ve], yuan:[FINAL_TRAPS.van], yun:[FINAL_TRAPS.vn],
  o:[FINAL_TRAPS.bpmf_o], e:[FINAL_TRAPS.e], ai:[FINAL_TRAPS.ai], ei:[FINAL_TRAPS.ei],
  ao:[FINAL_TRAPS.ao], ou:[FINAL_TRAPS.ou], en:[FINAL_TRAPS.en], eng:[FINAL_TRAPS.eng],
  er:[FINAL_TRAPS.er]
};

// Confirmed against CMU pronouncing dictionary: these respellings are real
// English words whose actual pronunciation differs from the target.
const COLLISION_OVERRIDES = {
  shao:"shaow", chao:"chaow", zhao:"jaow", bao:"baow", lao:"laow",
  mao:"maow", rao:"raow", sao:"saow", tao:"taow",
  bin:"bean",     // CMUdict: been = /B IH1 N/, not /biːn/
  zheng:"juhng"   // CMUdict: jung = /UH/, plus the Carl Jung association
};

function buildRow(initial, syllable) {
  const final = initial === "" ? syllable : syllable.slice(initial.length);
  let respell, traps = [], needsAudio = false;

  if (initial === "") {
    respell = ZERO_OVERRIDES[syllable];
    if (!respell) throw new Error("no zero-initial mapping for " + syllable);
    traps.push(...(ZERO_TRAPS[syllable] || []));
  } else {
    const initPart = INITIALS[initial];
    if (initPart === undefined) throw new Error("unknown initial " + initial);

    if (final === "i" && BUZZ[initial]) {
      respell = BUZZ[initial].respell;
      needsAudio = BUZZ[initial].audio;
      traps.push(BUZZ_TRAP);
      if (INITIAL_TRAPS[initial]) traps.push(INITIAL_TRAPS[initial]);
    } else {
      const isJQX = ["j","q","x"].includes(initial);
      const JQX_U = { u:["yew",FINAL_TRAPS.v], ue:["yweh",FINAL_TRAPS.ve],
                      uan:["ywen",FINAL_TRAPS.van], un:["yewn",FINAL_TRAPS.vn] };
      let finalPart;
      if (isJQX && JQX_U[final]) {
        finalPart = JQX_U[final][0];
        traps.push(JQX_U[final][1]);
      } else {
        finalPart = FINALS[final];
        if (finalPart === undefined) throw new Error("unknown final '"+final+"' in "+syllable);
      }
      if (final === "o" && BPMF_O.has(initial)) traps.push(FINAL_TRAPS.bpmf_o);
      respell = initPart + finalPart;
      if (INITIAL_TRAPS[initial]) traps.push(INITIAL_TRAPS[initial]);
      if (!(isJQX && JQX_U[final]) && FINAL_TRAPS[final]) traps.push(FINAL_TRAPS[final]);
    }
  }

  if (COLLISION_OVERRIDES[syllable]) respell = COLLISION_OVERRIDES[syllable];

  // Most severe traps first, then dedupe, then cap at 2 — more than two notes
  // on one syllable makes the card unreadable.
  const seen = new Set();
  traps = traps.filter(Boolean).sort((a,b) => b.sev - a.sev)
               .filter(t => !seen.has(t.label) && seen.add(t.label)).slice(0,2);

  const display = syllable.replace(/v/g,"ü");
  return {
    syllable: display,
    ascii: syllable,
    initial: initial || null,
    final: final.replace(/v/g,"ü"),
    respell,
    needs_audio: needsAudio,
    colloquial: COLLOQUIAL.has(syllable),
    traps: traps.map(t => ({ label:t.label, severity:t.sev,
      note_en:t.en, note_hans:t.hans, note_hant:t.hant }))
  };
}

const rows = [];
for (const [initial,list] of Object.entries(INVENTORY))
  for (const syl of list.trim().split(/\s+/)) rows.push(buildRow(initial,syl));
rows.sort((a,b)=>a.ascii.localeCompare(b.ascii));

const out = {
  _meta: {
    name:"pronunciation_table", version:2,
    row_count: rows.length,
    trapped_count: rows.filter(r=>r.traps.length).length,
    needs_audio_count: rows.filter(r=>r.needs_audio).length,
    scope:"Syllables occurring in Chinese personal names. Interjection-only syllables (yo, lo, ê, m, n, ng, hm, hng) are excluded by design.",
    tones:"Omitted by design. Recommend an optional tone-mark toggle at the product level rather than in this table.",
    caveats:[
      "Respellings are approximations for English readers, not IPA.",
      "needs_audio rows have no adequate English respelling and require an audio clip.",
      "Collision overrides were verified against the CMU pronouncing dictionary.",
      "Still requires blind first-read testing with native English speakers."
    ]
  },
  rows
};
fs.writeFileSync(require("path").join(__dirname,"..","data","pronunciation_table_full.json"), JSON.stringify(out,null,2));
console.log("rows:",rows.length,"| trapped:",out._meta.trapped_count,"| needs_audio:",out._meta.needs_audio_count);
