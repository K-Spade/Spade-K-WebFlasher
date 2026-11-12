# Spade K WebFlasher

WebFlasher estático para nueve modelos Spade K. El navegador descarga el firmware desde este mismo sitio, comprueba su SHA-256 y, tras la autorización del usuario, flashea únicamente el puerto serie local con Web Serial. La interfaz está en español, inglés y chino simplificado. Los modelos 3D son ilustraciones, no réplicas para identificar la revisión de hardware.

## Estado de la entrega

Hay ocho imágenes completas de fábrica para ESP32 (siete modelos ESP32 clásico y TamaFi con ESP32-S3) y dos firmwares BW16. Las ocho de ESP32 se escriben en `0x0` y borran la memoria flash y los ajustes. No sustituyas el firmware de ESP32-DIV 2.0 por el de V2.1. Los BW16 se escriben por Web Serial con el protocolo Ameba: el cargador se carga en RAM y después se graban las imágenes km0 (`0x08000000`), km4 (`0x08004000`) e image2 (`0x08006000`). El catálogo, las direcciones, los nombres de descarga y los hashes están en `devices.json`; cada carpeta de `firmware/` documenta su versión.

| Dispositivo | Firmware disponible |
| --- | --- |
| RF-CLOWN V2 | MK SIGNAL V2.2 Stable |
| ESP32-DIV V2.1 | MK SIGNAL v1.81 |
| ESP32-DIV 2.0 | MK SIGNAL · DIV V2 (basado en ESP32-DIV 1.7.2 stable) |
| nRFBOX V3 | MK SIGNAL V1.71 Stable |
| Marauder V8 | MK SIGNAL v2, `6bcca6f` |
| Marauder Mini V3 | MK SIGNAL v2, `4b59659` |
| NRF24_JAMMER (ESP32 DEV) | NRF-Jammer V1.0 |
| TamaFi (ESP32-S3) | TamaFi V2 GTR Edition · V1.0.0 |
| BW16 (RTL8720DN) | BWifiKill v0.2 y R4TKN Firmware v2.1 (Web Serial, Ameba) |

La validación automatizada comprueba la existencia de cada archivo, su SHA-256, la estructura de las imágenes de fábrica, el cargador Ameba y que no haya binarios sin registrar. **Falta una prueba de flasheo con placas físicas**; debe hacerse con cada revisión antes de ofrecer el sitio a usuarios finales. El flasheo de BW16 usa un cargador y unas imágenes de arranque comunes: pruébalo en un BW16 real antes de publicar.

## Flashear un BW16

1. Conecta el módulo por USB.
2. Mantén pulsado **BOOT/BURN**, pulsa **RST** y suelta **BOOT**.
3. Pulsa **Elegir puerto** en la web y selecciona el puerto del BW16.
4. Elige la versión, confirma y pulsa **Iniciar flasheo**. Si el modo automático no entra, la web pedirá repetir la secuencia.

No desconectes el USB durante la escritura. El cargador Ameba y las imágenes km0/km4 se incluyen en el repositorio; la imagen image2 cambia con cada versión.

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

**La publicación no está activada.** El workflow `Publish GitHub Pages` solo se ejecuta manualmente. [GitHub advierte](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) que una página puede ser pública aunque el repositorio sea privado. En este repositorio personal, la web y los binarios publicados quedarían disponibles para cualquier visitante. Si se necesita acceso restringido, conserva la vista privada de Codespaces o utiliza un alojamiento con autenticación; el Pages privado exige una organización con GitHub Enterprise Cloud. Publicar Pages desde un repositorio privado también depende del plan de GitHub de la cuenta.

1. Revisa los binarios, sus derechos de distribución y el resultado de `npm run check`. ESP32-DIV 2.0 ya incluye una versión en el catálogo; comprueba la revisión exacta antes de flashear.
2. En el repositorio, abre **Settings → Pages → Build and deployment** y selecciona **GitHub Actions** como *Source*. No elijas “Deploy from a branch”: se publicaría la raíz del repositorio en vez del resultado limpio de `_site/`.
3. Abre **Actions → Publish GitHub Pages → Run workflow**, selecciona `main` y ejecútalo. El workflow repite la validación, genera `_site/` y publica únicamente ese directorio. Si GitHub solicita habilitar Actions o Pages para la cuenta, completa ese paso antes de ejecutar el workflow.
4. Espera a que termine en verde y usa el enlace de despliegue mostrado por GitHub. Para este repositorio, la URL pública habitual será `https://jalarcon666.github.io/Spade-K/`; comprueba la URL exacta en **Settings → Pages**. Prueba la descarga de cada binario y el selector de puerto desde Chrome o Edge en el ordenador donde esté conectada la placa.

Los cambios posteriores en `main` **no se publican solos**. El responsable vuelve a ejecutar `Publish GitHub Pages` cuando quiera sacar una versión nueva. El workflow solo permite publicar `main`.

## Añadir firmware y editar con Codex

1. Copia el `.bin` oficial a `firmware/<id-dispositivo>/` y documenta versión, chip, capacidad flash, dirección y procedencia en el README de esa carpeta. Para BW16 usa un subdirectorio con nombre ASCII sin espacios, porque las rutas del catálogo solo admiten letras, números, `_`, `-`, `.` y `/`.
2. Añade una versión a `releases` en `devices.json`, con `parts[].path`, `parts[].offset` real y `parts[].sha256`. Usa `eraseAll: true` solo cuando corresponda. No deduzcas la dirección por el nombre del archivo; los binarios de aplicación y las imágenes fusionadas pueden usar direcciones distintas. En dispositivos `downloadOnly` omite `offset` y `eraseAll`, y usa `parts[].filename` si el archivo original se llama igual que el de otra versión. En BW16 (`flashProtocol: "ameba"`) los `offset` son relativos a `0x08000000`; el cargador se declara una vez en `ameba.flashloader` y se carga en RAM, no en flash.
3. Ejecuta `npm run check` y `npm run build`. Revisa que la versión aparezca en la interfaz y que el archivo esté en `_site/firmware/`.
4. Prueba el flasheo con la placa exacta antes de publicar. Haz commit y push; cuando se apruebe la nueva entrega, ejecuta manualmente el workflow de Pages.

El binario de ESP32-DIV 2.0 está registrado en `firmware/ESP32_DIV_2.0/`. Su versión específica de MK SIGNAL no está indicada; no se debe asumir que sea la misma que la de V2.1. Codex puede seguir las reglas de [AGENTS.md](AGENTS.md) para mantener las comprobaciones y el despliegue manual.

## Dependencias y referencias

`assets/vendor/esptool/bundle.js` incluye `esptool-js` v0.7.0 de Espressif (Apache 2.0; incluye `pako` bajo MIT/Zlib). `assets/vendor/three/` contiene Three.js v0.180.0 (MIT). Las licencias acompañan a los archivos. `assets/ameba.js` implementa el protocolo del cargador AmebaD (RTL8720DN) para Web Serial. El cargador y las imágenes de arranque de `firmware/BW16/_common/` proceden del cargador público de [peipeidev.cn](https://peipeidev.cn/) y del SDK AmebaD de Realtek; confirma los derechos de redistribución antes de publicar Pages. La estética y la lógica inicial se adaptaron del prototipo entregado por el cliente. Los modelos 3D se guiaron por sus fotos y por las referencias de [ESP32-DIV](https://github.com/cifertech/ESP32-DIV/wiki/Hardware), [nRFBOX](https://github.com/cifertech/nRFBox/wiki/Hardware), [RF-Clown](https://github.com/cifertech/RF-Clown) y [Marauder](https://github.com/justcallmekoko/ESP32Marauder/wiki/Supported-Hardware).

Documentación de [GitHub Pages con workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) y de [Web Serial](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API).

## 每台设备添加多个固件版本

设备类型只建一条记录。版本放在该设备的 `releases` 数组中，每个版本一条；页面按照数组顺序展示，第一条默认选中。新版本加在前面，保留旧版本即可供选择。

1. 将每个版本存入 `firmware/<设备ID>/`，使用不同文件名，避免覆盖旧文件。也可以使用版本子文件夹。
2. 在 `devices.json` 中找到对应设备，在 `releases` 中复制一个版本条目，修改 `version`、`parts[].path`、`parts[].sha256`。可选填写 `date` 和 `notes`。
3. 用 PowerShell 计算实际哈希，填入小写十六进制值：

```powershell
(Get-FileHash -LiteralPath 'firmware/ESP32_DIV_V2.1/新版本固件.bin' -Algorithm SHA256).Hash.ToLower()
```

示例（仅展示结构，不是可直接烧录的配置；必须替换真实文件名、哈希和地址）：

```json
"releases": [
  {
    "version": "MK SIGNAL 新版本",
    "notes": "更新说明",
    "parts": [{"path": "firmware/ESP32_DIV_V2.1/新版本.bin", "offset": "<实际地址>", "sha256": "<64位真实SHA-256>"}]
  },
  {
    "version": "MK SIGNAL v1.81 · DIV V2.1",
    "parts": [{"path": "firmware/ESP32_DIV_V2.1/旧版本.bin", "offset": "<实际地址>", "sha256": "<旧文件真实SHA-256>"}]
  }
]
```

`parts` 表示同一次烧录需要的多个文件，不同固件版本必须各放一条 `releases`，不能混进同一个 `parts`。ESP32 完整工厂镜像只有确认地址为 `0x0` 且需要清空 Flash 时才设置 `eraseAll: true`；应用镜像与分片镜像按原作者说明填写。

BW16 现在通过 `flashProtocol: "ameba"` 网页烧录：`ameba.flashloader` 是写入 RAM `0x82000` 的 Ameba 加载器，`parts` 按 `offset` 相对 `0x08000000` 写入 km0（`0x0`）、km4（`0x4000`）和 image2（`0x6000`），每个文件的 SHA-256 都会在写入前校验。三个引导文件位于 `firmware/BW16/_common/`，两个版本共用；新增 BW16 固件时，把 image2 放进 `firmware/BW16/` 下新的 ASCII 子目录（不能有空格），沿用共用引导文件并登记 `releases`，再运行 `npm run check`、`npm run build`。

## BW16 烧录模式

1. 用 USB 连接 BW16 模块。
2. 按住 **BOOT/BURN** 键不放。
3. 按一下 **RST/复位** 键。
4. 松开 **BOOT** 键，模块进入烧录模式。

然后在网页中选择端口、固件版本并开始烧录。若自动进入失败，页面会提示重新执行上述步骤；烧录过程中不要断开 USB。

完成后运行 `npm run check`、`npm run build`。本地刷新查看版本下拉框；线上需要提交、推送并重新发布。
