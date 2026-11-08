#!/bin/bash
# Ritmik Sayma Macerası — Mac'te çift tıklayarak sunucuyu başlatır
cd "$(dirname "$0")" || exit 1
clear
if command -v python3 >/dev/null 2>&1; then
  python3 sunucu.py "$@"
else
  echo ""
  echo "  Python 3 bulunamadı."
  echo "  https://www.python.org/downloads/ adresinden kurup tekrar deneyin."
  echo ""
  read -r -p "  Kapatmak için Enter'a basın..."
fi
