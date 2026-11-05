# Guía para Codex

Este repositorio es el código fuente del WebFlasher estático Spade K. Lee `README.md` antes de editar o publicar.

- La web publicada se genera con `npm run build` en `_site/`. Edita los archivos fuente, no `_site/`.
- Conserva las rutas relativas: GitHub Pages sirve este proyecto bajo `/Spade-K/`.
- El catálogo está en `devices.json`; cada binario pertenece a `firmware/<id-dispositivo>/`. Registra ruta, dirección de escritura y SHA-256 reales. No adivines direcciones ni reutilices firmware de otra revisión.
- ESP32-DIV 2.0 sigue sin binario oficial. Mantenlo sin versión flasheable hasta recibir y validar el archivo del propietario.
- Ejecuta `npm run check` y `npm run build` antes de entregar cambios. No elimines las validaciones de chip, hash, particiones y solapamientos.
- La publicación es manual mediante `.github/workflows/publish-pages.yml`. No actives Pages ni ejecutes ese workflow sin una petición explícita del responsable; el sitio y los binarios serán públicos aunque el repositorio sea privado.
- No subas credenciales ni datos de clientes. El acceso serie debe seguir limitado al puerto local que el usuario autoriza en su navegador.
