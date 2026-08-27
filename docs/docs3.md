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



---

## 2. 開発役割分担（2名体制・コンフリクト防止方針）

Git上のコンフリクト（競合）を防止するため、**ディレクトリ境界で完全に領域を分ける「領域完全分離型」**を採用します。

| 担当 | 担当ディレクトリ | 役割・開発内容 |
| :--- | :--- | :--- |
| **メンバーA** | `frontend/` | **【フロントエンド】**<br>・Reactによる画面UI（申請フォーム、ダッシュボード、管理画面、金種計算画面） |
| **メンバーB** | `backend/` | **【バックエンド ＆ DB】**<br>・ASP.NET Core (C#) によるREST API開発（認証、経費申請、ステータス変更）<br>・PostgreSQLデータベース設計およびマイグレーション（Entity Framework Core） |

> **メリット**: 編集するファイル群が `frontend/` と `backend/` で物理的に分かれるため、Git上のマージコンフリクトが原理的に発生しません。

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
   
   # 作業・小まめなコミット
   git add .
   git commit -m "feat: ログイン画面のUI作成"
   
   # リモートへ送信
   git push -u origin feature/frontend-login-ui
   ```

### 3.3 日常の開発サイクル（Commit / Push / PR）
```text
① 機能ブランチの作成 (git checkout -b feature/xxx)
      ↓
② ローカル作業 ＆ 小まめにコミット (git commit) ※何度も繰り返してOK
      ↓
③ 完成・区切りのタイミングで Push (git push)
      ↓
④ GitHub 上で Pull Request (PR) を作成・マージ
      ↓
⑤ ローカル環境を最新化 (git pull)
```

### 3.4 マージ (Pull Request) ルール
* リポジトリの保護ルールにより、**直接 Push（`main` や `develop` 等への直接 push）は禁止**されています。
* 変更の取り込みはすべて **GitHub の Pull Request (PR)** を経由してマージを行います。
* マージ順序は、作成時の逆順（`細かい機能ブランチ` ➔ `親機能ブランチ` ➔ `develop` ➔ `main`）で行います。

---

## 4. コンフリクト防止および運用ルール

1. **事前API設計（型・JSON構造の合意）**
   - フロントエンドとバックエンド間でAPIのエンドポイントおよびリクエスト/レスポンス型をあらかじめ合意し、フロントエンドはモックデータを活用して先行開発を行います。
2. **Pull Request (PR) 経由でのマージの必須化**
   - 直接 Push は拒否されるため、必ず機能ブランチから Pull Request を作成して取り込みます。
3. **小まめなコミットと適切な Push**
   - コミットは作業のセーブポイントとして頻繁に行い、一区切りついた段階で `git push` を実施します。
4. **共通設定ファイルの更新注意**
   - `package.json` や `Program.cs` などの共通設定ファイルを変更する場合は、事前に声を掛け合って編集します。
5. **作業前の pull**
   - 新しいブランチを作成する際、元のブランチで必ず `git pull` を行い、最新状態から派生させます。
