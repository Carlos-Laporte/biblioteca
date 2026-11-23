@echo off
cd /d "%~dp0"
docker compose --profile ferramentas down --remove-orphans
echo Containers parados.
ping -n 4 127.0.0.1 >nul
exit /b 0
