#!/bin/bash
echo "=== Configurando Servidor Ganaderia (Modo Autonomo) ==="

echo "-> Deteniendo Ganaderia..."
docker-compose down --remove-orphans || true

echo "-> Limpiando espacio de despliegues anteriores..."
docker system prune -f

echo "-> Desplegando Ganaderia..."
docker-compose up -d --build --force-recreate

echo "=== Despliegue completado ==="
echo "La app debería estar disponible en:"
echo "  - http://$(curl -s ifconfig.me):3005"
