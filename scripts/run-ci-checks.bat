@echo off
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.." >nul || exit /b 1

set "MODE=full"
set "COMMIT_FROM="
set "COMMIT_TO="

:parse_args
if "%~1"=="" goto args_done
if /I "%~1"=="--from" (
  set "COMMIT_FROM=%~2"
  shift
  shift
  goto parse_args
)
if /I "%~1"=="--to" (
  set "COMMIT_TO=%~2"
  shift
  shift
  goto parse_args
)
if /I "%~1"=="--commitlint-only" (
  set "MODE=commitlint-only"
  shift
  goto parse_args
)
if /I "%~1"=="--verify-only" (
  set "MODE=verify-only"
  shift
  goto parse_args
)
if /I "%~1"=="-h" goto usage
if /I "%~1"=="--help" goto usage

echo Unknown option: %~1
goto usage_error

:args_done
if /I not "%MODE%"=="verify-only" if not defined COMMIT_FROM if not defined COMMIT_TO call :set_default_commit_range

echo ==> Installing dependencies
call npm ci
if errorlevel 1 goto fail

if /I "%MODE%"=="commitlint-only" (
  call :run_commitlint
  if errorlevel 1 goto fail
  goto done
)

if /I "%MODE%"=="full" (
  call :run_commitlint
  if errorlevel 1 goto fail
)

call :run_verify_suite
if errorlevel 1 goto fail
goto done

:set_default_commit_range
for /f %%i in ('git rev-parse HEAD 2^>nul') do set "COMMIT_TO=%%i"
if not defined COMMIT_TO exit /b 0

for /f %%i in ('git rev-parse HEAD^ 2^>nul') do set "COMMIT_FROM=%%i"
if not defined COMMIT_FROM for /f %%i in ('git rev-list --max-parents=0 HEAD 2^>nul') do set "COMMIT_FROM=%%i"
exit /b 0

:run_commitlint
if not defined COMMIT_FROM goto skip_commitlint
if not defined COMMIT_TO goto skip_commitlint

echo ==> Linting commit messages (%COMMIT_FROM%..%COMMIT_TO%)
call npx commitlint --from "%COMMIT_FROM%" --to "%COMMIT_TO%" --verbose
exit /b %errorlevel%

:skip_commitlint
echo ==> Skipping commitlint: no commit range available
exit /b 0

:run_verify_suite
echo ==> Lint
call npm run lint
if errorlevel 1 exit /b 1

echo ==> Typecheck
call npm run typecheck
if errorlevel 1 exit /b 1

echo ==> Unit tests
call npm run test:unit
if errorlevel 1 exit /b 1

echo ==> Build all targets
call npm run build
if errorlevel 1 exit /b 1

echo ==> Firefox package lint
call npm run lint:firefox
exit /b %errorlevel%

:usage
echo Usage: scripts\run-ci-checks.bat [options]
echo.
echo Options:
echo   --from ^<sha^>         Commitlint range start.
echo   --to ^<sha^>           Commitlint range end.
echo   --commitlint-only    Run only commit message checks.
echo   --verify-only        Run CI verify checks without commitlint.
echo   -h, --help           Show this help message.
popd >nul
exit /b 0

:usage_error
call :usage >nul
popd >nul
exit /b 1

:fail
popd >nul
exit /b 1

:done
popd >nul
exit /b 0
