// 環境変数（.env）の読み込みと検証

const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

function required(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`環境変数 ${name} が設定されていません（.env を確認してください）`);
  }

  return value;
}

function optional(name, defaultValue = "") {
  const value = process.env[name]?.trim();
  return value ? value : defaultValue;
}

function bool(name, defaultValue) {
  const value = process.env[name]?.trim().toLowerCase();

  if (!value) return defaultValue;

  return ["1", "true", "yes", "on"].includes(value);
}

function timezone(name, defaultValue) {
  const value = optional(name, defaultValue);

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
  } catch {
    throw new Error(`環境変数 ${name} のタイムゾーン「${value}」が不正です（例：Asia/Tokyo）`);
  }

  return value;
}

// 相対パスはこのbotのフォルダを基準に解決する
function resolvePath(value) {
  return path.isAbsolute(value) ? value : path.resolve(__dirname, value);
}

module.exports = {
  // Misskey
  MISSKEY_URL: required("MISSKEY_URL").replace(/\/+$/, ""),
  MISSKEY_TOKEN: required("MISSKEY_TOKEN"),
  NOTE_VISIBILITY: optional("NOTE_VISIBILITY", "public"),
  LOCAL_ONLY: bool("LOCAL_ONLY", true),

  // 夜のリマインダーでメンションする相手（空ならメンションなし）
  REMINDER_TARGET: optional("REMINDER_TARGET"),

  // botが話しかける相手の呼び名（空なら名前を呼ばない）
  OWNER_NAME: optional("OWNER_NAME"),

  // 使用するキャラクター（characters/ 内のフォルダ名、またはフォルダへのパス）
  CHARACTER: optional("CHARACTER", "koyomi"),

  // 時報のタイムゾーン（IANA形式）
  TIMEZONE: timezone("TIMEZONE", "Asia/Tokyo"),

  // Gemini
  GEMINI_API_KEY: optional("GEMINI_API_KEY"),
  GEMINI_MODEL: optional("GEMINI_MODEL", "gemini-3.5-flash-lite"),

  // 投稿履歴・最近の献立を保存するフォルダ
  DATA_DIR: resolvePath(optional("DATA_DIR", "./data")),

  // 監視bot（error-kanshi-bot）を使うときは true（稼働状態ファイルを書き込む）
  STATUS_MONITOR: bool("STATUS_MONITOR", false),

  // 監視botと共有するGemini稼働状態ファイル
  GEMINI_STATUS_FILE: resolvePath(
    optional("GEMINI_STATUS_FILE", "../data/gemini-status.json")
  )
};
