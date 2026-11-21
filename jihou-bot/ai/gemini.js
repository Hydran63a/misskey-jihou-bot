// Gemini APIの呼び出しと稼働状態の記録

const {
  GEMINI_API_KEY,
  GEMINI_MODEL,
  GEMINI_STATUS_FILE,
  STATUS_MONITOR
} = require("../config");
const { writeJson } = require("../lib/json-file");

let aiClient;

async function getClient() {
  if (aiClient) return aiClient;

  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEYが設定されていません");
  }

  const { GoogleGenAI } = await import("@google/genai");

  aiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  return aiClient;
}

// エラーの種類を判定する
//   overloaded   : 503（混雑）
//   rate_limited : 429（利用上限）
//   auth_error   : 401/403、またはAPIキーが不正・未設定
//   error        : そのほか（通信エラーなど）
function classifyError(error) {
  const code = Number(error.status || error.code);
  const message = String(error.message || "");

  if (code === 503) return "overloaded";
  if (code === 429) return "rate_limited";
  if (code === 401 || code === 403) return "auth_error";

  // GeminiはAPIキーが不正なとき 400 を返すので、メッセージで判定する
  if (/API key|GEMINI_API_KEY/i.test(message)) return "auth_error";

  return "error";
}

// 稼働状態を監視botと共有する（"ok" または classifyError の結果）
function updateGeminiStatus(status) {
  // 監視botを使わない設定なら何もしない
  if (!STATUS_MONITOR) return;

  try {
    writeJson(GEMINI_STATUS_FILE, {
      status,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Gemini状態保存失敗:", error.message);
  }
}

// Geminiのエラーメッセージ（JSONで長い）を1行に縮める
// 例：「429 Generate content requests per minute limit exceeded…（35秒後に再試行可）」
function summarizeError(error) {
  const raw = String(error.message || error);

  try {
    const { error: detail } = JSON.parse(raw);
    const firstLine = String(detail.message).split("\n")[0].slice(0, 120);
    const retry = raw.match(/retry in ([\d.]+)s/i);
    const retryText = retry ? `（${Math.ceil(Number(retry[1]))}秒後に再試行可）` : "";

    return `${detail.code} ${firstLine}${retryText}`;
  } catch {
    // JSONでなければそのまま（長すぎる場合は切り詰める）
    return raw.slice(0, 200);
  }
}

// プロンプトをそのまま送り、生成された文章を返す
async function generateText(prompt) {
  let response;

  try {
    // APIキー未設定のエラーも監視botに伝えるため、try の中で取得する
    const ai = await getClient();

    response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt
    });

    updateGeminiStatus("ok");

  } catch (error) {
    const status = classifyError(error);
    const summary = summarizeError(error);

    updateGeminiStatus(status);
    console.error(`Gemini APIエラー（${status}）:`, summary);

    // 呼び出し側のログも読みやすいよう、短いメッセージのエラーにして投げ直す
    const shortError = new Error(`${status}: ${summary}`);
    shortError.status = error.status;
    shortError.cause = error;
    throw shortError;
  }

  const text = response.text?.trim();

  if (!text) {
    throw new Error("Geminiから文章を取得できませんでした");
  }

  return text;
}

module.exports = {
  generateText,
  classifyError
};
