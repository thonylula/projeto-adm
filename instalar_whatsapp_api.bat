@echo off
echo ==========================================
echo INSTALANDO EVOLUTION API v2 (WHATSAPP)
echo ==========================================
echo.
cd evolution-api
docker compose up -d
echo.
echo ==========================================
echo PRONTO! A API ESTA SENDO INICIADA.
echo AGUARDE UM MINUTO E ACESSE: http://localhost:8080
echo ==========================================
pause
