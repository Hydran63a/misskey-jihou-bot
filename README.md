# misskey-jihou-bot

Misskey 向けの **時報bot** と、そのお供の **Gemini API 監視bot** です。

## なにこれ

Misskeyに、1時間ごとに時報をお知らせしてくれるbotです。
時報とAPI監視を同じbotから通知すると、キャラクター性が崩れてしまうため、2つのbotに分離しています。

時報botは Google の Gemini API でキャラクターの文章を生成し、毎時の時報や夜のリマインダーを投稿します。
キャラクターはフォルダを差し替えるだけで変更できます。初期キャラクターは、古い柱時計に宿る精「こよみ」です。

```
🕰️ 15:00になりました。
散歩の途中で、日なたで丸くなっている猫を見かけました。あまりに気持ちよさそうで、しばらく見入ってしまいました。🐈
```

## できること

### 時報bot（`jihou-bot/`）

| 時刻 | 投稿 |
|---|---|
| 07:00〜23:00 の毎時 | 時報（時間帯ごとの話題をランダムに選んで生成） |
| 08:00 / 12:00 / 18:00 | 献立を話題にした時報（直近3日の料理と重ならないように生成） |
| 10:00 | 今日は何の日（[今日は何の日API](https://api.whatistoday.cyou/) から取得した記念日を紹介） |
| 21:00 / 22:00 / 23:00 | 生活リマインダー（作業終了・入浴・就寝） |

- **正しい暦**：二十四節気・七十二候を太陽の位置から計算し、AI に渡します。生成文の暦が間違っていれば作り直します。
- **重複の回避**：過去の投稿と似た文章ができたら作り直します。
- **止まらない**：Gemini が使えないときは、キャラクターの予備文章（時間帯別）で投稿します。

### 監視bot（`error-kanshi-bot/`・オプション）

時報botが記録した Gemini API の状態を30秒ごとに確認し、変化があれば Misskey に投稿します。

| 状態 | 通知 |
|---|---|
| 混雑（503） | ⚠️ Gemini APIの過負荷（503エラー）を検知しました。 |
| 利用上限（429） | ⚠️ Gemini APIの利用上限（429エラー）に達しました。… |
| 認証エラー | ❌ Gemini APIの認証に失敗しました。APIキーを確認してください。 |
| その他のエラー | ⚠️ Gemini APIでエラーが発生しました。 |
| 復旧 | ✅ Gemini APIの復旧を確認しました。 |

## 必要なもの

- Node.js 22 以上
- Misskey の bot アカウントと、アクセストークン（権限：「ノートを作成・削除する」）
- [Gemini API キー](https://aistudio.google.com/apikey)

## セットアップ

### 1. 時報bot

```bash
cd jihou-bot
npm ci
cp .env.example .env
```

`.env` を開いて、少なくとも次の3つを設定します。

```
MISSKEY_URL=https://あなたのサーバー
MISSKEY_TOKEN=アクセストークン
GEMINI_API_KEY=GeminiのAPIキー
```

起動します。

```bash
npm start
```

### 2. 監視bot（使う場合のみ）

時報bot の `.env` で `STATUS_MONITOR=true` にしてから、監視botを設定します。

```bash
cd error-kanshi-bot
npm ci
cp .env.example .env
npm start
```

### 常駐させる

サーバーで動かし続けるには、[pm2](https://pm2.keymetrics.io/) などのプロセス管理ツールが便利です。

```bash
npm install -g pm2
pm2 start jihou-bot/index.js --name jihou-bot
pm2 start error-kanshi-bot/index.js --name error-kanshi-bot
pm2 save
```

## 設定（`jihou-bot/.env`）

| 変数 | 既定値 | 説明 |
|---|---|---|
| `MISSKEY_URL` | （必須） | 投稿先の Misskey サーバー |
| `MISSKEY_TOKEN` | （必須） | bot アカウントのアクセストークン |
| `NOTE_VISIBILITY` | `public` | 公開範囲（`public` / `home` / `followers`） |
| `LOCAL_ONLY` | `true` | `true` なら連合なしで投稿 |
| `CHARACTER` | `koyomi` | `characters/` 内のフォルダ名、またはフォルダへのパス |
| `REMINDER_TARGET` | （空） | リマインダーでメンションする相手（例：`@user@example.com`） |
| `OWNER_NAME` | （空） | キャラクターが話しかける相手の呼び名 |
| `TIMEZONE` | `Asia/Tokyo` | 時報のタイムゾーン |
| `GEMINI_API_KEY` | （必須） | Gemini API キー |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | 使用するモデル |
| `DATA_DIR` | `./data` | 投稿履歴と献立の保存先 |
| `STATUS_MONITOR` | `false` | 監視botを使うなら `true` |
| `GEMINI_STATUS_FILE` | `../data/gemini-status.json` | 監視botと共有する状態ファイル |

> 二十四節気・七十二候は日本の暦のため、日付の区切りは常に日本時間で計算します。

## キャラクターを作る

`jihou-bot/characters/koyomi/` をコピーして、中身を書き換えます。

```
characters/my-chara/
├── character.json   名前・時報の書き出し・話題の候補
├── personality.txt  人格と口調（文字数などのルールは書かなくてよい）
└── fallbacks.json   Gemini が使えないときの予備文章
```

`.env` で `CHARACTER=my-chara` にすれば切り替わります。
リポジトリの外に置く場合は `CHARACTER=../../my-characters/my-chara` のようにパスで指定できます（公開したくないキャラクターはこの方法がおすすめです）。

### character.json

```json
{
  "name": "こよみ",
  "hourlyHeader": "🕰️ {time}になりました。",
  "hourlyMotif": "暦や季節の移ろいなど、こよみらしい視点を自然に取り入れる。",
  "anniversaryTone": "穏やかな丁寧語",
  "topics": {
    "morning": ["朝の空気や光の感じ", "..."],
    "daytime": ["散歩の途中で見つけた景色", "..."],
    "evening": ["夕焼けや日の入りの時刻", "..."],
    "night":   ["夜の静けさ", "..."]
  }
}
```

| 項目 | 説明 |
|---|---|
| `name` | キャラクター名（必須） |
| `hourlyHeader` | 時報の1行目。`{time}` が時刻（例：`07:00`）に置き換わる |
| `hourlyMotif` | 時報に取り入れてほしいキャラクターらしさ |
| `anniversaryTone` | 記念日紹介の口調 |
| `topics` | 時間帯ごとの話題の候補。毎回ここからランダムに1つ選ばれる（朝 5〜10時 / 昼 11〜15時 / 夕方 16〜19時 / 夜 20〜4時） |

### fallbacks.json

`hourly` は時間帯ごと（`morning` / `daytime` / `evening` / `night`）でも、ひとつの配列でも書けます。
予備文章はいつ使われるかわからないので、特定の季節や事実に触れない文章にするのがおすすめです。

```json
{
  "hourly": {
    "morning": ["..."], "daytime": ["..."], "evening": ["..."], "night": ["..."]
  },
  "reminder21": ["..."],
  "reminder22": ["..."],
  "reminder23": ["..."]
}
```

## フォルダ構成

```
jihou-bot/
├── index.js        スケジュールの登録
├── config.js       .env の読み込み
├── character.js    キャラクターの読み込み
├── characters/     キャラクター
├── ai/             Gemini の呼び出しとプロンプトの組み立て
├── posts/          時報・記念日・リマインダー
├── store/          投稿履歴と献立の記録
└── lib/            時刻・暦・Misskey・JSON の共通処理
error-kanshi-bot/
└── index.js        監視bot
```

## ライセンス

[Apache License 2.0](LICENSE)
