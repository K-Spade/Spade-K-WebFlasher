# BW16

- Chip: Realtek RTL8720DN (AmebaD).
- Estado: flasheo por Web Serial con el protocolo Ameba (`flashProtocol: "ameba"`).
- El controlador ESP32 (esptool) no se utiliza para este dispositivo.

## Modo de grabación

1. Conecta el módulo por USB.
2. Mantén pulsado **BOOT/BURN**.
3. Pulsa **RST** y suelta **BOOT**.
4. Elige el puerto en la web y pulsa **Iniciar flasheo**.

La web intenta entrar en modo de descarga con las secuencias DTR/RTS A y B. Si no lo consigue, pide repetir la secuencia manual.

## Imágenes comunes (`_common/`)

| Archivo | Destino | Tamaño | SHA-256 |
| --- | --- | --- | --- |
| `imgtool_flashloader_amebad.bin` | RAM `0x82000` | 4688 bytes | `9307121385cb390dfd2da64da2c6c515f17b5a9556b3d04021487c9b9f220b55` |
| `km0_boot_all.bin` | Flash `0x08000000` | 4500 bytes | `453c880307fc389009aa8a39c63da3d715b207ad797206c896cc691426daaa64` |
| `km4_boot_all.bin` | Flash `0x08004000` | 4456 bytes | `05fbf808d43113eaf7c11b75091c986b817135f0c52eb9fa94bb9fe9f34b062c` |

## Versiones

| Versión | Archivo | Destino | Tamaño | SHA-256 |
| --- | --- | --- | --- | --- |
| BWifiKill v0.2 | `BWifiKill-BW16/km0_km4_image2.bin` | `0x08006000` | 897024 bytes | `767752321d19fe307e023975310171adbd81ac6ec8c48f434f450f925ec2bb64` |
| R4TKN Firmware v2.1 | `R4TKN-FLASHER/km0_km4_image2.bin` | `0x08006000` | 761856 bytes | `f83013a29b4b175b8ac84e80b41a9fc21e8028b2f0787504f52a102e078e4f7e` |

- Los `offset` de `devices.json` son relativos a `0x08000000` (`0x0`, `0x4000`, `0x6000`).
- El cargador se escribe en RAM y no forma parte de `parts`; se declara en `ameba.flashloader`.
- El flasheo borra únicamente las regiones de las imágenes escritas. No se usa `eraseAll`.
- El cargador y las imágenes km0/km4 proceden del cargador público de [peipeidev.cn](https://peipeidev.cn/) y del SDK AmebaD de Realtek. Confirma los derechos de redistribución antes de publicar Pages.
- **Falta probar el flasheo en un BW16 físico** antes de ofrecerlo a usuarios finales.
