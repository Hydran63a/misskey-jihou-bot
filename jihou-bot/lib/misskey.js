// Misskeyへのノート投稿

const {
  MISSKEY_URL,
  MISSKEY_TOKEN,
  NOTE_VISIBILITY,
  LOCAL_ONLY
} = require("../config");

const REQUEST_TIMEOUT = 15 * 1000;

// 投稿に成功したら true を返す（失敗しても例外は投げない）
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

    console.log("投稿成功:", result.createdNote?.id);
    return true;

  } catch (error) {
    console.error("通信エラー:", error.message);
    return false;
  }
}

module.exports = {
  postNote
};
