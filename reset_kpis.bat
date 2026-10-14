@echo off
REM reset_kpis.bat - Zera os dados de KPI e historico do robo preservando usuarios
chcp 65001 >nul 2>&1
echo =================================================================
echo   RESET DE DADOS DE KPI (USUARIOS PRESERVADOS)
echo =================================================================

where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    python "%~dp0scripts\reset_kpis.py"
    goto end
)

echo Python nao encontrado no PATH. Executando direto no PostgreSQL do Docker...
docker compose exec db psql -U dashboard -d dashboard -c "TRUNCATE TABLE action_plans, evidences, kpi_change_logs, email_ingest_queue, processed_emails, kpi_logistic_cost, kpi_air_freight, kpi_incidental_cost, kpi_total_cost, kpi_demurrage, kpi_logistics_vs_prod, kpi_records, logistics_vs_prod_records RESTART IDENTITY CASCADE;"
docker compose run --rm rpa-bot rm -f /app/rpa_email/resources/history/email_history.db

echo.
echo [SUCESSO] Tabelas de KPI e historico do robo zerados com sucesso no Docker!
echo Os usuarios (tabela users) continuam 100%% intactos.

:end
