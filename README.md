# Study
## コマンド

pip install 通らない​場合の​ベストプラクティス
pip install {ライブラリ名} --proxy http://ctg-proxy.tg-group.tokyo-gas.co.jp:8080 --trusted-host pypi.python.org --trusted-host files.pythonhosted.org --trusted-host pypi.org --default-timeout=100

venvの仮想環境に入るコマンド
source qcde_venv/Scripts/activate

venvの仮想環境から出るコマンド
deactivate

プロキシ関係
環境変数設定
export HTTP_PROXY=http://tg-proxy.tg-group.tokyo-gas.co.jp:8080 export HTTPS_PROXY=http://tg-proxy.tg-group.tokyo-gas.co.jp:8080
git config --global https.proxy http://tg-proxy.tg-group.tokyo-gas.co.jp:8080
git config --global http.proxy http://tg-proxy.tg-group.tokyo-gas.co.jp:8080

バックエンドで実行
 #サーバーをローカルで起動 (利用可能な環境: dev1, dev2, dev3, dev4, stg, prod)  ./devtool.sh exec dev2   # 環境情報の確認  ./devtool.sh env dev2   # テスト実行  ./devtool.sh test dev2

フロントエンド起動方法

npm run dev:[オプション]
package.jsonに書かれたdevスクリプトを実行するコマンド

pip install -r request


##


https://teams.microsoft.com/meet/4162257099097?p=5IMV8fAUzcf2ZZbAdV
