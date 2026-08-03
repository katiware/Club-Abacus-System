# 開発運用および役割分担計画書 (docs3.md)

本ドキュメントは、チーム開発（2名体制）における今後の機能拡張方針、役割分担、Gitブランチ運用ルールをまとめたものです。

---

## 1. 今後の機能拡張・作業方針

ドキュメント（docs1.md / docs2.md）に基づき、今後実装を進める主な機能一覧です。

### 1.1 Webアプリケーション（フロントエンド / バックエンド）
- **経費申請・ワークフロー機能**
  - **申請タイプ**: 「立替払い（領収書）」 / 「事前出金（見積書・請求書）」
  - **購入方法**: 「Web購入（画像/PDF提出必須）」 / 「実店舗購入（紙の領収書を手渡し）」
  - **定期支払い**: 月次・年次の定期テンプレート登録と当月/当年データの自動生成・督促
  - **ステータス管理**: `PENDING_APPROVAL` (承認待ち) ➔ `APPROVED` (承認済/証憑待ち) ➔ `WAITING_CONFIRMATION` (最終確認待ち) ➔ `COMPLETED` (完了)
  - **証憑管理**: 領収書・見積書等のアップロード、差し替え（監査ログ記録）、事前出金後の領収書追加アップロード
- **管理・補助機能**
  - **金種計算機能**: 部員一人ひとりの精算額に応じた紙幣・硬貨枚数の自動算出
  - **アラート機能**: 5万円以上の購入に対する「高額申請アラート」、提出期限が近い「未報告アラート」
  - **監査ログ (AuditLogs)**: 申請変更・ステータス更新・画像差し替えの操作履歴の保持・閲覧
  - **年度リセット**: 単年度予算制（4/1〜3/31）に応じたデータ切り替え

### 1.2 Discord Bot 連携機能
- **データ照会**: `/budget` や `/history` コマンドによる予算残高・履歴の応答（Embed/画像応答）
- **自動通知 & 督促バッチ**: ステータス変更時の自動通知、未提出者への自動督促
- **部内投票機能**: 申請承認タイミングでのDiscord上でのリアクション投票と集計

---

## 2. 開発役割分担（2名体制・コンフリクト防止方針）

Git上のコンフリクト（競合）を防止するため、**ディレクトリ境界で完全に領域を分ける「領域完全分離型」**を採用します。

| 担当 | 担当ディレクトリ | 役割・開発内容 |
| :--- | :--- | :--- |
| **メンバーA** | `frontend/`<br>`bot/` | **【フロントエンド ＋ Discord Bot】**<br>・Reactによる画面UI（申請フォーム、ダッシュボード、管理画面、金種計算画面）<br>・Discord Bot（Python/discord.py）による通知・照会コマンド・画像生成処理 |
| **メンバーB** | `backend/` | **【バックエンド ＆ DB】**<br>・ASP.NET Core (C#) によるREST API開発（認証、経費申請、ステータス変更）<br>・PostgreSQLデータベース設計およびマイグレーション（Entity Framework Core） |

> **メリット**: 編集するファイル群が `frontend/` + `bot/` と `backend/` で物理的に分かれるため、Git上のマージコンフリクトが原理的に発生しません。

---

## 3. Git ブランチ運用ルール

### 3.1 ブランチ階層構造
```text
main (リリース用 / 安定版)
  └── develop (開発統合用)
        └── feature/frontend (親機能ブランチ)
              ├── feature/frontend-login-ui (細かい機能ブランチ)
              └── feature/frontend-expense-form (細かい機能ブランチ)
```

### 3.2 ブランチ作成手順 (Gitコマンド)

1. **develop ブランチの作成 (最初のみ)**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b develop
   git push -u origin develop
   ```

2. **親機能ブランチの作成**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/frontend
   git push -u origin feature/frontend
   ```

3. **細かい機能ブランチの作成と作業**
   ```bash
   git checkout feature/frontend
   git pull origin feature/frontend
   git checkout -b feature/frontend-login-ui
   
   # 作業・コミット
   git add .
   git commit -m "feat: ログイン画面のUI作成"
   git push -u origin feature/frontend-login-ui
   ```

### 3.3 マージ (合流) フロー
開発が完了したら、作成した順番とは**逆順**（細かい機能 ➔ 親機能 ➔ develop ➔ main）に Pull Request (PR) またはマージを行います。

---

## 4. コンフリクト防止の運用ルール

1. **事前API設計（型・JSON構造の合意）**
   - フロントエンドとバックエンド間でAPIのエンドポイントおよびリクエスト/レスポンス型をあらかじめ合意し、フロントエンドはモックデータを活用して先行開発を行います。
2. **共通設定ファイルの更新注意**
   - `package.json` や `Program.cs` などの共通設定ファイルを変更する場合は、事前に声を掛け合って編集します。
3. **作業前の pull**
   - 新しいブランチを作成する際、元のブランチで必ず `git pull` を行い、最新状態から派生させます。
