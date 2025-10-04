# -*- coding: utf-8 -*-

import http.server
import socketserver
import socket

# --- 設定 ---
PORT = 8000
# --- 設定ここまで ---

# IPアドレスを取得する
def get_ip_address():
    try:
        # ダミーのソケットを作成して外部に接続し、ローカルIPを取得する
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception as e:
        print(f"IPアドレスの取得に失敗しました: {e}")
        return "N/A" # 取得失敗時は N/A を返す

# HTTPリクエストを処理するハンドラ
Handler = http.server.SimpleHTTPRequestHandler

# サーバーを起動する
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    ip_address = get_ip_address()
    print("サーバーを起動しました。")
    print("----------------------------------------")
    print("このデバイスのブラウザでアクセスする場合:")
    print(f"  http://localhost:{PORT}")
    print(f"  http://127.0.0.1:{PORT}")
    print("\n同じWi-Fiネットワーク上の他のデバイスからアクセスする場合:")
    print(f"  http://{ip_address}:{PORT}")
    print("----------------------------------------")
    print("サーバーを停止するには、Pythonistaの停止ボタンを押してください。")
    
    # サーバーを永続的に実行する
    httpd.serve_forever()


