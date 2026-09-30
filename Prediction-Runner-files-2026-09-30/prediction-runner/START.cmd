@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\next\dist\bin\next" (
  echo Dependencies are missing. See README.md for installation.
  pause
  exit /b 1
)
set "RUNNER_NODE=C:\Users\19ani\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "RUNNER_MODE=dev"
if exist ".next\BUILD_ID" set "RUNNER_MODE=start"
if exist "%RUNNER_NODE%" (
  "%RUNNER_NODE%" "node_modules\next\dist\bin\next" %RUNNER_MODE% --hostname 127.0.0.1 --port 3000
) else (
  node "node_modules\next\dist\bin\next" %RUNNER_MODE% --hostname 127.0.0.1 --port 3000
)
