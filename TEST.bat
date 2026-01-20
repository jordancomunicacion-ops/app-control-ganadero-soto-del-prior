@echo off
echo Iniciando entorno local de pruebas...
echo.
if exist docker-compose.yml (
    echo Deteniendo contenedores antiguos (si existen)...
    echo Mostrando estado actual...
    docker compose down

    echo.
    echo Levantando contenedores en segundo plano...
    docker compose up -d --build

    echo.
    echo Esperando 10 segundos a que arranque la BBDD...
    timeout /t 10 /nobreak >nul

    echo.
    echo Inicializando base de datos local...
    docker compose exec web npx prisma db push
    docker compose exec web npm run seed

    echo.
    echo Verificando usuarios...
    docker compose exec web node scripts/check_db.js

    echo.
    echo Entorno listo! Logs en tiempo real (Ctrl+C para salir):
    docker compose logs -f
) else (
    echo [ERROR] No se encuentra el archivo docker-compose.yml en el directorio actual.
    pause
    exit /b 1
)
pause
