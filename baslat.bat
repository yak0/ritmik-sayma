@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 sunucu.py %*
  goto :eof
)
where python >nul 2>nul
if %errorlevel%==0 (
  python sunucu.py %*
  goto :eof
)
echo.
echo   Python 3 bulunamadi. https://www.python.org/downloads/ adresinden kurun.
echo.
pause
