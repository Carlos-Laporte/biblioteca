@echo off
cd /d "%~dp0"
docker compose --profile ferramentas down --remove-orphans
echo Containers parados.
timeout /t 3 >nul
