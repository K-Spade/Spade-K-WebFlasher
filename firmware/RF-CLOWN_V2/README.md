# RF-CLOWN V2

- Versión: MK SIGNAL V2.2 Stable.
- Imagen completa: `MK_SIGNAL_RF_CLOWN_V2.2_COMPLETE.bin` (ESP32, flash de 4 MB).
- Escritura: `0x0`, con borrado completo previo. Se pierden los ajustes guardados.
- SHA-256: `c3e7a839e2fa7fa35e1826408dd49f0d43fa1a144f404a93b21fc831b21015ca`.

La dirección y el borrado se han contrastado con el README y el SHA256SUMS del paquete entregado. La cabecera del cargador en `0x1000` y la aplicación en `0x10000` son imágenes ESP32 válidas según `esptool image-info`.
