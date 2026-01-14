@echo off
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
echo Setting ANDROID_HOME to %ANDROID_HOME%
cd android
echo Cleaning...
call gradlew.bat clean
echo Building Release Bundle...
call gradlew.bat bundleRelease --stacktrace
echo.
echo ========================================================
echo BUILD COMPLETE? Check for .aab file below:
if exist "app\build\outputs\bundle\release\app-release.aab" (
    echo SUCCESS: app\build\outputs\bundle\release\app-release.aab
) else (
    echo FAILURE: AAB file not found. Check logs above.
)
echo ========================================================
pause
