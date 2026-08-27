# 部費管理アプリ 詳細設計

## 1. データ構造要件（データベース設計）

### 1.1 ユーザー・権限管理グループ

#### テーブル1-A: Users（ユーザー管理）
| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | Primary Key | ユーザーの一意な識別子 |
| role_id | UUID | Foreign Key | 紐づくロールのID |
| email | String | Unique, Not Null | Googleアカウントのアドレス |
| name | String | Not Null | 氏名 |

| is_active | Boolean | Default: true | ログイン可否制御 |
| created_at | Timestamp | Not Null | 作成日時 |
| updated_at | Timestamp | Not Null | 更新日時 |

#### テーブル1-B: Roles（ロール定義・新設）
管理者と一般部員という「役職」を定義します。
| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | Primary Key | ロールの一意な識別子 |
| role_name | String | Unique, Not Null | ロール名（例: ADMIN, MEMBER） |
| description | String | Nullable | ロールの説明（例: 管理者、一般部員） |

#### テーブル1-C: Permissions（権限定義）
| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | Primary Key | 権限の一意な識別子 |
| permission_name | String | Unique, Not Null | 権限名（例: APPROVE_EXPENSE, MANAGE_USERS） |
| description | String | Nullable | 権限の詳細な説明 |

#### テーブル1-D: UserPermissions（ユーザー・権限 中間テーブル）
| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| user_id | UUID | Primary Key, FK | 紐づくユーザーのID |
| permission_id | UUID | Primary Key, FK | 紐づく権限のID |

#### テーブル1-E: RolePermissions（ロール・権限 中間テーブル・新設）
「管理者には全権限を、一般部員には閲覧権限のみを付与する」といった基本設定を行います。
| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| role_id | UUID | Primary Key, FK | 紐づくロールのID |
| permission_id | UUID | Primary Key, FK | 紐づく権限のID |

### 1.2 経費申請・明細グループ

#### テーブル2-A: ExpenseRequests（単発の申請データ）
※定期支払い用のテンプレート情報を別テーブル（2-C）に分離しました。
| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | Primary Key | 申請の識別子 |
| user_id | UUID | Foreign Key | 申請者のID |
| type | Enum | Not Null | ExpenseType (Reimbursement / Advance) |
| receipt_type | Enum | Not Null | ReceiptType (Digital / Paper) |
| status | Enum | Not Null | ExpenseStatus (PendingApproval 等) |
| total_amount | Integer | Not Null | 申請の合計金額 |
| approved_by_id | UUID | FK, Nullable | 承認者のID |
| approved_at | Timestamp | Nullable | 承認日時 |
| rejection_reason | Text | Nullable | 却下・差し戻し理由 |
| period_assignment_status | Enum | Not Null | 割当ステータス (Provisional/Confirmed/Corrected) |
| university_submission_batch_id | UUID | FK, Nullable | 紐づく提出バッチ（箱）のID |
| recurring_template_id | UUID | FK | 定期バッチから自動生成された場合の親テンプレートID |
| created_at | Timestamp | Not Null | 作成日時 |
| updated_at | Timestamp | Not Null | 更新日時 |
| deleted_at | Timestamp | Nullable | 論理削除用タイムスタンプ |

#### テーブル2-C: RecurringExpenseTemplates（定期支払い設定・新設）
| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | Primary Key | テンプレートの識別子 |
| user_id | UUID | Foreign Key | 作成者のID |
| template_name | String | Not Null | テンプレート名 |
| template_status | Enum | Not Null | TemplateStatus (Active / Inactive) |
| recurring_frequency | Enum | Not Null | RecurringFrequency (Monthly / Yearly) |
| expense_type | Enum | Not Null | ExpenseType (Reimbursement / Advance) |
| receipt_type | Enum | Not Null | ReceiptType (Digital / Paper) |
| item_name | String | Not Null | 定期支払いの名目 |
| amount | Integer | Not Null | 金額 |
| payee | String | Not Null | 支払先 |
| category | String | Not Null | 使途カテゴリ |
| next_generation_date | Date | Not Null | 次に実データを生成する日付 |
| created_at | Timestamp | Not Null | 作成日時 |
| updated_at | Timestamp | Not Null | 更新日時 |
| deleted_at | Timestamp | Nullable | 論理削除用タイムスタンプ |

#### テーブル2-B: ExpenseItems（申請明細データ・子）
| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | Primary Key | 明細の識別子 |
| request_id | UUID | Foreign Key | 紐づくExpenseRequestsのID |
| item_name | String | Not Null | 商品名・書籍名 |
| unit_price | Integer | Not Null | 単価 |
| quantity | Integer | Default: 1 | 数量 |
| payee | String | Not Null | 支払先 |
| category | String | Not Null | 使途カテゴリ |
| description | Text | Nullable | 用途詳細 |
| created_at | Timestamp | Not Null | 作成日時 |
| updated_at | Timestamp | Not Null | 更新日時 |

#### テーブル2-D: ExpenseDocuments（証憑書類データ・新設）
画像やPDFなどの証憑ファイルを管理するテーブルです。ExpenseRequestsと1対多の関係になります。
| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | Primary Key | 証憑の識別子 |
| request_id | UUID | Foreign Key | 紐づくExpenseRequestsのID |
| document_type | Enum | Not Null | DocumentType (Receipt / Quotation / Invoice) |
| storage_key | String | Not Null | S3等のストレージ識別キー |
| original_file_name | String | Not Null | 表示用ファイル名 |
| content_type | String | Not Null | MIMEタイプ (例: application/pdf) |
| uploaded_at | Timestamp | Not Null | アップロード日時 |
| deleted_at | Timestamp | Nullable | 論理削除用タイムスタンプ |

### 1.3 監査ロググループ

#### テーブル3: AuditLogs（ポリモーフィック操作ログ）
※あらゆるテーブルの操作を記録できる構造に変更。
| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | Primary Key | ログの一意な識別子 |
| target_type | String | Not Null | 操作対象のテーブル名（例: 'ExpenseRequests', 'Users'） |
| target_id | UUID | Not Null | 操作対象レコードのID（ポリモーフィックなID） |
| user_id | UUID | Foreign Key | 操作を行ったユーザーのID |
| action | String | Not Null | 操作の種類（例: UPDATE, DELETE, STATUS_CHANGE） |
| old_value | JSON | Nullable | 変更前の値（JSON形式） |
| new_value | JSON | Nullable | 変更後の値（JSON形式） |
| created_at | Timestamp | Not Null | 操作が行われた日時 |

### 1.4 年度・予算管理グループ

#### テーブル4: FiscalYears（年度マスタ）
| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | Primary Key | 年度マスタの一意な識別子 |
| year_name | String | Not Null | 年度名（例: "2026年度"） |
| start_date | Date | Not Null | 開始日 |
| end_date | Date | Not Null | 終了日 |
| total_budget | Integer | Not Null | 今年度の部費予算総額 |
| is_closed | Boolean | Default: false | 年度締めフラグ |
| created_at | Timestamp | Not Null | 作成日時 |
| updated_at | Timestamp | Not Null | 更新日時 |

#### テーブル5: UniversitySubmissionBatches（大学提出バッチ）
| カラム名 | データ型 | 制約 | 説明 |
| :--- | :--- | :--- | :--- |
| id | UUID | Primary Key | 提出バッチの一意な識別子 |
| target_month | Date | Not Null | 対象月 (例: 2027-04-01) |
| fiscal_year_id | UUID | FK | 所属する年度（FiscalYears）のID |
| is_submitted | Boolean | Default: false | 提出済みフラグ |
| submitted_at | Timestamp | Nullable | 提出操作を行った日時 |
| created_at | Timestamp | Not Null | 作成日時 |
| updated_at | Timestamp | Not Null | 更新日時 |

## 2. 技術スタック
本プロジェクトにおいて採用する技術要素および開発環境は以下の通りとする。

| 領域 | 採用技術・言語 | 役割・備考 |
| :--- | :--- | :--- |
| **フロントエンド** | React | ユーザーインターフェース（各種申請画面、管理ダッシュボード等）の構築を担当。 |
| **バックエンド** | C# (ASP.NET Core) | APIサーバーとして、フロントエンドからのリクエスト処理およびビジネスロジックを実行。 |
| **データベース** | PostgreSQL | リレーショナルデータの管理（ヘッダー・ディテール構造の帳票データや権限管理など）。C#側からORM（Entity Framework Core等を想定）を介して接続。 |

| **開発環境** | Google AntiGravity | VS CodeベースのエージェントファーストIDE、または既存VS Code＋AntiGravity拡張機能を利用。各種ランタイム（.NET SDK, Node.js, Python）のローカルインストールを前提とする。 |

## 3. ディレクトリ構成
システム全体を単一のリポジトリで管理する「モノレポ構成」を採用する。これにより、AIエージェント（AntiGravity）がフロントエンドからバックエンドまでの文脈を横断的に把握しやすくなる。

```text
club-budget-management/
├── .vscode/               # 開発環境設定（デバッグ構成、AntiGravity用設定、拡張機能設定など）
├── docs/                  # 設計ドキュメント、AIエージェント向け要件定義書・コーディング規約
├── frontend/              # フロントエンド環境 (React)
│   ├── public/            # 静的ファイル群
│   ├── src/               # ソースコード
│   │   ├── components/    # 共通UIコンポーネント（ボタン、入力フォーム等）
│   │   ├── pages/         # 画面コンポーネント（ダッシュボード、経費申請画面等）
│   │   ├── services/      # バックエンドAPI通信ロジック
│   │   └── App.jsx        # フロントエンドのエントリーポイント
│   └── package.json       # Node.jsパッケージおよび依存関係管理
├── backend/               # バックエンドAPI環境 (C# / ASP.NET Core)
│   ├── Controllers/       # APIエンドポイント定義 (経費受付、ステータス変更等)
│   ├── Models/            # データモデル (DBスキーマ定義、ORM用エンティティ)
│   ├── Services/          # ビジネスロジック (承認処理、計算処理等)
│   ├── appsettings.json   # 環境変数、データベース接続文字列設定
│   ├── Program.cs         # アプリケーション起動・ミドルウェア設定
│   └── backend.csproj     # C#プロジェクト設定ファイル

```
