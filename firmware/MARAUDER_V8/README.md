# Marauder V8

- Versión: MK SIGNAL v2, compilación `6bcca6f`.
- Imagen de fábrica: `ESP32Marauder_MK_SIGNAL_v2_for_V8-6bcca6f_factory.bin` (ESP32-C5, 8 MB).
- Escritura: `0x0`, con borrado completo previo. Se pierden los ajustes guardados.
- SHA-256: `3511b74c7a5af6d5d1521af8f33f9c0909f4c7f8889257d7a441dde01b7714eb`.

La cabecera del cargador en `0x2000` y la aplicación en `0x10000` son imágenes ESP32-C5 válidas según `esptool image-info`. La imagen contiene tabla de particiones en `0x8000`.
