# TODOs - Geov8 License Manager

## En Progreso
- [x] Crear rama `fix/hwid-validation`
- [x] Corregir validación de HWID para que una licencia solo funcione en 1 PC

## Cambios Realizados
- Verificar que el HWID se guarde correctamente antes de dar "válido"
- Doble verificación: leer el HWID guardado para confirmar
- Si falla el guardado, rechazar la activación con error claro
- Agregar logs para debugging
- Mensajes de error más claros para el usuario

## Pendiente
- [ ] Hacer push de la rama al repositorio remoto
- [ ] Crear Pull Request
