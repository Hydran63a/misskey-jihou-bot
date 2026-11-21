// JSONファイルの読み書き

const fs = require("node:fs");
const path = require("node:path");

// 読み込みに失敗したら defaultValue を返す
function readJson(file, defaultValue) {
  try {
    if (!fs.existsSync(file)) {
      return defaultValue;
    }

    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    console.error(`${file} の読み込み失敗:`, error.message);
    return defaultValue;
  }
}

// 一時ファイルに書いてから置き換える（書き込み途中で読まれても壊れない）
function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });

  const tmp = `${file}.${process.pid}.tmp`;

  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  fs.renameSync(tmp, file);
}

module.exports = {
  readJson,
  writeJson
};
