# Bitácora de Proyectos

Prototipo web estático para seguimiento interno de proyectos del departamento.

## Qué incluye en esta iteración

- Gestión de proyectos: crear, editar, listar, consultar ficha y cambiar estado.
- Registro de avances por proyecto, con alta, edición y borrado.
- Gestión de tareas con estado y prioridad, con edición y borrado.
- Gestión de documentos/enlaces, con edición y borrado.
- Sección **Diario de participantes** dentro de cada proyecto.
- Filtros simples del diario por participante y por tipo de entrada.
- Sección nueva **Cierre del proyecto** dentro de cada ficha.
- Formulario simple de cierre con:
  - fecha de cierre
  - valoración final
  - resultados alcanzados
  - dificultades encontradas
  - propuestas de mejora
  - observaciones finales
- Señal visual para proyectos en estado **cerrado** y aviso cuando falta documentar el cierre.
- Integración básica del cierre en la memoria individual del proyecto.
- Integración básica del cierre en la memoria global conjunta.
- Modo visual con opciones **claro**, **oscuro** y **auto** según el sistema.
- Persistencia local tanto de los datos como de la preferencia de tema.
- Panel inicial con métricas rápidas y últimos avances.
- Filtros de proyectos por estado y responsable, además de búsqueda por texto.
- Generación automática de memoria final por proyecto.
- Exportación de memoria individual y memoria global en formatos `.txt` y `.md`.
- Sección **Memoria global** con borrador conjunto a partir de todos los proyectos.
- Copia al portapapeles del borrador individual y del borrador global.
- Exportación JSON del proyecto seleccionado.
- Copia de seguridad global en JSON e importación posterior para restaurar o mover datos.
- Soporte PWA básico: `manifest.json`, iconos, `service-worker.js` e instalación como app.
- Caché offline razonable para consultar la app sin conexión y seguir trabajando con datos locales ya guardados.
- Adaptación para móviles: barra lateral colapsable con botón de abrir/cerrar, objetivos táctiles de 44px mínimo, diálogos a pantalla completa y diseño limpio en pantallas pequeñas.
- Cambio de tema (claro/oscuro/auto) con un solo botón SVG en la cabecera en vez de desplegable.
- Sección de últimos avances colapsable con chevron.

## Datos iniciales incluidos

La app arranca con 6 proyectos de ejemplo tomados de la planificación departamental del tercer trimestre 2025-2026 del Departamento de Madera, Mueble y Corcho.

Cada proyecto incluye su ficha básica y un avance inicial para poder probar desde el primer momento:

- listado y filtros
- panel inicial
- ficha del proyecto
- memoria final automática
- memoria global conjunta
- diario de participantes
- cierre del proyecto

## Estructura

```text
bitacora-proyectos/
  index.html
  styles.css
  app.js
  manifest.json
  service-worker.js
  icons/
    icon.svg
    icon-192.svg
    icon-512.svg
  README.md
```

## Cómo abrirlo

### Opción rápida
Abrir `index.html` directamente en el navegador.

### Opción recomendada
Servir la carpeta con un servidor estático simple para que el service worker y la instalación PWA funcionen correctamente. Por ejemplo:

```bash
python -m http.server 8080
```

Luego abrir:

```text
http://localhost:8080/bitacora-proyectos/
```

## Cómo probar

1. Abrir la aplicación.
2. Revisar los proyectos precargados.
3. Cambiar el selector de tema entre **auto**, **claro** y **oscuro**.
4. Filtrar proyectos por estado o responsable.
5. Entrar en una ficha y revisar su avance inicial.
6. Añadir avances, tareas, documentos y una o varias entradas en **Diario de participantes**.
7. Abrir el bloque **Cierre del proyecto** y completar parte o todo el formulario.
8. Cambiar un proyecto a estado **cerrado** y comprobar el aviso visual si falta documentar el cierre.
9. Regenerar la memoria final del proyecto y revisar el bloque final de cierre.
10. Cambiar a la vista **Memoria global**.
11. Pulsar **Generar memoria global** y revisar cómo aprovecha los cierres documentados.
12. En la memoria del proyecto, usar **Exportar TXT** o **Exportar MD** si se quiere archivar o llevar el texto a Word.
13. Cambiar a la vista **Memoria global** y usar también **Exportar TXT** o **Exportar MD**.
14. En **Gestión de datos**, usar **Exportar copia de seguridad** para guardar todo en JSON.
15. Usar **Importar copia de seguridad** para restaurar un archivo exportado previamente, confirmando antes la sustitución de datos actuales.
16. Si el navegador lo permite, usar **Instalar app** para añadirla como PWA.
17. Recargar la app y comprobar que se mantienen los datos y la preferencia de tema.

## Cierre del proyecto

La nueva sección **Cierre del proyecto** está dentro de cada ficha y está pensada para la fase final o para proyectos ya terminados.

### Campos disponibles

- fecha de cierre
- valoración final
- resultados alcanzados
- dificultades encontradas
- propuestas de mejora
- observaciones finales

### Cómo funciona

1. Entrar en un proyecto.
2. Ir al bloque **Cierre del proyecto**.
3. Pulsar **Completar cierre**.
4. Rellenar el formulario breve.
5. Guardar.
6. Regenerar la memoria final o la memoria global si se quiere reflejar el cambio al momento.

### Relación con el estado del proyecto

- La app **no bloquea** pasar un proyecto a **cerrado**.
- Cuando un proyecto está en estado **cerrado**, el bloque de cierre se resalta más y muestra un aviso claro si sigue sin documentarse.
- En el listado lateral también aparece una indicación simple sobre el estado del cierre.

## Diario de participantes

La sección **Diario de participantes** sigue dentro de cada proyecto y sirve para registrar aportaciones individuales sin mezclarlo de forma confusa con los avances generales.

Además, ahora incorpora filtros visibles y simples para consultar el diario:

- por participante
- por tipo de entrada
- con botón de limpieza rápida de filtros

Cada entrada incluye:

- fecha
- participante
- tipo de entrada
- qué hizo
- observaciones
- dificultades
- siguiente paso

## Memoria individual y memoria global

Las dos memorias pueden exportarse directamente en:

- `.txt`
- `.md`

El objetivo es tener una salida limpia y fácil de copiar, archivar o reutilizar fuera de la app.

### Memoria individual

La memoria final del proyecto ahora incorpora, además del seguimiento existente, un bloque final de:

- **Cierre del proyecto**
- valoración final
- resultados alcanzados
- dificultades encontradas
- propuestas de mejora
- observaciones finales
- conclusión final enriquecida con el cierre si existe

### Memoria global

La memoria global incorpora mejor uso de los cierres cuando existen:

- recuento de proyectos con cierre documentado
- aviso de proyectos cerrados pendientes de documentar
- dificultades comunes enriquecidas con el cierre
- propuestas de mejora extraídas también del cierre
- bloque específico con cierres aprovechables
- conclusión conjunta más madura

## Limitaciones actuales

- No incluye autenticación ni backend.
- No hay sincronización entre equipos ni usuarios.
- No sube archivos; solo registra enlaces/documentos.
- Los datos se guardan localmente en el navegador del equipo donde se usa.
- La importación JSON sustituye el conjunto actual de datos del navegador tras confirmación; no fusiona proyectos ni resuelve duplicados.
- El modo offline es básico: cachea la app y sus recursos estáticos, pero no implementa sincronización ni estrategias avanzadas.
- El botón de instalación depende de que el navegador cumpla las condiciones de PWA y exponga el evento correspondiente.
- El cierre del proyecto es único por proyecto; no hay histórico de revisiones del cierre.
- No hay validación fuerte para obligar a cerrar documentalmente antes de cambiar el estado.

## Resumen breve de la iteración

### Qué se añadió

- exportación de memoria individual en `.txt` y `.md`
- exportación de memoria global en `.txt` y `.md`
- bloque de **Gestión de datos** para exportar e importar copia de seguridad JSON
- vista previa de importación con resumen de contenido antes de sobrescribir los datos locales
- confirmación previa antes de sobrescribir los datos locales al importar
- filtros visibles del diario por participante y por tipo de entrada
- mantenimiento de la persistencia local y del flujo actual de cierre y memorias

### Cómo se usa

- seleccionar un proyecto y usar **Exportar TXT** o **Exportar MD** en la memoria final
- cambiar a **Memoria global** y usar sus botones de exportación
- en **Gestión de datos**, pulsar **Exportar copia de seguridad** para guardar todo en JSON
- usar **Importar copia de seguridad** para restaurar un archivo JSON exportado previamente
- en el diario del proyecto, elegir participante y/o tipo para consultar solo las entradas deseadas

### Limitaciones actuales

- la importación ofrece modo fusión inteligente y modo sustituir todo; la fusión detecta duplicados y cambios pero no compara históricamente los contenidos de cada entrada individual
- la exportación Markdown se basa en el borrador generado por la app y mantiene un formato simple
- no hay validación avanzada de esquema más allá de comprobar que existan proyectos importables
- la persistencia sigue siendo local al navegador

### Siguientes pasos recomendados

1. Añadir validación opcional más estricta al importar copias de seguridad.
2. Comparar históricamente el contenido de cada entrada individual en la fusión (detectar si una entrada local es más reciente que la importada para un mismo avance).
3. Preparar, más adelante, una sincronización opcional sin romper el modo local actual.


---

## Ultimos cambios - Fase 2 Visual (GerBot Diseno)

### B1. Rediseno visual del dashboard (stat-cards)

Las tres tarjetas del panel inicial tienen ahora identidad visual diferenciada:

- **Proyectos activos**: icono de actividad SVG, fondo azul suave, numero en azul, borde azul
- **Proyectos cerrados**: icono de check en circulo SVG, fondo gris neutro, numero en gris, borde gris  
- **Tareas pendientes**: icono de portapapeles SVG, fondo naranja suave, numero en naranja, borde naranja

Mejoras tecnicas aplicadas:
- Icono SVG representativo por tarjeta (anadido en index.html dentro de .stat-card__icon)
- Numero grande y destacado (2rem, negrita, color de acento)
- Label en tipografia pequena, mayusculas y espaciado de letra
- Barra de color superior de 3px por tarjeta (::before pseudoelemento)
- Hover suave con elevacion y sombra
- Clases aplicadas: .stat-card--active, .stat-card--closed, .stat-card--pending
- Variables CSS separadas por tema claro y oscuro

### B2. Paleta de colores coherente para estados y prioridades

Tokens CSS semanticos en :root con variante para modo oscuro:

#### Estados de proyecto
- Borrador: Gris neutro
- Activo: Verde
- En pausa: Naranja
- Cerrado: Gris oscuro

#### Prioridades de tareas
- Alta: Rojo suave
- Media: Naranja suave
- Baja: Verde suave

Cambios aplicados en styles.css:
- Variables CSS semanticas para estado y prioridad (fondo, texto, borde) en claro y oscuro
- Badges de estado rediseados: .badge.status-activo, .badge.status-en-pausa, etc.
- Badges de prioridad: .badge.priority-alta, .badge.priority-media, .badge.priority-baja
- Items del sidebar con borde izquierdo segun data-status del proyecto
- Compatibilidad total con modo claro y modo oscuro

---

## Últimos cambios

### Tarea A2 · Fusión inteligente al importar JSON

La importación ya no es solo sustitución. Ahora detecta qué proyectos son nuevos y cuáles ya existen localmente:

- **Nuevos** (sin coincidencia por id ni por título) → se importan directamente, decisión por defecto: *importar*.
- **Duplicados por id** (mismo id, puede tener título o contenido diferente) → se muestran en el panel de fusión con tres opciones:
  - *Conservative local*: mantener la versión que ya hay en este navegador.
  - *Usar importado*: sustituir por la versión del archivo.
  - *Fusionar avances*: usar los datos del importado como base y añadir los avances/tareas/documentos/diario que solo existan localmente.
- **Duplicados por título** (mismo título normalizado pero sin id compartido) → mismo comportamiento que duplicados por id.
- El botón **"Sustituir todo"** sigue disponible para quien prefiera el comportamiento anterior (reemplazo completo sin fusión).
- El botón **"Usar todos importados"** marca automáticamente todos los duplicados como *usar importado* y los nuevos como *importar*.
- La comparación por **id** es ahora el mecanismo primario (identificador estable entre exportaciones). El título normalizado se usa como respaldo para archivos de versiones anteriores.

### Tarea A3 · Filtro de diario por fecha

La sección *Diario de participantes* dentro de cada proyecto incorpora dos filtros de fecha en el panel de filtros:

- **Desde** → muestra solo entradas con fecha mayor o igual a la indicada.
- **Hasta** → muestra solo entradas con fecha menor o igual a la indicada.
- Ambos filtros son acumulativos con los de *participante* y *tipo de entrada* ya existentes.
- El botón **"Limpiar filtros"** reinicia también las fechas de Desde y Hasta.
- El filtro se aplica en tiempo real al cambiar cualquier valor, sin necesidad de pulsar ningún botón de confirmación.
