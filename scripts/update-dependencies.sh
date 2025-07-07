#!/bin/bash

# ===============================================================================
# 依存関係更新スクリプト
# ===============================================================================
# このスクリプトは、@e-state/coreパッケージが新しいバージョンで公開された後に
# react パッケージの依存関係を自動更新します。
#
# 処理の流れ:
# 1. core/package.json からバージョンを自動取得
# 2. NPMレジストリで該当バージョンの公開を待機
# 3. react パッケージの依存関係を更新
# 4. 各パッケージの npm install を実行
#
# Usage: ./scripts/update-dependencies.sh
# ===============================================================================

echo "📋 coreパッケージのバージョンを自動取得中..."
# Node.js の require を使って core/package.json から version フィールドを取得
# -p オプションで評価結果を出力
CORE_VERSION=$(node -p "require('./core/package.json').version")
echo "📦 検出されたバージョン: $CORE_VERSION"

echo "🚀 @e-state/core@$CORE_VERSION への依存関係更新を開始します..."

# ===============================================================================
# NPMレジストリでの公開待機
# ===============================================================================
# npm publish 直後はレジストリに反映されるまで時間がかかるため、
# 最大5分間（30回 × 10秒）待機してバージョンの存在を確認
echo "📦 NPMレジストリで @e-state/core@$CORE_VERSION の存在を確認中..."
RETRY_COUNT=0
MAX_RETRIES=30  # 最大30回リトライ（5分間）

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    # npm view コマンドで指定バージョンが存在するかチェック
    # > /dev/null 2>&1 でエラー出力を抑制
    if npm view @e-state/core@$CORE_VERSION version > /dev/null 2>&1; then
        echo "✅ @e-state/core@$CORE_VERSION が確認されました"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "⏱️  待機中... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 10  # 10秒待機
done

# タイムアウト時の処理
if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ @e-state/core@$CORE_VERSION がNPMレジストリに見つかりません（タイムアウト）"
    exit 1
fi

# ===============================================================================
# reactパッケージの依存関係更新
# ===============================================================================
echo "🔄 react パッケージの依存関係を更新中..."
cd react

# --save-exact で ^なしの正確なバージョンを package.json に保存
# 例: "@e-state/core": "0.2.64" (^0.2.64 ではなく)
npm install @e-state/core@$CORE_VERSION --save-exact
if [ $? -ne 0 ]; then
    echo "❌ react パッケージの依存関係更新に失敗しました"
    exit 1
fi

# vite-exampleの依存関係更新
# react パッケージの依存関係が更新されたため、vite-example も更新が必要
echo "🔄 vite-example の依存関係を更新中..."
cd vite-example
npm install  # package-lock.json を更新
if [ $? -ne 0 ]; then
    echo "❌ vite-example の依存関係更新に失敗しました"
    exit 1
fi

# react パッケージ自体の依存関係も更新
cd ..  # react/ ディレクトリに戻る
npm install  # package-lock.json を更新
if [ $? -ne 0 ]; then
    echo "❌ react の依存関係更新に失敗しました"
    exit 1
fi

cd ..  # プロジェクトルートに戻る


# ===============================================================================
# 完了メッセージとNext Steps
# ===============================================================================
echo "✅ すべての依存関係が正常に更新されました！"
echo ""
echo "📋 更新されたファイル:"
echo "   - react/package-lock.json"
echo "   - react/vite-example/package-lock.json"
