// 投稿処理の共通部分（重複回避・フォールバック・投稿と履歴保存）

const { REMINDER_TARGET } = require("../config");
const { character } = require("../character");
const { postNote } = require("../lib/misskey");
const { getTimeBand } = require("../lib/time");
const {
  getHistory,
  findSimilar,
  saveHistory
} = require("../store/history");

// 類似投稿が生成されたときに作り直す回数
const MAX_RETRIES = 3;

// 直前に選んだフォールバック文章（同じ文章が続かないようにする）
const lastFallback = {};

// キャラクターの fallbacks.json から予備の文章を選ぶ
// 配列ならそのまま、{ morning: [...], ... } のように時間帯で分かれていれば
// hour の時間帯のものから選ぶ
function getFallbackMessage(category, hour) {
  const entry = character.fallbacks[category];
  const band = Array.isArray(entry) ? "all" : getTimeBand(hour);
  const list = Array.isArray(entry) ? entry : entry?.[band];

  if (!Array.isArray(list) || list.length === 0) return null;

  // 「前回選んだ文章」はカテゴリと時間帯ごとに覚えておく
  const key = `${category}:${band}`;
  const candidates = list.length > 1
    ? list.filter(message => message !== lastFallback[key])
    : list;

  const selected =
    candidates[Math.floor(Math.random() * candidates.length)];

  lastFallback[key] = selected;

  return selected;
}

// 過去の投稿と似ていない文章ができるまで生成する（できなければ null）
// generator は過去の投稿の配列を受け取り、文章を返す関数
async function generateUnique(category, generator) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const previousPosts = getHistory(category).map(entry => entry.text);
    const message = await generator(previousPosts);

    if (!findSimilar(category, message)) {
      console.log(`${category}: 重複チェックOK`);
      return message;
    }

    console.log(`${category}: 類似投稿を検出（${attempt}/${MAX_RETRIES}）`);
  }

  console.error(`${category}: 重複を回避できませんでした`);
  return null;
}

// 投稿し、成功したら履歴に保存する
// historyText: 履歴に残す文章（時報の書き出しやメンションを除いた本文）
async function publish(category, text, historyText = text) {
  if (!text) return false;

  const success = await postNote(text);

  if (success) {
    saveHistory(category, historyText);
  }

  return success;
}

// リマインダーの宛先が設定されていればメンションを付ける
function withMention(text) {
  return REMINDER_TARGET ? `${REMINDER_TARGET}\n\n${text}` : text;
}

module.exports = {
  getFallbackMessage,
  generateUnique,
  publish,
  withMention
};
