# GeoV8 License Manager - Migración a Cryptomus

## Completado
- [x] Modificar `/api/payments/create` para usar Cryptomus API
- [x] Modificar `/api/payments/webhook` para recibir webhooks de Cryptomus
- [x] Modificar `/api/payments/verify` para verificar pagos con Cryptomus
- [x] Modificar `/api/payments/debug` para debugging con Cryptomus
- [x] Modificar `/api/payments/confirm` para manual confirmation
- [x] Modificar `/api/payments/save-payment-id` para usar cryptomus_order_id
- [x] Modificar `/api/payments/subscription` para suscripciones con Cryptomus

## Variables de Entorno Necesarias
```env
CRYPTOMUS_API_KEY=tu_api_key_aqui
CRYPTOMUS_MERCHANT_ID=tu_merchant_uuid_aqui
```

## Notas de Migración
- El formato de order_id ahora usa userId sin guiones (para cumplir con requisitos de Cryptomus)
- La firma se genera con MD5(base64(JSON) + API_KEY)
- Los webhooks de Cryptomus incluyen la firma en el body como `sign`
- Los status de Cryptomus son diferentes: paid, paid_over, fail, cancel, etc.

## Base de Datos
- Campo `nowpayments_order_id` debe renombrarse a `cryptomus_order_id`
- El campo `payment_id` ahora guarda el UUID de Cryptomus
