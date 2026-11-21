// 時報bot：投稿スケジュールの登録

const cron = require("node-cron");

const {
  TIMEZONE,
  GEMINI_MODEL,
  REMINDER_TARGET
} = require("./config");
const { character } = require("./character");
const { postHourly } = require("./posts/hourly");
const { ANNIVERSARY_HOUR } = require("./posts/anniversary");
const { REMINDER_HOURS, postReminder } = require("./posts/reminder");

// 時報を投稿する時刻（cron形式：毎日07:00〜23:00）
const HOURLY_SCHEDULE = "0 7-23 * * *";

// 予期しないエラーでbotが止まらないようにする
function schedule(expression, name, task) {
  cron.schedule(
    expression,
    async () => {
      try {
        await task();
      } catch (error) {
        console.error(`${name}で予期しないエラー:`, error);
      }
    },
    { timezone: TIMEZONE }
  );
}

schedule(HOURLY_SCHEDULE, "時報", postHourly);

for (const hour of REMINDER_HOURS) {
  schedule(`0 ${hour} * * *`, `${hour}時リマインダー`, () => postReminder(hour));
}

process.on("unhandledRejection", error => {
  console.error("未処理のエラー:", error);
});

const pad = hour => `${String(hour).padStart(2, "0")}:00`;

console.log(`${character.name}のbotを起動しました！`);
console.log(`キャラクター設定：${character.dir}`);
console.log(`時報：07:00～23:00（${GEMINI_MODEL}）`);
console.log(`今日は何の日：${pad(ANNIVERSARY_HOUR)}`);
console.log(`夜のリマインダー：${REMINDER_HOURS.map(pad).join(" / ")}`);
console.log(`リマインダー宛先：${REMINDER_TARGET || "（メンションなし）"}`);
console.log(`タイムゾーン：${TIMEZONE}`);
