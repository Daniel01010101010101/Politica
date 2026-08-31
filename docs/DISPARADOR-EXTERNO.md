# Disparador externo

El cron de GitHub Actions no es fiable para arrancar: puede tardar horas —a veces
días— en empezar a disparar en un repositorio recién despertado, y GitHub no
garantiza la puntualidad de ninguna cita. Este documento monta un disparador que
no depende de ese cron: **un servicio externo llama a la API de GitHub cada hora y
le ordena ejecutar el recolector.**

El flujo `recolector.yml` ya acepta esa orden: declara `workflow_dispatch`, que es
el mismo mecanismo del botón «Run workflow».

---

## Lo que hay que hacer una sola vez

### 1. Crear el token

En GitHub: **Settings → Developer settings → Personal access tokens →
Fine-grained tokens → Generate new token**.

| Campo | Valor |
|---|---|
| Token name | `disparador-recolector` |
| Expiration | 1 año (anótese la fecha: hay que renovarlo) |
| Repository access | **Only select repositories** → `Politica` |
| Permissions → Repository → **Actions** | **Read and write** |

No hace falta ningún otro permiso. `Metadata: Read` se añade solo.

Copie el token al generarlo: GitHub no vuelve a mostrarlo. Empieza por
`github_pat_`. **Es una llave de su repositorio: no lo escriba en ningún archivo
del proyecto ni lo pegue en un chat.** Si se filtra, revóquelo desde la misma
pantalla y genere otro.

### 2. Programar la llamada

La orden es siempre esta petición:

```
POST https://api.github.com/repos/Daniel01010101010101/Politica/actions/workflows/recolector.yml/dispatches

Accept: application/vnd.github+json
Authorization: Bearer SU_TOKEN
X-GitHub-Api-Version: 2022-11-28
Content-Type: application/json

{"ref":"main"}
```

GitHub responde **204 sin contenido** cuando acepta la orden. Cualquier otro
código es un fallo: 401 token inválido o caducado, 403 token sin permiso
`Actions: write`, 404 repositorio o flujo mal escritos.

Elija **una** de las tres formas siguientes. Todas hacen exactamente esa petición.

---

## Opción A · cron-job.org (recomendada: gratis, sin tarjeta, sin código)

1. Cree una cuenta en <https://cron-job.org> y confirme el correo.
2. **Create cronjob**.
3. **Title**: `Recolector Política`.
4. **URL**:
   `https://api.github.com/repos/Daniel01010101010101/Politica/actions/workflows/recolector.yml/dispatches`
5. **Schedule**: cada hora. Si le deja elegir el minuto, ponga **17** —evite el
   minuto 0, que es donde se congestionan todos los programadores del mundo.
6. En las opciones avanzadas (**Advanced**):
   - **Request method**: `POST`
   - **Headers**: añada las tres líneas
     `Accept: application/vnd.github+json`
     `Authorization: Bearer SU_TOKEN`
     `X-GitHub-Api-Version: 2022-11-28`
   - **Request body**: `{"ref":"main"}`
     (marque el tipo de contenido `application/json` si lo pide)
7. Guarde y pulse **Test run**. Debe responder **204**.

cron-job.org avisa por correo cuando una ejecución falla, que es justo lo que
faltaba: enterarse de que dejó de actualizarse sin tener que mirar el tablero.

## Opción B · Google Apps Script (gratis, si prefiere no crear otra cuenta)

Está todo en `disparador/apps-script.gs`, con las instrucciones en su cabecera.
Resumen: pegar el archivo en un proyecto nuevo de <https://script.google.com>,
guardar el token en **Propiedades del script** y ejecutar `instalarDisparador`
una vez.

Google no garantiza el minuto exacto de sus disparadores horarios, pero sí que
ocurren. Para este tablero sobra.

## Opción C · Una máquina que ya esté encendida

Si tiene un servidor, una Raspberry Pi o un computador que no se apaga, use
`disparador/disparar.sh`:

```bash
# Linux o macOS: crontab -e
17 * * * * GITHUB_TOKEN=github_pat_xxx /ruta/al/repo/disparador/disparar.sh >> /var/log/recolector.log 2>&1
```

En Windows, el Programador de tareas con la misma llamada vía `curl.exe`.

El script reintenta tres veces ante fallos de red, y se rinde de inmediato ante
401, 403 o 404, porque esos no se arreglan reintentando.

---

## Comprobar que funciona

Desde cualquier terminal:

```bash
GITHUB_TOKEN=github_pat_xxx ./disparador/disparar.sh
```

Debe imprimir «recolección encolada». Un minuto después:

- En **Actions → Recolector horario** aparece una corrida nueva.
- Si hubo noticias nuevas, se añade un commit `datos: lectura del ...`.
- El tablero muestra el sello «Actualizado hace un momento».

Si no hubo novedades el recolector **no escribe ningún commit**: es correcto, no
un fallo. Una corrida en vacío dura segundos y no cuesta nada.

---

## El cron de GitHub se queda puesto

`recolector.yml` conserva su `schedule` en `17,47 * * * *`. No estorba: si algún
día GitHub empieza a disparar, será una red de seguridad más, y dos corridas
seguidas no hacen daño —la segunda no encuentra novedades y no escribe nada—.
Si prefiere quitarlo, borre las dos líneas del `schedule`; el disparador externo
sigue funcionando igual.

## Causas descartadas del cron que no arranca

Comprobadas contra la API de GitHub, no por suposición:

| Causa habitual | Estado en este repositorio |
|---|---|
| El repositorio es un *fork* (GitHub no programa cron en forks) | No lo es (`fork: false`) |
| Repositorio privado sin minutos de Actions | Es público: minutos gratis e ilimitados |
| Repositorio archivado o con Actions desactivadas | Ni archivado ni desactivado; hay corridas manuales con éxito |
| El flujo está desactivado por inactividad | `state: active` |
| El `cron` no está en la rama por defecto | Está en `main` |
| Sintaxis del `cron` inválida | `17,47 * * * *` es válida |
| Permisos de escritura del flujo | Correctos: las corridas manuales hacen *commit* y *push* |

Queda una causa compatible con todo lo anterior: **el repositorio se creó el 20 de
marzo de 2026 y no tuvo actividad hasta el 31 de agosto**, más de cinco meses
dormido. GitHub desactiva y despriorriza los cron de los repositorios inactivos, y
tarda en volver a tomarlos en serio. Es exactamente el perfil en el que el
programador no arranca aunque todo esté bien configurado — y la razón por la que
conviene no depender de él.
