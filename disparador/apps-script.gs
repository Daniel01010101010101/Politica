/* ===================================================================
   Disparador externo del recolector · Google Apps Script
   -------------------------------------------------------------------
   Alternativa sin servidor propio y sin tarjeta de crédito: Google
   ejecuta esto cada hora desde su infraestructura y le pide a GitHub
   que corra el recolector.

   Montaje (una sola vez):
     1. script.google.com → Nuevo proyecto → pegue este archivo entero.
     2. Configuración del proyecto → Propiedades del script →
        añada  GITHUB_TOKEN  con su token (ver docs/DISPARADOR-EXTERNO.md).
     3. Ejecute  instalarDisparador  una vez y acepte los permisos.
     4. Ejecute  disparar  una vez para comprobar que responde 204.

   El token vive en las propiedades del proyecto, no en el código: así
   no queda escrito en ningún archivo que pueda compartirse por error.
   =================================================================== */

var REPO  = 'Daniel01010101010101/Politica';
var FLUJO = 'recolector.yml';
var RAMA  = 'main';

function disparar() {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('Falta la propiedad GITHUB_TOKEN en el proyecto.');

  var url = 'https://api.github.com/repos/' + REPO + '/actions/workflows/' + FLUJO + '/dispatches';
  var respuesta = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': 'Bearer ' + token,
      'X-GitHub-Api-Version': '2022-11-28'
    },
    payload: JSON.stringify({ ref: RAMA }),
    muteHttpExceptions: true     // queremos leer el error, no que explote
  });

  var codigo = respuesta.getResponseCode();
  if (codigo === 204) {
    console.log('Recolección encolada.');
    return;
  }

  // 401 token caducado · 403 sin permiso Actions:write · 404 repo o flujo mal escrito
  throw new Error('GitHub respondió ' + codigo + ': ' + respuesta.getContentText());
}

/* Deja el disparo programado cada hora. Ejecutar una sola vez. */
function instalarDisparador() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'disparar') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('disparar').timeBased().everyHours(1).create();
  console.log('Disparador instalado: cada hora.');
}

/* Por si quiere detenerlo sin borrar el proyecto. */
function quitarDisparador() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'disparar') ScriptApp.deleteTrigger(t);
  });
  console.log('Disparador retirado.');
}
