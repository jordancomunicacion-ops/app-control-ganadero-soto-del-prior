@echo off
echo ==========================================
echo   DESPLIEGUE GANADERIA (APP AUTONOMA)
echo ==========================================
echo.

cd /d "%~dp0"

echo [1/3] Empaquetando App Ganaderia...
tar --exclude="node_modules" --exclude=".next" --exclude=".git" --exclude=".idea" --exclude=".vscode" --exclude="dist" --exclude="build" --exclude="db_data" --exclude="pg_data" --exclude="*.log" --exclude="deploy.tar.gz" -czvf deploy.tar.gz .

echo.
echo [2/3] Subiendo al servidor (~/SOTOdelPRIOR/apps/ganaderia_autonoma)...
echo * Te va a pedir la contrasena del servidor *
ssh root@164.92.167.42 "mkdir -p ~/SOTOdelPRIOR/apps/ganaderia_autonoma"
scp deploy.tar.gz root@164.92.167.42:/root/SOTOdelPRIOR/apps/ganaderia_autonoma/deploy.tar.gz

echo.
echo [3/3] Instalando Ganaderia en el servidor...
echo * Te va a pedir la contrasena otra vez *
ssh root@164.92.167.42 "cd ~/SOTOdelPRIOR/apps/ganaderia_autonoma && tar -xzvf deploy.tar.gz > /dev/null && sed -i 's/\r$//' setup_remote.sh && bash setup_remote.sh"

echo.
echo Limpiando...
del deploy.tar.gz

echo.
echo ==========================================
echo    DESPLIEGUE GANADERIA COMPLETADO
echo ==========================================
pause
