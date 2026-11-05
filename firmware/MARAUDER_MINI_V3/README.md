# Marauder Mini V3

- Versión: MK SIGNAL v2, compilación `4b59659`.
- Imagen de fábrica: `ESP32Marauder_MK_SIGNAL_v2_for_Mini_V3-4b59659_factory.bin` (ESP32-C5, 8 MB).
- Escritura: `0x0`, con borrado completo previo. Se pierden los ajustes guardados.
- SHA-256: `a137b2bc17b4711c93099cbc6d86f5d123f49e8e23eb080d43e378669838a563`.

La cabecera del cargador en `0x2000` y la aplicación en `0x10000` son imágenes ESP32-C5 válidas según `esptool image-info`. La imagen contiene tabla de particiones en `0x8000`.
