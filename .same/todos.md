# Geov8 License Manager - TODOs

## Completado - Sistema de Alertas

### Fase 1: Arreglar /api/notify
- [x] Detectar tipo de error (IP vs GPS) del mensaje
- [x] Aplicar filtros de licencia (alert_ip, alert_gps) por tipo de error
- [x] Separar flujo agente vs admin
- [x] Manejar valores NULL con defaults

### Fase 2: Filtros del Admin
- [x] Agregar campos admin_alert_* a profiles (types.ts)
- [x] Crear UI en profile para configurar filtros
- [x] Aplicar filtros del admin en /api/notify
- [x] Actualizar profile.ts para guardar filtros

### Fase 3: Página Alerts
- [x] Agregar botón Settings para editar filtros desde la lista
- [x] Mostrar badges con valores por defecto correctos

### Fase 4: App Python
- [x] Agregar UI de filtros en Settings (checkboxes)
- [x] Guardar filtros en save_config
- [x] Cargar filtros en load_config
- [x] Enviar filtros a /api/notify
- [x] Detectar y enviar error_type (ip/gps) al endpoint

### Fase 5: Database
- [x] Crear supabase_migration.sql para agregar columnas

## Pendiente - Usuario debe ejecutar
- [ ] Ejecutar supabase_migration.sql en Supabase SQL Editor
- [ ] Agregar TELEGRAM_BOT_TOKEN a .env.local si no existe

## Notas
- El flujo del agente es independiente del Manager (toggle propio)
- El admin tiene sus propios filtros globales en su perfil
- Cada licencia tiene filtros individuales
- Los valores NULL se manejan con defaults correctos
