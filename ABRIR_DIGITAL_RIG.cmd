@echo off
rem Abre el visor Digital Rig V2 (HTML autocontenido, no requiere servidor).
setlocal
set "HTML=%~dp0public\legacy\Digital_Rig_V2.html"
if not exist "%HTML%" (
  echo No se encuentra %HTML%
  pause
  exit /b 1
)
start "" "%HTML%"
endlocal
