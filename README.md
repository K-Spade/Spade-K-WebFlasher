# Spade K WebFlasher

WebFlasher estático para siete modelos Spade K. El navegador descarga el firmware desde este mismo sitio, comprueba su SHA-256 y, tras la autorización del usuario, flashea únicamente el puerto serie local con Web Serial. La interfaz está en español, inglés y chino tradicional. Los modelos 3D son ilustraciones, no réplicas para identificar la revisión de hardware.

## Estado de la entrega

Hay siete binarios entregados e incluidos en `firmware/`, incluido ESP32-DIV 2.0. No se debe sustituir su firmware por el de V2.1. Los siete binarios disponibles son imágenes completas de fábrica, se escriben en `0x0` y borran la memoria flash y los ajustes. El catálogo, las direcciones y los hashes están en `devices.json`; cada carpeta de `firmware/` documenta su versión.

| Dispositivo | Firmware disponible |
| --- | --- |
| RF-CLOWN V2 | MK SIGNAL V2.2 Stable |
| ESP32-DIV V2.1 | MK SIGNAL v1.81 |
| ESP32-DIV 2.0 | MK SIGNAL · DIV V2 (basado en ESP32-DIV 1.7.2 stable) |
| nRFBOX V3 | MK SIGNAL V1.71 Stable |
| Marauder V8 | MK SIGNAL v2, `6bcca6f` |
| Marauder Mini V3 | MK SIGNAL v2, `4b59659` |
| NRF24_JAMMER (ESP32 DEV) | NRF-Jammer V1.0 |

La validación automatizada comprueba la existencia de cada archivo, su SHA-256, la estructura de las imágenes de fábrica y que no haya binarios sin registrar. **Falta una prueba de flasheo con placas físicas**; debe hacerse con cada revisión antes de ofrecer el sitio a usuarios finales.

## Comprobar y previsualizar

Requiere Node.js 22 para las comprobaciones. La web no necesita `npm install` ni un servidor de aplicaciones.

```powershell
npm run check
npm run build
python server.py --no-browser
```

Abre `http://localhost:8765/` en Chrome o Edge. En Windows, `start.bat` inicia la vista local con Python 3. No abras `index.html` con `file://`: Web Serial requiere un contexto seguro (HTTPS o `localhost`). El servidor local solo escucha en loopback. En Codespaces, `.devcontainer/` arranca la vista y reenvía el puerto 8765; mantén el puerto con visibilidad **Private**.

`npm run build` crea `_site/`, el único directorio que se entrega a GitHub Pages: HTML, CSS, JavaScript, dependencias con sus licencias y los binarios publicados. El directorio está ignorado por Git y se regenera desde el código fuente.

## Publicar en GitHub Pages (responsable del cliente)

**La publicación no está activada.** El workflow `Publish GitHub Pages` solo se ejecuta manualmente. [GitHub advierte](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) que una página puede ser pública aunque el repositorio sea privado. En este repositorio personal, la web y los siete binarios quedarían disponibles para cualquier visitante. Si se necesita acceso restringido, conserva la vista privada de Codespaces o utiliza un alojamiento con autenticación; el Pages privado exige una organización con GitHub Enterprise Cloud. Publicar Pages desde un repositorio privado también depende del plan de GitHub de la cuenta.

1. Revisa los siete binarios, sus derechos de distribución y el resultado de `npm run check`. ESP32-DIV 2.0 ya incluye una versión en el catálogo; comprueba la revisión exacta antes de flashear.
2. En el repositorio, abre **Settings → Pages → Build and deployment** y selecciona **GitHub Actions** como *Source*. No elijas “Deploy from a branch”: se publicaría la raíz del repositorio en vez del resultado limpio de `_site/`.
3. Abre **Actions → Publish GitHub Pages → Run workflow**, selecciona `main` y ejecútalo. El workflow repite la validación, genera `_site/` y publica únicamente ese directorio. Si GitHub solicita habilitar Actions o Pages para la cuenta, completa ese paso antes de ejecutar el workflow.
4. Espera a que termine en verde y usa el enlace de despliegue mostrado por GitHub. Para este repositorio, la URL pública habitual será `https://jalarcon666.github.io/Spade-K/`; comprueba la URL exacta en **Settings → Pages**. Prueba la descarga de cada binario y el selector de puerto desde Chrome o Edge en el ordenador donde esté conectada la placa.

Los cambios posteriores en `main` **no se publican solos**. El responsable vuelve a ejecutar `Publish GitHub Pages` cuando quiera sacar una versión nueva. El workflow solo permite publicar `main`.

## Añadir firmware y editar con Codex

1. Copia el `.bin` oficial a `firmware/<id-dispositivo>/` y documenta versión, chip, capacidad flash, dirección y procedencia en el README de esa carpeta.
2. Añade una versión a `releases` en `devices.json`, con `parts[].path`, `parts[].offset` real y `parts[].sha256`. Usa `eraseAll: true` solo cuando corresponda. No deduzcas la dirección por el nombre del archivo; los binarios de aplicación y las imágenes fusionadas pueden usar direcciones distintas.
3. Ejecuta `npm run check` y `npm run build`. Revisa que la versión aparezca en la interfaz y que el archivo esté en `_site/firmware/`.
4. Prueba el flasheo con la placa exacta antes de publicar. Haz commit y push; cuando se apruebe la nueva entrega, ejecuta manualmente el workflow de Pages.

El binario de ESP32-DIV 2.0 está registrado en `firmware/ESP32_DIV_2.0/`. Su versión específica de MK SIGNAL no está indicada; no se debe asumir que sea la misma que la de V2.1. Codex puede seguir las reglas de [AGENTS.md](AGENTS.md) para mantener las comprobaciones y el despliegue manual.

## Dependencias y referencias

`assets/vendor/esptool/bundle.js` incluye `esptool-js` v0.7.0 de Espressif (Apache 2.0; incluye `pako` bajo MIT/Zlib). `assets/vendor/three/` contiene Three.js v0.180.0 (MIT). Las licencias acompañan a los archivos. La estética y la lógica inicial se adaptaron del prototipo entregado por el cliente. Los modelos 3D se guiaron por sus fotos y por las referencias de [ESP32-DIV](https://github.com/cifertech/ESP32-DIV/wiki/Hardware), [nRFBOX](https://github.com/cifertech/nRFBox/wiki/Hardware), [RF-Clown](https://github.com/cifertech/RF-Clown) y [Marauder](https://github.com/justcallmekoko/ESP32Marauder/wiki/Supported-Hardware).

Documentación de [GitHub Pages con workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) y de [Web Serial](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API).
