# ESP32-DIV V2

- Versión: MK SIGNAL , basada en ESP32-DIV 1.7.2 stable.
- Imagen completa: `ESP32-DIV-1.7.2-stable-by_MK_SIGNAL-DIV-V2-full.bin` (ESP32-S3, cabecera de flash de 16 MB).
- Escritura: `0x0`, con borrado completo previo. Se pierden los ajustes guardados.
- SHA-256: `1a30ef2acc6dbf9a2ea4e98dac821e0343b5939406ae6ca3470146f17574d36d`.

La cabecera del cargador en `0x0` y la aplicación en `0x10000` son imágenes ESP32-S3 válidas según `esptool image-info`. La imagen contiene tabla de particiones en `0x8000`.