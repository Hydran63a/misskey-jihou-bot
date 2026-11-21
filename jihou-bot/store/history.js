// 投稿履歴の保存と類似投稿の検出

const path = require("node:path");

const { DATA_DIR } = require("../config");
const { readJson, writeJson } = require("../lib/json-file");

const HISTORY_FILE = path.join(DATA_DIR, "history.json");

// カテゴリごとに保持する件数
const LIMITS = {
  hourly: 24,
  anniversary: 30,
  reminder21: 30,
  reminder22: 30,
  reminder23: 30
};
const DEFAULT_LIMIT = 30;

// この値以上の類似度なら「似ている」と判定する
const SIMILARITY_THRESHOLD = 0.45;

function loadHistory() {
  return readJson(HISTORY_FILE, {});
}

function getHistory(category) {
  return loadHistory()[category] || [];
}

// 絵文字・記号・空白を除いて比較しやすくする
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "")
    .replace(/[、。！？!?\s〜～ー・…]/g, "");
}

// 文字の2文字組を作成
function makeBigrams(text) {
  const chars = Array.from(normalize(text));
  const result = new Set();

  for (let i = 0; i < chars.length - 1; i++) {
    result.add(chars[i] + chars[i + 1]);
  }

  return result;
}

// 文章の類似度（0〜1）を計算
function similarity(textA, textB) {
  const a = makeBigrams(textA);
  const b = makeBigrams(textB);

  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let common = 0;

  for (const item of a) {
    if (b.has(item)) common++;
  }

  return (2 * common) / (a.size + b.size);
}

// 過去の文章と類似していれば、その履歴を返す
function findSimilar(category, text) {
  for (const entry of getHistory(category)) {
    const score = similarity(text, entry.text);

    if (score >= SIMILARITY_THRESHOLD) {
      console.log(`類似判定: ${category}（類似度 ${score.toFixed(3)}）`);
      console.log(`  生成文: ${text}`);
      console.log(`  履歴  : ${entry.text}`);
      return entry;
    }
  }

  return null;
}

// 投稿成功後に履歴へ保存
function saveHistory(category, text) {
  const history = loadHistory();
  const limit = LIMITS[category] || DEFAULT_LIMIT;

  history[category] = [
    ...(history[category] || []),
    { text, createdAt: new Date().toISOString() }
  ].slice(-limit);

  writeJson(HISTORY_FILE, history);
}

module.exports = {
  getHistory,
  findSimilar,
  saveHistory
};
