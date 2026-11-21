// 毎時の時報

const { TIMEZONE } = require("../config");
const { character, formatHourlyHeader } = require("../character");
const { getNow, getTimeBand } = require("../lib/time");
const { checkCalendarText } = require("../lib/calendar");
const { generateText } = require("../ai/gemini");
const { composePost, formatPreviousPosts } = require("../ai/compose");
const {
  getRecentDishes,
  splitDishes,
  saveMeal
} = require("../store/meals");
const {
  ANNIVERSARY_HOUR,
  fetchAnniversaries,
  generateAnniversaryPost
} = require("./anniversary");
const {
  getFallbackMessage,
  generateUnique,
  publish
} = require("./common");

// 献立を話題にする時刻
const MEAL_SLOTS = [
  { name: "朝食", hour: 8 },
  { name: "昼食", hour: 12 },
  { name: "夕食", hour: 18 }
];

// 毎日出てきても不自然ではない主食など（重複チェックから外す）
// 例：ご飯 / 白ごはん / 玄米ご飯 / 白米 / 雑穀米 / パン / 緑茶
const STAPLE_PATTERN = /^((白|玄米|麦|雑穀|五穀|十六穀)?(ご飯|ごはん|御飯)|(白|玄|雑穀|麦)?米|パン|食パン|(緑|麦|ほうじ)?茶)$/;
const isStaple = dish => STAPLE_PATTERN.test(dish);

// 献立の作り直し回数
const MEAL_RETRIES = 3;

// 最近の献立と重なっている料理を返す（主食は除く）
function findRepeatedDishes(meal, recentDishes) {
  return splitDishes(meal).filter(
    dish => !isStaple(dish) && recentDishes.includes(dish)
  );
}

// 献立を1つ生成して記録する（失敗したら null）
async function generateMeal(now, slot) {
  const recentDishes = getRecentDishes();
  const avoid = recentDishes.filter(dish => !isStaple(dish));

  const avoidRule = avoid.length
    ? `・最近の献立に出た次の料理は使わない：${[...new Set(avoid)].join("、")}`
    : "";

  try {
    for (let attempt = 1; attempt <= MEAL_RETRIES; attempt++) {
      const text = await generateText(`${now.dateLabel}の${slot.name}の献立を1つ考えてください。

・具体的な料理名を使う
・献立だけを「、」区切りで1行で出力する（例：主菜、主食、汁物）
・前置き、説明、絵文字は付けない
・季節に合った自然な献立にする
${avoidRule}`);

      const meal = text.split("\n")[0].replace(/^[・\-\s「]+|[」\s]+$/g, "");

      if (!meal) continue;

      const repeated = findRepeatedDishes(meal, recentDishes);

      if (repeated.length === 0) {
        saveMeal(now.dateKey, slot.name, meal);
        console.log(`${slot.name}: 献立「${meal}」`);
        return meal;
      }

      console.log(`${slot.name}: 最近の献立と重なったので作り直し（${repeated.join("、")}）`);
    }

    return null;

  } catch (error) {
    console.error(`${slot.name}: 献立生成失敗:`, error.message);
    return null;
  }
}

// 食事の話題に関するルール（hasMeal: 献立が決まったかどうか）
async function getMealRule(now) {
  const slot = MEAL_SLOTS.find(slot => slot.hour === now.hour);
  const meal = slot && await generateMeal(now, slot);

  if (!meal) {
    return {
      hasMeal: false,
      rule: `【食事に関する厳守ルール】
・食事や料理に関する話題を一切出さない
・料理名、食材、献立、食事の予定にも言及しない`
    };
  }

  return {
    hasMeal: true,
    rule: `【食事に関するルール】
・今は${slot.name}の時間で、今日の${slot.name}は「${meal}」に決まっている
・この献立を中心に、自然な時報にする
・この献立を変更・追加しない`
  };
}

// 最近使った話題（同じ話題が続かないようにする）
const recentTopics = [];
const RECENT_TOPIC_LIMIT = 5;

// 時間帯の候補から、最近使っていない話題をランダムに1つ選ぶ（候補がなければ null）
function pickTopic(hour) {
  const list = character.topics[getTimeBand(hour)];

  if (!Array.isArray(list) || list.length === 0) return null;

  const fresh = list.filter(topic => !recentTopics.includes(topic));
  const candidates = fresh.length > 0 ? fresh : list;
  const topic = candidates[Math.floor(Math.random() * candidates.length)];

  recentTopics.push(topic);
  if (recentTopics.length > RECENT_TOPIC_LIMIT) recentTopics.shift();

  return topic;
}

// 気遣いの一言を入れる割合（0.4 = 10回に4回くらい）
const CARE_RATE = 0.4;

// 暦の話をする割合（話題の候補が暦のとき以外）
const CALENDAR_RATE = 0.2;

// 暦の誤りがあったときに作り直す回数
const CALENDAR_CHECK_RETRIES = 3;

// 暦の話を最後にした日（同じ日に何度も暦の話をしないようにする）
let lastCalendarDay = null;

// 今回の時報で暦（二十四節気・七十二候）の話をしてよいか
function shouldTalkAboutCalendar(now, topic) {
  // 話題の候補が暦そのものなら、話してよい
  if (topic && /暦|節気|候/.test(topic)) {
    lastCalendarDay = now.dateKey;
    return true;
  }

  // それ以外は1日1回まで、確率で決める
  if (lastCalendarDay === now.dateKey) return false;

  if (Math.random() < CALENDAR_RATE) {
    lastCalendarDay = now.dateKey;
    return true;
  }

  return false;
}

// 通常の時報の文章を生成する
async function generateHourlyMessage(now, meal, previousPosts) {
  const motifRule = character.hourlyMotif
    ? `・${character.hourlyMotif}\n`
    : "";

  // 献立がある時刻は献立が話題になるので、話題の候補は使わない
  const topic = meal.hasMeal ? null : pickTopic(now.hour);
  const topicRule = topic
    ? `・今回の話題は「${topic}」。この話題を中心にする\n`
    : "";

  if (topic) console.log(`hourly: 今回の話題「${topic}」`);

  // 気遣いの一言を入れるかどうかは、AI任せにせずコードで決める
  const withCare = Math.random() < CARE_RATE;
  const careRule = withCare
    ? "・最後に、相手を気遣う軽い一言を添える（決まり文句は避け、内容に合った言葉にする）"
    : "・気遣いや呼びかけの一言は入れず、話題の内容で締める";

  if (withCare) console.log("hourly: 気遣いの一言あり");

  let allowCalendar = shouldTalkAboutCalendar(now, topic);

  if (allowCalendar) console.log("hourly: 暦の話あり");

  const task = `通常の時報。
現在日時：${now.dateLabel} ${now.time}（${TIMEZONE}）

【時報のルール】
・日付から季節を判断し、季節に合った内容にする（空模様の描写は毎回でなくてよい）
・朝・昼・夕方・夜など、時間帯にふさわしい話題にする
・時刻そのものは本文に書かない（投稿の冒頭に時刻を表示するため）
・60〜90文字、2文までにまとめる。90文字を超えない
・記念日や「今日は何の日」の話はしない（記念日は${ANNIVERSARY_HOUR}時の記念日紹介でだけ扱う）
${topicRule}${motifRule}${careRule}
・過去の投稿と話題・比喩・構成・書き出し・締めの言葉を重複させない

${meal.rule}`;

  // 暦の誤りがあれば作り直す。2回だめなら暦の話をやめて作り直す
  for (let attempt = 1; attempt <= CALENDAR_CHECK_RETRIES; attempt++) {
    const text = await composePost(
      task,
      formatPreviousPosts("過去の時報です", previousPosts),
      { allowCalendar }
    );

    const problem = checkCalendarText(text, now.dateKey, allowCalendar);

    if (!problem) return text;

    console.log(`hourly: 暦の誤りで作り直し（${problem}）`);

    if (attempt === CALENDAR_CHECK_RETRIES - 1) allowCalendar = false;
  }

  throw new Error("暦の誤りを直せませんでした");
}

// 記念日紹介（重複して生成できなければ null）
async function tryAnniversary(now) {
  const anniversaries = await fetchAnniversaries(now.monthDay);

  return generateUnique(
    "anniversary",
    previous => generateAnniversaryPost(now, anniversaries, previous)
  );
}

async function postHourly() {
  const now = getNow();

  let category = "hourly";
  let message = null;

  try {
    if (now.hour === ANNIVERSARY_HOUR) {
      console.log(`${now.time}：記念日紹介を生成します`);
      message = await tryAnniversary(now);

      if (message) category = "anniversary";
    }

    if (!message) {
      const meal = await getMealRule(now);

      // 作り直すたびに generateHourlyMessage が呼ばれ、話題も選び直される
      message = await generateUnique(
        "hourly",
        previous => generateHourlyMessage(now, meal, previous)
      );
    }

  } catch (error) {
    console.error("時報生成失敗:", error.message);
  }

  // 生成できなかったときは予備の文章を使う
  if (!message) {
    category = "hourly";
    message = getFallbackMessage("hourly", now.hour);
  }

  await publish(category, `${formatHourlyHeader(now.time)}\n${message}`, message);
}

module.exports = {
  postHourly
};
