# Fuentes

Cada fuente lleva un peso entre 0 y 1 que pondera el puntaje de impacto: un
comunicado de Presidencia pesa más que un agregador. Cuando una fuente tiene varios
feeds, el recolector los prueba en orden y se queda con el primero que responda.

## Institucionales

| Fuente | Acceso | Peso | Nota |
|---|---|---|---|
| Presidencia de la República | RSS propio, con respaldo por búsqueda | 1.00 | El RSS de prensa cambia con cada rediseño; por eso lleva respaldo |
| Senado | Búsqueda restringida al dominio | 1.00 | No publica RSS estable |
| Cámara de Representantes | Búsqueda restringida al dominio | 1.00 | Igual que el Senado |
| Concejo de Bogotá | Búsqueda restringida al dominio | 0.95 | |
| Alcaldía de Bogotá | RSS propio, con respaldo | 0.95 | |
| Procuraduría, Contraloría y Fiscalía | Búsqueda por dominio | 1.00 | Alimenta el módulo 10 |
| DANE y Banco de la República | Búsqueda por dominio | 1.00 | Indicadores macro |

## Medios

| Fuente | Acceso | Peso |
|---|---|---|
| El Tiempo — Política, Gobierno, Congreso, Partidos, Bogotá, Justicia, Economía | RSS propio verificado | 0.85 |
| Portafolio | RSS propio, con respaldo | 0.85 |
| La República | RSS propio, con respaldo | 0.85 |
| Semana | RSS de Arc XP, con respaldo | 0.75 |
| Cambio | RSS propio, con respaldo | 0.80 |
| Infobae Colombia | RSS de Arc XP, con respaldo | 0.70 |

El Tiempo publica su catálogo completo en <https://www.eltiempo.com/rss>. Los siete
canales que usa el tablero salen de ahí y son los más estables del conjunto.

## Seguimientos temáticos

Cinco consultas transversales que cruzan medios: reformas, nombramientos,
investigaciones, Pacto Histórico y Bogotá. Pesan 0.65 porque son un mecanismo de
descubrimiento, no una fuente editorial. Sirven para no perderse una noticia que
solo publicó un medio que no está en la lista.

## Redes y video

**X / Twitter.** La API v2 requiere plan de pago. Configure `X_BEARER_TOKEN` como
secreto del repositorio y ponga `integraciones.x.activo: true`. Sin token, el módulo 7
deriva las tendencias de los titulares recogidos: mide qué términos se aceleran de una
semana a otra. Es menos inmediato que la red social, pero no depende de nadie.

**Google Trends.** No hay API oficial. El recolector lee el RSS público de búsquedas
destacadas de Colombia (`geo=CO`). Si Google lo retira, el módulo lo indica y el resto
del tablero sigue funcionando.

**YouTube.** Cada canal expone un RSS sin necesidad de clave:

```
https://www.youtube.com/feeds/videos.xml?channel_id=UCxxxxxxxxxxxxxxxxxxxxxx
```

Para hallar el `channel_id`: abra el canal, vea el código fuente y busque
`"channelId":"UC…"`. Ponga uno por entrada en `fuentes`, con `activo: true`.

## Cuando una fuente deja de responder

Los medios cambian de plataforma y con ella la dirección de sus feeds. Si una fuente
aparece en rojo varios días seguidos:

1. Abra la salida de la acción **Recolector diario**: dice qué feeds falló y con qué error.
2. Busque el nuevo feed. Suele estar en `/rss`, `/feeds`, `/arcio/rss/` o en una
   etiqueta `<link rel="alternate" type="application/rss+xml">` del código fuente.
3. Añádalo **antes** de los demás en el arreglo `feeds` de esa fuente.
4. Deje siempre la búsqueda por dominio como último recurso.

## Añadir una fuente

```js
{
  id: 'elespectador',                   // único, sin espacios
  nombre: 'El Espectador · Política',
  categoria: 'medio',                   // oficial | medio | tematica | video
  ambito: 'nacional',                   // nacional | congreso | bogota | control | economia | partidos
  weight: 0.85,                         // confianza editorial, 0 a 1
  sitio: 'https://www.elespectador.com/politica',
  feeds: [
    'https://www.elespectador.com/arc/outboundfeeds/rss/category/politica/?outputType=xml',
    gnews('site:elespectador.com política')
  ]
}
```

El `ambito` no es decorativo: los módulos 3 y 5 lo usan para decidir qué despachos
les corresponden. Una fuente de Bogotá mal etiquetada no aparecerá en su módulo.

## Antes de darle uso comercial

Casi todos los medios colombianos autorizan el RSS para uso personal y no comercial,
y varios prohíben explícitamente reutilizar su contenido para entrenar sistemas
automáticos. El tablero está construido para respetarlo: guarda titular, enlace,
fecha y un extracto de 700 caracteres, y siempre enlaza al original.

Si va a usarlo dentro de una organización, escriba a los medios que le importen y
pida autorización. Suelen tener condiciones para uso institucional, y es una
conversación mucho más corta que un requerimiento legal.
