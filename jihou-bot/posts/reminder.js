// 夜の生活リマインダー

const { composePost, formatPreviousPosts } = require("../ai/compose");
const {
  getFallbackMessage,
  generateUnique,
  publish,
  withMention
} = require("./common");

// 時刻ごとのリマインダー内容
// ここに時刻を追加した場合は、キャラクターの fallbacks.json にも
// "reminder<時刻>" の予備文章を追加してください
const REMINDERS = {
  21: `21時の作業終了リマインダー。
・今日の作業を切り上げ、休息に切り替えるよう優しく提案する
・今日一日頑張ったことをさりげなく労う
・続きは明日の自分に任せよう、という前向きな表現も使える
・入浴や就寝は促さない
・作業をしていないことを責めない`,

  22: `22時の入浴リマインダー。
・お風呂で温まってリラックスするよう優しく提案する
・今日の疲れを流すような表現や、入浴後の心地よさを想像させる表現を使う
・作業終了や就寝は促さない
・入浴していないことを責めない`,

  23: `23時の就寝リマインダー。
・スマホや画面を置いて、寝る準備をするよう優しく提案する
・今日一日を優しく締めくくり、明日への期待を込める
・おやすみの挨拶を自然に入れる
・夜更かしを責めたり、脅したりしない`
};

const REMINDER_HOURS = Object.keys(REMINDERS).map(Number);

const COMMON_REMINDER_RULES = `
・時刻や「〜時になりました」などの時報らしい書き出しは入れない
・「どんな一日でしたか」のような問いかけはしない
・指定された目的以外の生活習慣を指示しない
・相手の生活を決めつけず、提案する口調にする
・50〜100文字程度にまとめる
・過去の投稿と異なる話題や表現を使う`;

async function postReminder(hour) {
  const category = `reminder${hour}`;
  const task = REMINDERS[hour];

  if (!task) {
    console.error(`${hour}時のリマインダーは定義されていません`);
    return;
  }

  let message = null;

  try {
    message = await generateUnique(
      category,
      previous => composePost(
        task + COMMON_REMINDER_RULES,
        formatPreviousPosts("過去の同時刻の投稿です", previous)
      )
    );
  } catch (error) {
    console.error(`${hour}時リマインダー生成失敗:`, error.message);
  }

  // 生成できなかったときは予備の文章を使う
  if (!message) {
    message = getFallbackMessage(category, hour);
  }

  if (!message) return;

  await publish(category, withMention(message), message);
}

module.exports = {
  REMINDER_HOURS,
  postReminder
};
