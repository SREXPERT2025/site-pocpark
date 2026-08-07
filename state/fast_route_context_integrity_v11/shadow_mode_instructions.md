# Boundary shadow mode: инструкция подготовки

Статус: только подготовлено, production не изменён.

1. Получить отдельное одобрение владельца на режим `shadow_only`.
2. Собрать отдельный release из проверенной ветки и сохранить активный релиз `279d919820938e4ea87dcdd7a6138774df55f8c1` как rollback.
3. В release-local env добавить только `AI_WIDGET_FAST_ROUTE_BOUNDARY_MODE=shadow_only`; секреты не менять.
4. До переключения повторить 66 gate-тестов, 46 gateway-тестов и офлайн-аудит 85 строк.
5. После отдельного разрешения переключить только production gateway 8788 по штатному rollback-aware runbook.
6. Проверить health, новый PID/путь и shadow telemetry. В shadow кандидат BND рассчитывается, но посетителю не показывается; текущая ветка продолжает по основному legacy Qwen-пути, потому что Sales Conversation Controller в production gateway пока не активен.

Preview 8787, Qwen prompt, Decision Package, Engineering Decision Laboratory, CRM и MAX не менять.
