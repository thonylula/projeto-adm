@echo off
echo ==========================================
echo LIMPANDO INSTALACOES ANTERIORES...
echo ==========================================
docker stop evolution_api_v2
docker rm evolution_api_v2
docker stop evolution_postgres
docker rm evolution_postgres
docker stop evolution_redis
docker rm evolution_redis
echo.
echo ==========================================
echo INSTALANDO EVOLUTION API v2 (MODO VERCEL)
echo ==========================================
echo.
cd evolution-api
docker compose down
docker compose up -d
echo.
echo ==========================================
echo CRIANDO TUNEL PARA VERCEL (CLOUDFLARE)
echo ==========================================
echo.
echo Aguarde o link "https://..." aparecer abaixo.
echo Nao precisa de senha nem de cadastro!
echo.
npx @cloudflare/cloudflared tunnel --url http://localhost:8080
pause
