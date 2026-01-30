#!/bin/bash
set -e

echo "=== Configurando Servidor Ganaderia (Modo Autonomo) ==="

if [ ! -f .env ]; then
    echo "ERROR: No se encontró el archivo .env en el directorio actual."
    echo "Por favor, asegúrate de que el archivo .env se haya copiado correctamente."
    exit 1
fi

echo "-> Deteniendo Ganaderia..."
docker compose down --remove-orphans || true

echo "-> Limpiando recuros no utilizados..."
# Evitamos borrar volúmenes o redes que puedan ser necesarias
docker container prune -f
docker image prune -f

echo "-> Verificando red proxy-net..."
docker network inspect proxy-net >/dev/null 2>&1 || \
    docker network create proxy-net

echo "-> Desplegando Ganaderia..."
docker compose up -d --build --force-recreate

echo "-> Esperando a que inicie la base de datos (10s)..."
sleep 10

echo "-> Aplicando migraciones de base de datos..."
docker compose exec -T web npx prisma migrate deploy || echo "ADVERTENCIA: Fallaron las migraciones, verifica los logs."

echo "=== Despliegue completado ==="
echo "La app debería estar disponible en:"
echo "  - https://ganaderia.sotodelprior.com"
echo ""
echo "Estado de los contenedores:"
docker compose ps
