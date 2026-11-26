// キャラクター設定の読み込み
//
// characters/<フォルダ名>/ に以下のファイルを置く:
//   character.json  名前・時報の書き出しなど
//   personality.txt 文章生成用の人格プロンプト
//   fallbacks.json  AI生成に失敗したときの予備文章

const fs = require("node:fs");
const path = require("node:path");

const { CHARACTER } = require("./config");

const FALLBACK_CATEGORIES = ["hourly", "reminder21", "reminder22", "reminder23"];
const TIME_BANDS = ["morning", "daytime", "evening", "night"];

function resolveCharacterDir(value) {
  // 区切り文字を含まなければ characters/ 内のフォルダ名とみなす
  if (!/[\\/]/.test(value)) {
    return path.join(__dirname, "characters", value);
  }

  return path.resolve(__dirname, value);
}

function readText(dir, file) {
  const filePath = path.join(dir, file);

  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    throw new Error(`キャラクター設定 ${filePath} を読み込めません: ${error.message}`);
  }
}

function readJson(dir, file) {
  const text = readText(dir, file);

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`キャラクター設定 ${path.join(dir, file)} のJSONが不正です: ${error.message}`);
  }
}

function loadCharacter() {
  const dir = resolveCharacterDir(CHARACTER);
  const profile = readJson(dir, "character.json");
  const fallbacks = readJson(dir, "fallbacks.json");

  if (!profile.name) {
    throw new Error(`${path.join(dir, "character.json")} に name がありません`);
  }

  // 予備の文章は「配列」か「時間帯ごとの配列（morning / daytime / evening / night）」
  const isFilledList = value => Array.isArray(value) && value.length > 0;

  for (const category of FALLBACK_CATEGORIES) {
    const entry = fallbacks[category];
    const ok = Array.isArray(entry)
      ? isFilledList(entry)
      : TIME_BANDS.every(band => isFilledList(entry?.[band]));

    if (!ok) {
      throw new Error(`${path.join(dir, "fallbacks.json")} の ${category} が空か、時間帯（${TIME_BANDS.join(" / ")}）が足りません`);
    }
  }

  return {
    dir,
    name: profile.name,
    hourlyHeader: profile.hourlyHeader || "🕐 {time}",
    hourlyMotif: profile.hourlyMotif || "",
    anniversaryTone: profile.anniversaryTone || "キャラクターらしい口調",
    // 献立のジャンルの候補（毎回ここからランダムに1つ選ぶ。同じジャンルを並べれば出やすくなる）
    mealStyles: Array.isArray(profile.mealStyles) && profile.mealStyles.length
      ? profile.mealStyles
      : ["和食", "洋食", "中華"],
    // 時間帯ごとの話題の候補（morning / daytime / evening / night）
    topics: profile.topics || {},
    fallbacks,
    // 人格プロンプトは編集をすぐ反映できるよう毎回読み込む
    getPersonality: () => readText(dir, "personality.txt")
  };
}

const character = loadCharacter();

// 時報の書き出し（{time} を時刻に置き換える）
function formatHourlyHeader(time) {
  return character.hourlyHeader.replaceAll("{time}", time);
}

module.exports = {
  character,
  formatHourlyHeader
};
