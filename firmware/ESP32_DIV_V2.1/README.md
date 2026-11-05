# ESP32-DIV V2.1

- Versión: MK SIGNAL v1.78, basada en ESP32-DIV 1.7.2 stable.
- Imagen completa: `ESP32-DIV-1.7.2-stable-by_MK_SIGNAL_v1.78-DIV-V2.1-full.bin` (ESP32-S3, cabecera de flash de 16 MB).
- Escritura: `0x0`, con borrado completo previo. Se pierden los ajustes guardados.
- SHA-256: `c8be36f4a666946b8e8d7a331111578c413053fb2991d8720df85d19a23f42b0`.

La cabecera del cargador en `0x0` y la aplicación en `0x10000` son imágenes ESP32-S3 válidas según `esptool image-info`. La imagen contiene tabla de particiones en `0x8000`.
