@echo off
REM this command is for compiling the .cpp file, it won't detect SQL errors, for that use 'run' command
REM shortcut to launching cmd is Ctrl + Alt + / cmd is much faster than powershell and git bash for compiling .cpp files & running .exe
REM run this command from db_API folder using cmd.exe for best performance in windows
REM to run the executable cd build, then type SQLite3_API & press ENTER
REM must include sqlite3.dll (from pre-compiled binaries for windows x64) in the build folder to run (official sqlite3 website)
REM the sqlite3.h is from amalgamation zip (official sqlite3 website)
g++ SQLite3_API.cpp -o build/SQLite3_API.exe build/sqlite3.dll