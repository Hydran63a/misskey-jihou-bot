// 設定タイムゾーン（TIMEZONE）での現在日時

const { TIMEZONE } = require("../config");

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23"
});

function getNow(date = new Date()) {
  const parts = formatter.formatToParts(date);
  const get = type => parts.find(part => part.type === type).value;

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");

  return {
    hour: Number(hour),
    minute: Number(minute),
    // 例：07:00
    time: `${hour}:${minute}`,
    // 例：2026-11-20（保存データのキー）
    dateKey: `${year}-${month}-${day}`,
    // 例：1120（記念日APIのパラメータ）
    monthDay: `${month}${day}`,
    // 例：2026年11月20日（プロンプト用）
    dateLabel: `${year}年${Number(month)}月${Number(day)}日`
  };
}

// 時刻（0〜23）から時間帯を決める
function getTimeBand(hour) {
  if (hour >= 5 && hour <= 10) return "morning";
  if (hour >= 11 && hour <= 15) return "daytime";
  if (hour >= 16 && hour <= 19) return "evening";
  return "night";
}

module.exports = {
  getNow,
  getTimeBand
};
