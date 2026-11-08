#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ritmik Sayma Macerası — ev ağı sunucusu
-----------------------------------------
Bu klasördeki oyunu evdeki Wi-Fi ağına yayınlar; tablet aynı ağdaysa
tarayıcıdan açılır. Sadece Python 3 gerekir (ek paket yok).

Kullanım:  python3 sunucu.py            (tarayıcıda bağlantı sayfasını açar)
           python3 sunucu.py --port 9000
           python3 sunucu.py --no-browser
Durdurmak için: Ctrl + C
"""
import http.server
import json
import os
import platform
import socket
import subprocess
import sys
import threading
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))
PORTS = [8000, 8080, 8888, 8765, 5050]
seen_clients = set()


def lan_ips():
    ips = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))
        ips.append(s.getsockname()[0])
        s.close()
    except Exception:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if ip not in ips and not ip.startswith("127."):
                ips.append(ip)
    except Exception:
        pass
    return [ip for ip in ips if not ip.startswith("127.")] or ["127.0.0.1"]


def bonjour_name():
    if platform.system() == "Darwin":
        try:
            n = subprocess.check_output(["scutil", "--get", "LocalHostName"], stderr=subprocess.DEVNULL).decode().strip()
            if n:
                return n + ".local"
        except Exception:
            pass
    n = socket.gethostname()
    return n if n.endswith(".local") else n + ".local"


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = dict(http.server.SimpleHTTPRequestHandler.extensions_map)
    extensions_map.update({
        ".webmanifest": "application/manifest+json",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".svg": "image/svg+xml",
    })

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        if self.path.startswith("/api/info"):
            port = self.server.server_address[1]
            body = json.dumps({
                "ips": lan_ips(), "host": bonjour_name(), "port": port
            }).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        client = self.client_address[0]
        if client not in seen_clients and not client.startswith("127.") and self.path in ("/", "/index.html"):
            seen_clients.add(client)
            print(f"  📱 Yeni cihaz bağlandı: {client}")
        super().do_GET()

    def log_message(self, fmt, *args):
        pass  # sessiz çalış


def main():
    args = sys.argv[1:]
    ports = PORTS
    if "--port" in args:
        try:
            ports = [int(args[args.index("--port") + 1])]
        except (ValueError, IndexError):
            print("Port numarası hatalı."); sys.exit(1)

    httpd = None
    for p in ports:
        try:
            httpd = http.server.ThreadingHTTPServer(("0.0.0.0", p), Handler)
            break
        except OSError:
            continue
    if not httpd:
        print("Boş port bulunamadı. --port ile başka bir port deneyin."); sys.exit(1)

    port = httpd.server_address[1]
    ips = lan_ips()
    host = bonjour_name()
    line = "═" * 58
    print(f"\n{line}")
    print("  🎈  RİTMİK SAYMA MACERASI — sunucu çalışıyor")
    print(line)
    print("  Tablette (aynı Wi-Fi ağında) tarayıcıya şunu yazın:\n")
    for ip in ips:
        print(f"     👉  http://{ip}:{port}")
    print(f"     👉  http://{host}:{port}   (isimle, IP değişse de çalışır)")
    print(f"\n  Bu bilgisayarda:  http://localhost:{port}")
    print(f"  QR kod sayfası :  http://localhost:{port}/baglan.html")
    print(f"\n  Durdurmak için bu pencerede Ctrl + C")
    print(f"{line}\n")

    if "--no-browser" not in args:
        threading.Timer(0.8, lambda: webbrowser.open(f"http://localhost:{port}/baglan.html")).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  Sunucu kapatıldı. Görüşmek üzere! 👋\n")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
