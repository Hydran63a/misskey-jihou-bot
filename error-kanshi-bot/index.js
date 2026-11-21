// Gemini API監視bot
// 時報botが書き込む稼働状態ファイルを監視し、状態が変わったらMisskeyに投稿する

const fs = require("node:fs");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

// ===== 設定 =====

for (const name of ["MISSKEY_URL", "MISSKEY_TOKEN"]) {
  if (!process.env[name]?.trim()) {
    console.error(`環境変数 ${name} が設定されていません（.env を確認してください）`);
    process.exit(1);
  }
}

const MISSKEY_URL = process.env.MISSKEY_URL.trim().replace(/\/+$/, "");
const MISSKEY_TOKEN = process.env.MISSKEY_TOKEN.trim();
const NOTE_VISIBILITY = process.env.NOTE_VISIBILITY?.trim() || "public";
const LOCAL_ONLY = ["1", "true", "yes", "on"].includes(
  (process.env.LOCAL_ONLY?.trim() || "true").toLowerCase()
);

// 時報botと共有する稼働状態ファイル（相対パスはこのフォルダ基準）
const STATUS_FILE = path.resolve(
  __dirname,
  process.env.GEMINI_STATUS_FILE?.trim() || "../data/gemini-status.json"
);

const CHECK_INTERVAL = 30 * 1000;
const REQUEST_TIMEOUT = 15 * 1000;

// 状態ごとの通知文
const MESSAGES = {
  overloaded: "⚠️ Gemini APIの過負荷（503エラー）を検知しました。",
  rate_limited: "⚠️ Gemini APIの利用上限（429エラー）に達しました。しばらく予備の文章で投稿します。",
  auth_error: "❌ Gemini APIの認証に失敗しました。APIキーを確認してください。",
  error: "⚠️ Gemini APIでエラーが発生しました。",
  ok: "✅ Gemini APIの復旧を確認しました。"
};

// ===== 処理 =====

// 投稿に成功したら true を返す
async function postNote(text) {
  try {
    const response = await fetch(`${MISSKEY_URL}/api/notes/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        i: MISSKEY_TOKEN,
        text,
        visibility: NOTE_VISIBILITY,
        localOnly: LOCAL_ONLY
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.error) {
      console.error(
        "投稿失敗:",
        result.error?.message || `HTTP ${response.status}`
      );
      return false;
    }

    console.log("投稿成功:", text);
    return true;

  } catch (error) {
    console.error("通信エラー:", error.message);
    return false;
  }
}

// 状態ファイルがないときのヒントを1回だけ表示するための目印
let warnedMissing = false;

// 現在の状態を読む（読めなければ null）
function readStatus() {
  try {
    if (!fs.existsSync(STATUS_FILE)) {
      if (!warnedMissing) {
        console.log("状態ファイルがまだありません。時報botの .env で STATUS_MONITOR=true になっているか確認してください。");
        warnedMissing = true;
      }
      return null;
    }

    const { status } = JSON.parse(fs.readFileSync(STATUS_FILE, "utf8"));

    return status in MESSAGES ? status : null;

  } catch (error) {
    console.error("状態ファイルの読み込み失敗:", error.message);
    return null;
  }
}

let lastStatus = null;
let checking = false;

async function checkGeminiStatus() {
  if (checking) return;
  checking = true;

  try {
    const status = readStatus();

    if (!status || status === lastStatus) return;

    // 起動直後は現在の状態を覚えるだけで通知しない
    if (lastStatus === null) {
      lastStatus = status;
      console.log("初期状態を取得しました:", status);
      return;
    }

    // 投稿に失敗したら状態を更新せず、次回のチェックで再送する
    if (await postNote(MESSAGES[status])) {
      lastStatus = status;
    }

  } finally {
    checking = false;
  }
}

console.log("Gemini API監視botを起動しました。");
console.log(`監視間隔: ${CHECK_INTERVAL / 1000}秒`);
console.log("監視ファイル:", STATUS_FILE);

checkGeminiStatus();
setInterval(checkGeminiStatus, CHECK_INTERVAL);
