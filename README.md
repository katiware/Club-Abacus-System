# Club-Abacus-System
部費・経費管理システム (Club Fee-Management-System)

このプロジェクトは、フロントエンドにReact(Vite)、バックエンドにASP.NET Core(C#)、データベースにPostgreSQLを使用したモダンなWebアプリケーションです。
インフラとローカル開発環境の管理に **.NET Aspire** を導入しているため、Dockerがインストールされていれば、コマンド一つでDBからフロントエンドまで全てが立ち上がります。

---

## 🛠 動作要件 (Prerequisites)
プロジェクトを立ち上げる前に、以下のソフトウェアがインストールされていることを確認してください。
*   [.NET 10 SDK](https://dotnet.microsoft.com/download)
*   [Node.js](https://nodejs.org/) (v18以上推奨)
*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) （**※.NET AspireがPostgreSQLを自動構築するために必須で、起動している必要があります**）

---

## 🚀 ローカル環境の立ち上げ手順 (Setup Guide)

リポジトリをForkし、ローカルにCloneした後の立ち上げ手順です。

### 1. フロントエンドのパッケージインストール
Aspireからフロントエンドを起動するため、事前にNodeモジュールをインストールしておきます。
```bash
cd frontend
npm install
```

### 2. 環境変数・設定ファイルの準備
このシステムはGoogleログインを利用しています。ご自身のGoogle Cloud ConsoleからOAuthクライアントIDを取得し、設定します。

**① フロントエンド設定 (`frontend/.env`)**
`frontend` フォルダに `.env` ファイルを作成し、以下を記述します。
```env
VITE_GOOGLE_CLIENT_ID=あなたのGoogleクライアントID.apps.googleusercontent.com
VITE_API_BASE_URL=http://localhost:5001/api
```

**② バックエンド設定 (`backend/appsettings.Development.json`)**
`backend` フォルダの `appsettings.Development.json` を作成・編集し、GoogleのClientIdと、**初期管理者**となるメールアドレスを設定します。
（※システム起動時に、ここで指定したメールアドレスに対して自動的に管理者権限が付与されます）
```json
{
  "Authentication": {
    "Google": {
      "ClientId": "あなたのGoogleクライアントID.apps.googleusercontent.com"
    }
  },
  "AdminSettings": {
    "InitialAdminEmail": "admin@hiro.kindai.ac.jp" // ご自身のGoogleアカウントのメールアドレス
  }
}
```

### 3. アプリケーションの起動 (.NET Aspire)
ルートディレクトリ（または `AppHost` ディレクトリ）に戻り、Aspireプロジェクトを実行します。
```bash
cd ../AppHost
dotnet run
```
※ Visual Studio 2022 や Rider などのIDEをお使いの場合は、`Club-Abacus-System.slnx` (または `AppHost` プロジェクト) をスタートアッププロジェクトに設定して **F5 (実行)** を押すだけでOKです。

### 4. 起動の確認
`dotnet run` を実行すると、ターミナルに **Aspire Dashboard** のURL（例: `http://localhost:15000` など）が表示されます。
ダッシュボードを開くと、以下のリソースが立ち上がっていることが確認できます。
*   `postgres` / `postgresdb`: データベース (自動でマイグレーションも実行されます)
*   `backend`: ASP.NET Core API (ポート5001番)
*   `frontend`: Vite (ポート5173番)

フロントエンド (`http://localhost:5173`) にアクセスし、設定したGoogleアカウントでログインできれば立ち上げ完了です！

---

## 📝 開発時のポイント
*   **データベースのマイグレーションについて**: 
    バックエンドの起動時 (`Program.cs`) に、`context.Database.Migrate()` が自動で走り、テーブル作成や初期データ（権限設定など）の投入が行われるようになっています。手動での `dotnet ef` コマンドは原則不要です。
*   **技術スタックについて**:
    [![My Skills](https://skillicons.dev/icons?i=react,vite,js,html,css,nodejs,cs,dotnet,postgres,aws)](https://skillicons.dev)
