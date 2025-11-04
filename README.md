# Auto Analyze - AI-Powered Data Pipeline Platform

ビジュアルデータパイプラインシステム
OpenAI GPTを使用したデータ分析・変換・可視化プラットフォーム

## 🚀 クイックスタート

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev
```

- **フロントエンド**: http://localhost:3000
- **バックエンド**: http://localhost:3001

## 📁 プロジェクト構成

```
auto-analyze/
├── backend/          # Express + OpenAI Agent
├── frontend/         # React + TypeScript + Tailwind
├── shared/           # 共通型定義
└── test/data/        # テストデータ
```

## ✨ 主要機能

### 🗄️ データ登録
- **ファイルアップロード**: Excel (`.xlsx`, `.xls`) / CSV ファイルのサポート
- **データベース管理**: SQLiteベースのデータストレージ
- **データプレビュー**: アップロードしたデータの即座のプレビュー

### 🔄 データ変換パイプライン
- **ビジュアルエディター**: ドラッグ&ドロップでパイプラインを構築
- **ノードタイプ**:
  - **Data Source**: データベースからデータを読み込み
  - **Filter**: 条件に基づくデータフィルタリング
  - **Transform**: フィールド変換・計算・型変換
  - **Aggregate**: グループ化と集計（Sum, Avg, Min, Max, Count, Distinct）
  - **Join**: 複数データソースの結合
  - **Visualization**: チャート生成
- **パイプライン保存**: 作成したパイプラインを保存・再利用可能
- **リアルタイム実行**: パイプラインの即座の実行と結果表示

### 📊 データ可視化
- **チャートタイプ**:
  - Line Chart（折れ線グラフ）
  - Bar Chart（棒グラフ）
  - Scatter Plot（散布図）
  - Pie Chart（円グラフ）
- **インタラクティブ**: Rechartsによる動的な可視化
- **カスタマイズ**: 軸の設定、カラーテーマ対応

### 🤖 AI分析（既存機能）
- **統計分析**: データの基本統計量、相関分析
- **機械学習**: パターン認識、予測モデリング
- **自動インサイト**: OpenAI GPTによる分析結果の解釈

## 🔧 API

### データベース管理
```bash
# データベース作成
POST /api/database/create
Content-Type: multipart/form-data
- file: Excel/CSV file
- name: database name

# データベース一覧取得
GET /api/database/list

# データ取得
GET /api/database/:id/data?page=1&limit=50

# データベース削除
DELETE /api/database/:id
```

### パイプライン管理
```bash
# パイプライン作成
POST /api/pipeline
Content-Type: application/json
{
  "name": "My Pipeline",
  "description": "...",
  "nodes": [...],
  "edges": [...]
}

# パイプライン一覧取得
GET /api/pipeline/list

# パイプライン取得
GET /api/pipeline/:id

# パイプライン更新
PUT /api/pipeline/:id

# パイプライン削除
DELETE /api/pipeline/:id

# パイプライン実行
POST /api/pipeline/:id/execute
```

### AI分析
```bash
# データ分析
POST /api/analyze
Content-Type: application/json
{
  "type": "statistical|ml|visualization",
  "data": [...],
  "parameters": {...}
}

# Excelファイル分析
POST /api/analyze-excel
Content-Type: multipart/form-data
- file: Excel file (.xlsx)
- type: analysis type
```

## 🧪 テスト

```bash
cd backend && npm test
```

- ✅ AI Agent機能テスト
- ✅ Excel読み込みテスト
- ✅ API エンドポイントテスト
- ✅ 統合テスト (500行ダミーデータ使用)

## 🛠️ 技術スタック

### Backend
- **Runtime**: Node.js, TypeScript
- **Framework**: Express.js
- **Data Processing**:
  - SQLite3 (データストレージ)
  - xlsx (Excelファイル処理)
  - csv-parser (CSVファイル処理)
- **AI**: OpenAI API (GPT-3.5/4)
- **File Upload**: Multer

### Frontend
- **Framework**: React 18, TypeScript
- **Styling**: TailwindCSS
- **Build**: Vite
- **Pipeline Editor**: React Flow
- **Visualization**: Recharts
- **Routing**: React Router

### Shared
- **Type Safety**: TypeScript共通型定義

### Testing
- **Framework**: Jest, Supertest
- **Coverage**: Unit tests, Integration tests

## 📝 環境設定

`.env`ファイルにOpenAI APIキーを設定:

```
OPENAI_API_KEY=your_api_key_here
```

## 📖 使い方

### 1. データの登録
1. **Database**タブに移動
2. "Create Database"をクリック
3. Excel/CSVファイルをアップロード
4. データベース名を入力して作成

### 2. パイプラインの構築
1. **Pipeline**タブに移動
2. "New Pipeline"をクリックしてパイプライン名を入力
3. 左側のパネルからノードを追加:
   - **Data Source**: データベースを選択
   - **Filter**: フィルター条件を設定
   - **Transform**: データ変換を定義
   - **Aggregate**: 集計処理を設定
   - **Visualization**: グラフタイプと軸を設定
4. ノードを接続してデータフローを定義
5. "Save"で保存

### 3. パイプラインの実行
1. パイプラインを選択
2. "Execute"をクリック
3. 結果がグラフまたはテーブルで表示される

### 4. AI分析（オプション）
1. **Analysis**タブに移動
2. ファイルをアップロード
3. 分析タイプを選択（Statistical/ML/Visualization）
4. OpenAI GPTによる自動分析結果を取得

## 🎯 ユースケース

1. **売上データ分析**: 売上データを月別・商品別に集計して可視化
2. **顧客セグメンテーション**: 顧客データをフィルタリング・集計してセグメント分析
3. **KPIダッシュボード**: 複数のデータソースを結合して指標を計算・表示
4. **データクレンジング**: 不要なデータをフィルタリング、必要な変換を適用
5. **レポート自動生成**: パイプラインを保存して定期的なレポート生成に活用