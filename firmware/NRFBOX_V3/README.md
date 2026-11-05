# nRFBOX V3

- Versión: MK SIGNAL V1.71 Stable.
- Imagen completa: `MK_SIGNAL_nRFBOX_V3_V1.71_full.bin` (ESP32, flash de 4 MB).
- Escritura: `0x0`, con borrado completo previo. Se pierden idioma y otros ajustes guardados.
- SHA-256: `b9e57e9ea958f1edca9a52c7434fa09052e895c32d8376f6789ca35867a295a3`.

El README del paquete entregado indica escritura en `0x0` y el mismo SHA-256. La cabecera del cargador en `0x1000` y la aplicación en `0x10000` son imágenes ESP32 válidas según `esptool image-info`.
