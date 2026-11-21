// 最近の献立の記録（数日のあいだ同じ料理が続かないようにする）

const path = require("node:path");

const { DATA_DIR } = require("../config");
const { readJson, writeJson } = require("../lib/json-file");

const MEALS_FILE = path.join(DATA_DIR, "meals.json");

// 記録しておく日数（これより古い献立は自動で削除）
const KEEP_DAYS = 3;

// 保存されるデータの形
// { "2026-11-21": { "朝食": "鮭の塩焼き、ごはん、味噌汁", "昼食": "…" }, ... }

// 最近の献立を「料理名の配列」で返す（例：["鮭の塩焼き", "ごはん", ...]）
function getRecentDishes() {
  const data = readJson(MEALS_FILE, {});

  return Object.values(data)
    .flatMap(day => Object.values(day))
    .flatMap(meal => splitDishes(meal));
}

// 献立の文字列を料理ごとに分ける
function splitDishes(meal) {
  return meal
    .split(/[、,，・]/)
    .map(dish => dish.trim())
    .filter(Boolean);
}

// 献立を記録する（同じ日・同じ食事は上書き）
function saveMeal(dateKey, slotName, meal) {
  const data = readJson(MEALS_FILE, {});

  data[dateKey] = { ...data[dateKey], [slotName]: meal };

  // 新しい日付から KEEP_DAYS 日分だけ残す
  const kept = Object.keys(data).sort().slice(-KEEP_DAYS);

  writeJson(MEALS_FILE, Object.fromEntries(kept.map(key => [key, data[key]])));
}

module.exports = {
  getRecentDishes,
  splitDishes,
  saveMeal
};
