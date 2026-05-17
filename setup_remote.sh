#!/bin/bash
set -e

echo "=== Configurando Servidor Ganaderia (Modo Autonomo) ==="

if [ ! -f .env ]; then
    echo "ERROR: No se encontró el archivo .env en el directorio actual."
    echo "Por favor, asegúrate de que el archivo .env se haya copiado correctamente."
    exit 1
fi

echo "-> Deteniendo Ganaderia..."
docker stop sotoganaderia-web sotoganaderia-db || true
docker rm sotoganaderia-web sotoganaderia-db || true
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

echo "-> Aplicando schema a la base de datos (db push)..."
# Usamos `prisma db push` porque este proyecto no mantiene migraciones
# generadas en `prisma/migrations/`. `db push` sincroniza el schema declarativo
# contra la BD existente sin requerir histórico de migraciones — idempotente y
# seguro para añadir índices o columnas nuevas. Si en el futuro se adopta el
# flujo de migraciones, sustituir por `prisma migrate deploy`.
docker compose exec -T sotoganaderia-web npx prisma db push --skip-generate || echo "ADVERTENCIA: Falló la sincronización del schema, verifica los logs."

echo "-> Inicializando/Actualizando datos (Seed)..."
docker compose exec -T sotoganaderia-web npx prisma db seed || echo "ADVERTENCIA: Falló el seed de la base de datos."

echo "=== Despliegue completado ==="
echo "La app debería estar disponible en:"
echo "  - https://ganaderia.sotodelprior.com"
echo ""
echo "Estado de los contenedores:"
docker compose ps
