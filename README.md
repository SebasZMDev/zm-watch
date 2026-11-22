# ZM Watch

Extensión de VS Code para **mirar**, no para escribir. Cuando un archivo del proyecto cambia desde fuera del editor (por ejemplo, Claude Code editándolo), abre un diff lado a lado: a la izquierda la versión justo anterior, a la derecha la nueva.

## Instalación

1. `npm install && npm run package` genera `zm-watch-0.0.1.vsix`.
2. `code --install-extension zm-watch-0.0.1.vsix`, o en VS Code: "Extensions: Install from VSIX...".

## Uso

- El ícono del ojo en la barra de estado activa o desactiva la extensión (también el comando "ZM Watch: Activar o desactivar").
- Cada diff se abre en una pestaña propia y se mantiene, sin robar el foco. Un archivo que vuelve a cambiar reemplaza su pestaña anterior, y al superar `zmWatch.maxTabs` se cierra la más antigua.

## Ajustes

- `zmWatch.enabled`: activa o desactiva la extensión (por defecto `true`).
- `zmWatch.maxTabs`: máximo de pestañas de diff abiertas (por defecto `8`).
- `zmWatch.ignore`: nombres de carpeta o archivo que se ignoran (por defecto `node_modules`, `.git`, `.next`, `.superpowers`, `dist`, `out`).

## Limitaciones

- El diff aparece cuando el archivo se guarda en disco, no letra por letra.
- No maneja archivos binarios ni mayores a 1 MB.
- Las copias en memoria tienen tope: 2000 archivos y 20 MB.
- Se abren como máximo 5 diffs por segundo.
