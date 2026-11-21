// キャラクターの人格を使った投稿文の生成

const { OWNER_NAME } = require("../config");
const { character } = require("../character");
const { generateText } = require("./gemini");
const { getNow } = require("../lib/time");
const { formatCalendar } = require("../lib/calendar");
const { formatMoon } = require("../lib/moon");

// 話しかける相手の情報（OWNER_NAMEが未設定なら名前を呼ばない）
function getOwnerSection() {
  if (!OWNER_NAME) {
    return `【話しかける相手】
・相手の名前は設定されていないため、名前で呼びかけないでください。`;
  }

  return `【話しかける相手】
・このサーバーの管理者であり、話しかける相手の名前は「${OWNER_NAME}」です。
・相手の性別は不明であるため、「〜くん」「〜ちゃん」などの性別を想起させる呼称は使用しないでください。
・名前「${OWNER_NAME}」を毎回使用せず、呼ぶ場合と呼ばない場合を自然に使い分けてください。`;
}

// すべての投稿に共通するルール
// 文字数などの投稿ごとのルールは task 側で指定する
const COMMON_RULES = `【生成ルール】
・Misskeyにそのまま投稿できる文章だけを出力する
・前置きや解説を付けない
・Markdownのリスト記法を使わない（列挙する場合は「・」を使う）
・自然で柔らかい日本語を使う
・${character.name}の人格と口調を維持する
・絵文字は1〜3個程度を目安に使う
・キャラクターを象徴するモチーフや表現を毎回繰り返さない
・比喩表現は内容に合う場合だけ使用する
・同じ語尾や言い回しを連続して使用しない
・不自然なポエム調になりすぎない
・ユーザーへの質問や会話の呼びかけをしない
・参考情報にない事実を創作しない
・説教臭くしない
・過剰な称賛や大げさな励ましを避ける
・時刻を文章に含める場合は必ず24時間表記（例：16:00）にする
・午前、午後、〇時といった12時間表記は使わない
・説明を長々と続けない`;

// 暦の扱い方
//   allow: 節気・候の名前まで渡し、話してよいと伝える
//   deny : 季節だけを渡し、節気や候には触れさせない
const CALENDAR_RULES = {
  allow: "・今回は暦の話をしてよい。二十四節気や七十二候に触れるときは【今日の暦】の内容だけを使う",
  deny: "・二十四節気や七十二候の名前は出さない"
};

// 月の扱い方（暦と同じ考え方。話さない回は月のデータを渡さない）
const MOON_RULES = {
  allow: "・今回は月の話をしてよい。月の形や見え方に触れるときは【今夜の月】の内容だけを使う",
  deny: "・月の形（満月・三日月・半月など）や満ち欠けには触れない"
};

// task: 今回の投稿の目的とルール / details: 参考情報（過去の投稿など）
// options.allowCalendar: true なら暦（二十四節気・七十二候）の話をしてよい
// options.allowMoon    : true なら月の満ち欠けの話をしてよい
async function composePost(task, details = "", options = {}) {
  const now = getNow();
  const calendarRule = options.allowCalendar ? CALENDAR_RULES.allow : CALENDAR_RULES.deny;
  const moonSection = options.allowMoon
    ? `${formatMoon(now.dateKey, now.hour)}\n${MOON_RULES.allow}`
    : MOON_RULES.deny;

  const prompt = `${character.getPersonality()}

${getOwnerSection()}

${formatCalendar(now.dateKey, { detail: Boolean(options.allowCalendar) })}
${calendarRule}

${moonSection}

【今回の投稿目的】
${task}

【参考情報】
${details || "なし"}

${COMMON_RULES}
`;

  return generateText(prompt);
}

// 過去の投稿を参考情報として渡すための文章
function formatPreviousPosts(label, previousPosts) {
  if (!previousPosts.length) return "";

  return `${label}。話題、比喩、文章構成を繰り返さないでください。
${JSON.stringify(previousPosts)}`;
}

module.exports = {
  composePost,
  formatPreviousPosts
};
