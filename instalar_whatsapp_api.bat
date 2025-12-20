@echo off
title CONECTOR WHATSAPP API (FINAL)
echo ==================================================
echo   WHATSAPP API - CONECTOR VERCEL (MODO TUNEL)
echo ==================================================
echo.

:: 1. Docker
echo [1/2] Verificando servicos locais...
cd evolution-api
docker compose up -d
echo Servicos OK!
echo.

:: 2. O Tunel Blindado
echo [2/2] ABRINDO A PONTE PARA A VERCEL...
echo --------------------------------------------------
echo COPIE O LINK DA TELA AZUL QUE VAI ABRIR AGORA.
echo O link termina em ".pinggy.link" ou ".trycloudflare.com"
echo --------------------------------------------------
echo.
echo DICA: Nao feche a tela azul enquanto usar o sistema!
echo.
pause

:: Abre uma nova janela do PowerShell que NAO FECHA SOZINHA (NoExit)
start powershell -NoExit -Command "echo 'GERANDO LINK... AGUARDE'; ssh -o StrictHostKeyChecking=no -p 443 -R0:localhost:8080 qr@a.pinggy.io"

echo.
echo Tudo pronto! Procure o link na nova janela que abriu.
pause
