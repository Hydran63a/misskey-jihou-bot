// 二十四節気・七十二候の計算
//
// 太陽の黄経（地球から見た太陽の位置の角度）から、その日の節気と候を求める。
//   ・二十四節気：黄経 15° ごとに切り替わる
//   ・七十二候　：黄経 5° ごと（1つの節気を 3つに分けたもの）
// 日付の区切りは日本時間（JST）で計算する。

// 二十四節気（立春＝黄経315°から順に、15°ずつ）
const SEKKI = [
  ["立春", "りっしゅん"], ["雨水", "うすい"], ["啓蟄", "けいちつ"],
  ["春分", "しゅんぶん"], ["清明", "せいめい"], ["穀雨", "こくう"],
  ["立夏", "りっか"], ["小満", "しょうまん"], ["芒種", "ぼうしゅ"],
  ["夏至", "げし"], ["小暑", "しょうしょ"], ["大暑", "たいしょ"],
  ["立秋", "りっしゅう"], ["処暑", "しょしょ"], ["白露", "はくろ"],
  ["秋分", "しゅうぶん"], ["寒露", "かんろ"], ["霜降", "そうこう"],
  ["立冬", "りっとう"], ["小雪", "しょうせつ"], ["大雪", "たいせつ"],
  ["冬至", "とうじ"], ["小寒", "しょうかん"], ["大寒", "だいかん"]
];

// 七十二候（立春の初候から順に、5°ずつ。本朝七十二候）
const KO = [
  ["東風解凍", "はるかぜこおりをとく"], ["黄鶯睍睆", "うぐいすなく"], ["魚上氷", "うおこおりをいずる"],
  ["土脉潤起", "つちのしょううるおいおこる"], ["霞始靆", "かすみはじめてたなびく"], ["草木萌動", "そうもくめばえいずる"],
  ["蟄虫啓戸", "すごもりむしとをひらく"], ["桃始笑", "ももはじめてさく"], ["菜虫化蝶", "なむしちょうとなる"],
  ["雀始巣", "すずめはじめてすくう"], ["櫻始開", "さくらはじめてさく"], ["雷乃発声", "かみなりすなわちこえをはっす"],
  ["玄鳥至", "つばめきたる"], ["鴻雁北", "こうがんかえる"], ["虹始見", "にじはじめてあらわる"],
  ["葭始生", "あしはじめてしょうず"], ["霜止出苗", "しもやみてなえいずる"], ["牡丹華", "ぼたんはなさく"],
  ["蛙始鳴", "かわずはじめてなく"], ["蚯蚓出", "みみずいずる"], ["竹笋生", "たけのこしょうず"],
  ["蚕起食桑", "かいこおきてくわをはむ"], ["紅花栄", "べにばなさかう"], ["麦秋至", "むぎのときいたる"],
  ["蟷螂生", "かまきりしょうず"], ["腐草為螢", "くされたるくさほたるとなる"], ["梅子黄", "うめのみきばむ"],
  ["乃東枯", "なつかれくさかるる"], ["菖蒲華", "あやめはなさく"], ["半夏生", "はんげしょうず"],
  ["温風至", "あつかぜいたる"], ["蓮始開", "はすはじめてひらく"], ["鷹乃学習", "たかすなわちわざをならう"],
  ["桐始結花", "きりはじめてはなをむすぶ"], ["土潤溽暑", "つちうるおうてむしあつし"], ["大雨時行", "たいうときどきふる"],
  ["涼風至", "すずかぜいたる"], ["寒蝉鳴", "ひぐらしなく"], ["蒙霧升降", "ふかききりまとう"],
  ["綿柎開", "わたのはなしべひらく"], ["天地始粛", "てんちはじめてさむし"], ["禾乃登", "こくものすなわちみのる"],
  ["草露白", "くさのつゆしろし"], ["鶺鴒鳴", "せきれいなく"], ["玄鳥去", "つばめさる"],
  ["雷乃収声", "かみなりすなわちこえをおさむ"], ["蟄虫坏戸", "むしかくれてとをふさぐ"], ["水始涸", "みずはじめてかるる"],
  ["鴻雁来", "こうがんきたる"], ["菊花開", "きくのはなひらく"], ["蟋蟀在戸", "きりぎりすとにあり"],
  ["霜始降", "しもはじめてふる"], ["霎時施", "こさめときどきふる"], ["楓蔦黄", "もみじつたきばむ"],
  ["山茶始開", "つばきはじめてひらく"], ["地始凍", "ちはじめてこおる"], ["金盞香", "きんせんかさく"],
  ["虹蔵不見", "にじかくれてみえず"], ["朔風払葉", "きたかぜこのはをはらう"], ["橘始黄", "たちばなはじめてきばむ"],
  ["閉塞成冬", "そらさむくふゆとなる"], ["熊蟄穴", "くまあなにこもる"], ["鱖魚群", "さけのうおむらがる"],
  ["乃東生", "なつかれくさしょうず"], ["麋角解", "さわしかのつのおつる"], ["雪下出麦", "ゆきわたりてむぎのびる"],
  ["芹乃栄", "せりすなわちさかう"], ["水泉動", "しみずあたたかをふくむ"], ["雉始雊", "きじはじめてなく"],
  ["款冬華", "ふきのはなさく"], ["水沢腹堅", "さわみずこおりつめる"], ["鶏始乳", "にわとりはじめてとやにつく"]
];

const KO_POSITION = ["初候", "次候", "末候"];
const SEASONS = ["春", "夏", "秋", "冬"];

const DAY = 24 * 60 * 60 * 1000;
const JST_OFFSET = 9 * 60 * 60 * 1000;
const toRad = deg => (deg * Math.PI) / 180;

// 太陽の視黄経（度）。精度はおよそ 0.01°（時間にして15分程度）
// 参考：J. Meeus『Astronomical Algorithms』の簡易式
function sunLongitude(date) {
  const jd = date.getTime() / DAY + 2440587.5;   // ユリウス日
  const t = (jd - 2451545.0) / 36525;            // J2000.0 からのユリウス世紀

  const l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
  const m = toRad(357.52911 + 35999.05029 * t - 0.0001537 * t * t);
  const c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(m)
    + (0.019993 - 0.000101 * t) * Math.sin(2 * m)
    + 0.000289 * Math.sin(3 * m);
  const omega = toRad(125.04 - 1934.136 * t);
  const lambda = l0 + c - 0.00569 - 0.00478 * Math.sin(omega);

  return ((lambda % 360) + 360) % 360;
}

// 黄経から「立春の初候を0番目とした候の番号（0〜71）」を求める
function koIndexAt(date) {
  return Math.floor(((sunLongitude(date) - 315 + 360) % 360) / 5);
}

// "2026-11-21" の日（JST）の終わり＝翌日0時（JST）の時刻
function endOfJstDay(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1) - JST_OFFSET);
}

// dateKey の日（JST）が属する候の番号
// その日のうちに黄経が切り替われば、その日から新しい候とみなす
function koIndexOfDay(dateKey) {
  return koIndexAt(endOfJstDay(dateKey));
}

// dateKey に n 日足した日付文字列
function addDays(dateKey, n) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// その日の暦をまとめて返す（dateKey は "YYYY-MM-DD"）
function getCalendar(dateKey) {
  const koIndex = koIndexOfDay(dateKey);
  const sekkiIndex = Math.floor(koIndex / 3);
  const [sekkiName, sekkiReading] = SEKKI[sekkiIndex];
  const [koName, koReading] = KO[koIndex];

  // 節気の何日目か
  const dayOfSekki = Math.round(
    (Date.parse(dateKey) - Date.parse(findSekkiStart(dateKey, sekkiIndex))) / DAY
  ) + 1;

  // 次の節気まであと何日か
  let daysToNext = 1;
  while (Math.floor(koIndexOfDay(addDays(dateKey, daysToNext)) / 3) === sekkiIndex) {
    daysToNext++;
  }
  const [nextName, nextReading] = SEKKI[(sekkiIndex + 1) % 24];

  return {
    season: SEASONS[Math.floor(sekkiIndex / 6)],
    sekki: { name: sekkiName, reading: sekkiReading, day: dayOfSekki },
    ko: {
      name: koName,
      reading: koReading,
      position: `${sekkiName}の${KO_POSITION[koIndex % 3]}`
    },
    nextSekki: { name: nextName, reading: nextReading, daysUntil: daysToNext }
  };
}

// 節気の始まる日（その節気に入った最初の日）を探す
function findSekkiStart(dateKey, sekkiIndex) {
  let day = dateKey;
  while (Math.floor(koIndexOfDay(addDays(day, -1)) / 3) === sekkiIndex) {
    day = addDays(day, -1);
  }
  return day;
}

// プロンプトに渡す文章
// detail: false なら季節だけ（節気や候の名前を渡すと、AIが書いてしまうため）
function formatCalendar(dateKey, { detail = true } = {}) {
  const c = getCalendar(dateKey);

  if (!detail) {
    return `【今日の暦】
・暦の上の季節：${c.season}`;
  }

  const next = c.nextSekki.daysUntil === 1
    ? `明日から「${c.nextSekki.name}（${c.nextSekki.reading}）」`
    : `次の節気「${c.nextSekki.name}（${c.nextSekki.reading}）」まであと${c.nextSekki.daysUntil}日`;

  const sekkiLine = c.sekki.day === 1
    ? `今日から「${c.sekki.name}（${c.sekki.reading}）」に入りました（1日目）`
    : `${c.sekki.name}（${c.sekki.reading}）の${c.sekki.day}日目`;

  return `【今日の暦】（計算で求めた正しい情報。これ以外の暦の情報は書かない）
・暦の上の季節：${c.season}
・二十四節気：${sekkiLine}
・七十二候：${c.ko.position}「${c.ko.name}（${c.ko.reading}）」
・${next}`;
}

// 文章に書かれた暦が、その日の暦と合っているかを調べる
// allowCalendar が false のときは、暦の名前が1つでも入っていたら不合格
// 戻り値：問題がなければ null、あれば理由の文字列
function checkCalendarText(text, dateKey, allowCalendar) {
  const c = getCalendar(dateKey);

  const mentionedSekki = SEKKI.map(([name]) => name).filter(name => text.includes(name));
  const mentionedKo = KO.map(([name]) => name).filter(name => text.includes(name));
  const mentionedPosition = KO_POSITION.filter(position => text.includes(position));

  if (!allowCalendar) {
    const names = [...mentionedSekki, ...mentionedKo];
    return names.length ? `暦の話をしない回なのに「${names.join("・")}」が入っている` : null;
  }

  // 今日の節気と、次の節気（「明日から〇〇」などのため）だけを許す
  const okSekki = [c.sekki.name, c.nextSekki.name];
  const wrongSekki = mentionedSekki.filter(name => !okSekki.includes(name));
  if (wrongSekki.length) return `今日の暦にない節気「${wrongSekki.join("・")}」が入っている`;

  const wrongKo = mentionedKo.filter(name => name !== c.ko.name);
  if (wrongKo.length) return `今日の暦にない候「${wrongKo.join("・")}」が入っている`;

  const correctPosition = KO_POSITION[KO.findIndex(([name]) => name === c.ko.name) % 3];
  const wrongPosition = mentionedPosition.filter(position => position !== correctPosition);
  if (wrongPosition.length) return `「${wrongPosition.join("・")}」と書いているが、正しくは${correctPosition}`;

  return null;
}

module.exports = {
  sunLongitude,
  getCalendar,
  formatCalendar,
  checkCalendarText
};
