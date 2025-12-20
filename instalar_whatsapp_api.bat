@echo off
setlocal
echo ==================================================
echo   WHATSAPP API - CONECTOR VERCEL (MODO FINAL)
echo ==================================================
echo.

:: 1. Docker
echo [1/2] Iniciando servicos locais...
cd evolution-api
docker compose up -d
echo Servicos OK!
echo.

:: 2. Tunel Localhost.run (Sem Senha)
echo [2/2] GERANDO LINK PARA VERCEL...
echo --------------------------------------------------
echo COPIE O LINK QUE TERMINA EM ".lhr.life"
echo Sera algo parecido com: https://...lhr.life
echo --------------------------------------------------
echo.
echo DICA: Se a janela azul pedir senha, FECHE ELA 
echo e use o comando manual que mandei no chat.
echo.
pause

:: Abre o PowerShell com o comando que nao pede senha
start powershell -NoExit -Command "echo 'GERANDO LINK...'; ssh -o StrictHostKeyChecking=no -R 80:localhost:8080 nokey@localhost.run"

echo Todo pronto! Procure o link na nova janela que abriu.
pause
