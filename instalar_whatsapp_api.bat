@echo off
echo ==========================================
echo LIMPANDO INSTALACOES ANTERIORES...
echo ==========================================
docker stop evolution-api
docker rm evolution-api
echo.
echo ==========================================
echo INSTALANDO EVOLUTION API v2 (NOVA TENTATIVA)
echo ==========================================
echo.
cd evolution-api
docker compose down
docker compose up -d
echo.
echo ==========================================
echo VERIFICANDO STATUS...
echo ==========================================
docker ps | findstr evolution
echo.
echo Se voce ver nomes como "evolution_api" e "postgres" acima, deu certo!
echo AGUARDE 30 SEGUNDOS E ACESSE: http://localhost:8080
echo ==========================================
pause
