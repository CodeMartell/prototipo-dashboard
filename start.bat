@echo off
setlocal EnableDelayedExpansion
title DataLens - Inicializacao via Docker
echo ==============================================
echo       DataLens - Inicializacao via Docker
echo ==============================================
echo.

:: 1. Checa se o Docker esta rodando
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [SETUP] Docker nao esta respondendo. Tentando iniciar o Docker Desktop automaticamente...
    
    if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
        start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    ) else (
        echo [ERRO] O Docker Desktop nao foi encontrado no caminho padrao do Windows.
        echo Instale-o a partir de https://www.docker.com/ e execute este script novamente.
        pause
        exit /b
    )

    echo [SETUP] Aguardando o motor do Docker inicializar ^(isso pode levar um minutinho^)...
    
    :: Loop para esperar o Docker iniciar de fato
    set "DOCKER_READY=0"
    for /L %%i in (1,1,30) do (
        docker info >nul 2>&1
        if !errorlevel! equ 0 (
            set "DOCKER_READY=1"
            goto DockerPronto
        )
        :: Tenta a cada 4 segundos
        timeout /t 4 >nul
    )

    if !DOCKER_READY! equ 0 (
        echo.
        echo [ERRO] O Docker demorou muito para iniciar ou precisa de atualizacao/aceite de termos.
        echo Abra o Docker Desktop manualmente, espere o icone ficar verde e execute o script novamente.
        pause
        exit /b
    )
)

:DockerPronto
echo [OK] Docker esta rodando perfeitamente!
echo.

:: 2. Cria arquivo .env se nao existir
if not exist ".env" (
    echo [SETUP] Criando arquivo .env a partir do .env.example...
    copy .env.example .env >nul
)

:: 3. Inicia/Executa a aplicacao (Docker Compose)
echo [RUN] Construindo e iniciando a aplicacao no Docker (pode demorar no primeiro uso)...
docker compose up -d --build

echo.
echo ==============================================
echo   SUCESSO! O Docker subiu o sistema em segundo plano.
echo.
echo   - Frontend: http://localhost:5173
echo   - Backend:  http://localhost:9192
echo.
echo   Lembre-se: O banco de dados e a API podem levar de
echo   30 a 60 segundos para terminarem de configurar
echo   tudo nos bastidores antes do primeiro login.
echo ==============================================
pause
