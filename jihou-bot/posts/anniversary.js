// 「今日は何の日」の記念日紹介

const { character } = require("../character");
const { composePost, formatPreviousPosts } = require("../ai/compose");

// 記念日紹介を行う時刻（この時刻の時報が記念日紹介になる）
const ANNIVERSARY_HOUR = 10;

const API_URL = "https://api.whatistoday.cyou/index.cgi/v3/anniv";
const REQUEST_TIMEOUT = 15 * 1000;

// 投稿の冒頭に時刻を表示するので、本文では時刻に触れさせない
const NO_TIME_RULE = "時刻や「お知らせ」などの時報らしい前置きは本文に書かない（投稿の冒頭に時刻を表示するため）";

// 記念日の一覧を取得する（失敗したら空配列）
// monthDay: MMDD形式の日付
async function fetchAnniversaries(monthDay) {
  try {
    const response = await fetch(`${API_URL}/${monthDay}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    const anniversaries = [
      data.anniv1,
      data.anniv2,
      data.anniv3,
      data.anniv4,
      data.anniv5
    ].filter(Boolean);

    console.log("記念日取得成功:", anniversaries);
    return anniversaries;

  } catch (error) {
    console.error("記念日取得失敗:", error.message);
    return [];
  }
}

// 記念日紹介の文章を生成する
async function generateAnniversaryPost(now, anniversaries, previousPosts) {
  const details = [
    JSON.stringify({ date: now.dateLabel, anniversaries }),
    formatPreviousPosts("過去の記念日紹介です", previousPosts)
  ].filter(Boolean).join("\n");

  if (anniversaries.length === 0) {
    return composePost(
      `朝の時報。今日は何の日の情報が取得できなかったので、記念日を創作せず、季節や日常について短く紹介する。
・${NO_TIME_RULE}
・60〜90文字程度、2〜3文以内にまとめる`,
      details
    );
  }

  return composePost(
    `朝の時報として、参考情報の今日の記念日を紹介する。

【記念日紹介ルール】
・記念日の名称は取得データをそのまま正確に使用する
・制定団体や制定理由、由来を推測・創作しない
・由来がわからない場合は、名称と${character.name}の感想を紹介する
・企業や団体が制定した記念日も積極的に取り上げる
・複数ある場合は自然に組み合わせ、単なる羅列にしない
・季節や日常生活とのつながりを意識する
・${character.name}らしい${character.anniversaryTone}で書く
・過去の投稿と異なる感想や表現を使う
・${NO_TIME_RULE}
・80〜140文字程度にまとめる`,
    details
  );
}

module.exports = {
  ANNIVERSARY_HOUR,
  fetchAnniversaries,
  generateAnniversaryPost
};
