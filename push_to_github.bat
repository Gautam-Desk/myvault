@echo off
title Push My Vault to GitHub
color 0B

echo =====================================================================
echo                     PUSH MY VAULT TO GITHUB
echo =====================================================================
echo.

git remote -v | findstr origin >nul
if %errorlevel% neq 0 (
    echo Enter your GitHub repository URL:
    echo (Example: https://github.com/your-username/my-vault.git)
    echo.
    set /p REPO_URL="Repository URL: "
    if "%REPO_URL%"=="" (
        echo.
        echo [!] No URL provided. Push aborted.
        pause
        exit /b 1
    )
    git remote add origin %REPO_URL%
)

echo.
echo [*] Pushing branch 'main' to GitHub origin...
git branch -M main
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo =====================================================================
    echo [OK] Successfully uploaded to GitHub!
    echo.
    echo Next step: To publish on Vercel:
    echo 1. Go to https://vercel.com/new
    echo 2. Select your 'my-vault' repository
    echo 3. Click 'Deploy' (Vercel will auto-detect vercel.json)
    echo =====================================================================
) else (
    echo.
    echo [!] Push encountered an error. Please verify your credentials or repo URL.
)

pause
