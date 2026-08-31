#!/bin/sh
# ===================================================================
#  Disparador externo del recolector
#  -------------------------------------------------------------------
#  Pide a GitHub que ejecute el flujo «Recolector horario». Sirve para
#  no depender del cron de GitHub Actions, que puede tardar horas en
#  activarse en un repositorio recién despertado.
#
#  Uso:
#      GITHUB_TOKEN=github_pat_xxx ./disparar.sh
#
#  Sin dependencias: solo curl. Devuelve 0 si GitHub aceptó la orden.
#  Ver docs/DISPARADOR-EXTERNO.md para montarlo en un servicio de cron.
# ===================================================================
set -eu

REPO="${REPO:-Daniel01010101010101/Politica}"
FLUJO="${FLUJO:-recolector.yml}"
RAMA="${RAMA:-main}"
INTENTOS="${INTENTOS:-3}"

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "Falta GITHUB_TOKEN. Cree un token de acceso personal con permiso" >&2
  echo "'Actions: Read and write' sobre $REPO. Ver docs/DISPARADOR-EXTERNO.md" >&2
  exit 2
fi

URL="https://api.github.com/repos/$REPO/actions/workflows/$FLUJO/dispatches"
i=1
while [ "$i" -le "$INTENTOS" ]; do
  CODIGO=$(curl -sS -o /tmp/disparador.out -w '%{http_code}' \
    -X POST "$URL" \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    -H "Content-Type: application/json" \
    -d "{\"ref\":\"$RAMA\"}" || echo "000")

  # 204 No Content es la respuesta correcta: GitHub encoló la corrida
  if [ "$CODIGO" = "204" ]; then
    echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') · recolección encolada"
    exit 0
  fi

  echo "$(date -u '+%Y-%m-%d %H:%M:%S UTC') · intento $i falló (HTTP $CODIGO): $(cat /tmp/disparador.out)" >&2

  # Un 401/403/404 no se arregla reintentando: es el token o la ruta
  case "$CODIGO" in
    401) echo "Token inválido o caducado." >&2; exit 1 ;;
    403) echo "El token no tiene permiso 'Actions: write' sobre $REPO." >&2; exit 1 ;;
    404) echo "No existe $REPO o el flujo $FLUJO, o el token no ve el repositorio." >&2; exit 1 ;;
  esac

  i=$((i + 1))
  [ "$i" -le "$INTENTOS" ] && sleep $((i * 5))
done

echo "GitHub no aceptó la orden tras $INTENTOS intentos." >&2
exit 1
