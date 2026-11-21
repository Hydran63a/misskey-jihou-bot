// 月齢と月の満ち欠けの計算
//
// 太陽と月の黄経の差（離角）から、月の形を求める。
//   離角   0° … 新月 → 90° … 上弦 → 180° … 満月 → 270° … 下弦
// 精度は月齢でおよそ ±0.3日。

const { sunLongitude } = require("./calendar");

const DAY = 24 * 60 * 60 * 1000;
const JST_OFFSET = 9 * 60 * 60 * 1000;
const SYNODIC_MONTH = 29.530589;   // 新月から次の新月までの平均日数
const toRad = deg => (deg * Math.PI) / 180;
const normalize = deg => ((deg % 360) + 360) % 360;

// 月の黄経（度）。参考：J. Meeus『Astronomical Algorithms』の簡易式（主要な6項）
function moonLongitude(date) {
  const d = date.getTime() / DAY + 2440587.5 - 2451545.0;   // J2000.0 からの日数

  const l = 218.316 + 13.176396 * d;           // 月の平均黄経
  const mMoon = toRad(134.963 + 13.064993 * d); // 月の平均近点角
  const mSun = toRad(357.529 + 0.98560028 * d); // 太陽の平均近点角
  const dElong = toRad(297.850 + 12.190749 * d); // 平均離角
  const f = toRad(93.272 + 13.229350 * d);      // 月の平均昇交点離角

  return normalize(
    l
    + 6.289 * Math.sin(mMoon)
    - 1.274 * Math.sin(2 * dElong - mMoon)
    + 0.658 * Math.sin(2 * dElong)
    + 0.214 * Math.sin(2 * mMoon)
    - 0.186 * Math.sin(mSun)
    - 0.114 * Math.sin(2 * f)
  );
}

// 月の形の区分（離角の範囲ごと）
// keywords: 文章に書いてよい月の形の言葉
// phrases : 「満月に向かって」のように、別の形の名前を含んでも正しい言い方
const PHASES = [
  { until: 15, name: "新月", note: "月はほとんど見えない", keywords: ["新月"], phrases: [] },
  { until: 60, name: "三日月のころ", note: "夕方の西の空に細い月が見える", keywords: ["三日月", "細い月", "若月"], phrases: ["新月を過ぎ", "新月から"] },
  { until: 120, name: "上弦の月のころ", note: "夕方から夜にかけて半月が見える", keywords: ["上弦", "半月"], phrases: ["満月に向かって"] },
  { until: 165, name: "満月に向かってふくらむ月", note: "夜の空に明るい月が見える", keywords: ["十三夜", "満ちていく", "ふくらんで"], phrases: ["満月に向かって", "満月まで", "満月前", "もうすぐ満月"] },
  { until: 195, name: "満月のころ", note: "夜通し丸い月が見える", keywords: ["満月", "十五夜", "まんまる", "十六夜"], phrases: [] },
  { until: 240, name: "満月から欠けていく月", note: "夜遅くに明るい月が昇る", keywords: ["十六夜", "立待月", "居待月", "寝待月", "欠けていく", "欠けはじめ"], phrases: ["満月を過ぎ", "満月から"] },
  { until: 300, name: "下弦の月のころ", note: "夜更けに半月が昇り、朝まで見える", keywords: ["下弦", "半月"], phrases: ["新月に向かって"] },
  { until: 345, name: "明け方の細い月", note: "明け方の東の空に細い月が見える", keywords: ["有明", "細い月", "明け方の月"], phrases: ["新月に向かって", "もうすぐ新月"] },
  { until: 360, name: "新月", note: "月はほとんど見えない", keywords: ["新月"], phrases: [] }
];

// 文章チェック用：月の形を表す言葉の一覧
const ALL_PHASE_WORDS = [...new Set(PHASES.flatMap(phase => phase.keywords))];

// "2026-11-21" と時刻（0〜23）から、日本時間でのその時刻の Date を作る
function jstDate(dateKey, hour) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour) - JST_OFFSET);
}

// 月の情報をまとめて返す
function getMoon(date) {
  const elongation = normalize(moonLongitude(date) - sunLongitude(date));
  const phase = PHASES.find(p => elongation < p.until);

  return {
    elongation,
    age: (elongation / 360) * SYNODIC_MONTH,
    illumination: (1 - Math.cos(toRad(elongation))) / 2,
    ...phase
  };
}

// プロンプトに渡す文章
function formatMoon(dateKey, hour) {
  const moon = getMoon(jstDate(dateKey, hour));

  return `【今夜の月】（計算で求めた正しい情報。これ以外の月の情報は書かない）
・月の形：${moon.name}
・見え方：${moon.note}
・月齢や割合などの数値は書かない`;
}

// 文章に書かれた月の形が合っているかを調べる（問題がなければ null）
// allowMoon が false のときは、月の形の言葉が入っていたら不合格
function checkMoonText(text, dateKey, hour, allowMoon) {
  const moon = getMoon(jstDate(dateKey, hour));

  // 「満月に向かって」などの正しい言い方は、照合の前に取り除く
  if (allowMoon) {
    for (const phrase of moon.phrases) text = text.replaceAll(phrase, "");
  }

  const mentioned = ALL_PHASE_WORDS.filter(word => text.includes(word));

  if (mentioned.length === 0) return null;

  if (!allowMoon) {
    return `月の話をしない回なのに「${mentioned.join("・")}」が入っている`;
  }

  const wrong = mentioned.filter(word => !moon.keywords.includes(word));

  return wrong.length
    ? `「${wrong.join("・")}」と書いているが、今は${moon.name}`
    : null;
}

module.exports = {
  moonLongitude,
  getMoon,
  formatMoon,
  checkMoonText
};
