@echo off
chcp 65001 >nul
title Calculadora de Emprestimo
cd /d "%~dp0"

docker info >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Docker nao esta em execucao. Abra o Docker Desktop e tente novamente.
  pause
  exit /b 1
)

echo Construindo a imagem (typecheck, lint e testes rodam aqui) e subindo o container...
docker compose up -d --build app
if errorlevel 1 (
  echo [ERRO] A build falhou. Verifique os testes/lint acima.
  pause
  exit /b 1
)

echo Aguardando a aplicacao responder...
for /l %%i in (1,1,60) do (
  curl -s -o nul http://localhost:8080/ && goto pronto
  timeout /t 1 /nobreak >nul
)
echo [ERRO] A aplicacao nao respondeu a tempo.
pause
exit /b 1

:pronto
echo Aplicacao no ar em http://localhost:8080
start "" http://localhost:8080
timeout /t 3 >nul
