# Contexto de tareas externas (dsh-external-task-context)

Consulta en la barra lateral derecha de DSH Web el prompt de delegación, el contexto de ejecución y el resultado devuelto por las tareas de subagentes externos (Claude Code, Codex, ACP).

## Features and location

- **Botón en la cabecera de la sesión**: cuando la sesión actual tiene tareas externas registradas, aparece el botón «Tareas externas N»; al pulsarlo se abre la página del plugin en la barra lateral derecha (en un panel nuevo si hay espacio).
- **Panel lateral**: la columna izquierda lista las tareas externas (etiqueta o id corto, estado, hora de inicio); la derecha muestra la tarea seleccionada. Se selecciona la más reciente por defecto y se conserva la selección explícita mientras la tarea exista.
- **Detalles**: estado, horas de inicio y fin, nombre de la herramienta, prompt de delegación, directorio de trabajo, proveedor/modelo/esfuerzo de razonamiento/preset, contenido devuelto y resumen de finalización. Los textos de más de 64 KiB se truncan con un aviso localizado.

## Data sources

Todo lo mostrado ya está registrado en el **registro de la sesión padre**; el plugin no añade eventos de sesión ni cambia el comportamiento visible para el modelo:

1. `tool/call`: el JSON de argumentos de la herramienta de delegación; `description` es la etiqueta del catálogo y `prompt` la tarea delegada, con `cwd`, `provider`, `model`, `reasoning_effort` y `agent_preset` opcionales.
2. `subagent/catalog` v2: establece el id estable del hijo externo.
3. Un `user/message` posterior con `source.kind === 'subagent-settled'`: el resumen de finalización y el texto final del hijo, más un diagnóstico opcional.

El host pliega esos eventos en la proyección `externalTaskContexts`; el cliente solo lee esa proyección.

## Known limitations

Los proveedores externos se ejecutan en otro proceso y DSH no persiste sus pasos internos ni sus llamadas a herramientas; un hijo externo no tiene sesión local ni transcripción. Por eso este plugin solo puede mostrar el contexto de delegación y el resultado devuelto, nunca el contexto privado del agente externo, su razonamiento interno ni su cadena completa de herramientas. En `0.2.1-rc.2`, el proveedor de Claude Code usa `persistSession: false`.

Además, la coincidencia por etiqueta solo se aplica cuando es inequívoca; se conservan como máximo las 20 delegaciones sin emparejar más recientes; y los eventos heredados por un fork (`seq < inheritedEventCount`) no se atribuyen a la sesión actual.

## Installation

Requiere DSH `0.2.1-rc.2` o posterior y Node `^22.19 || >=24`.

### Desde npm

```sh
dsh plugin add @lifenrir/dsh-external-task-context
```

### Desde git

```sh
dsh plugin add git+https://github.com/LiFenrir/dsh-external-task-context.git
```

### Desde un directorio local

```sh
git clone https://github.com/LiFenrir/dsh-external-task-context.git
cd dsh-external-task-context
pnpm install
pnpm run build
dsh plugin add /ruta/absoluta/a/dsh-external-task-context
```

La compilación local genera `lib/index.js` (host) y `lib/client.js` (cliente web).

Después, habilita el bundle en ese perfil. Reinicia la aplicación o reabre la sesión para que se carguen la proyección del host y el bundle del cliente.

## Usage

1. Pide al modelo que delegue trabajo mediante una herramienta de subagente externo.
2. Cuando aparezca la delegación, pulsa el botón «Tareas externas» de la cabecera.
3. Elige una tarea a la izquierda para ver su prompt, contexto y resultado.

## Privacy

La proyección se guarda con la caché de proyecciones de la sesión, por lo que el prompt y el resultado se almacenan una segunda vez fuera del registro de la sesión. Trátalos con la misma sensibilidad en entornos compartidos o al exportar una sesión.
