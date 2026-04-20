@echo off
echo Compiling SQLite...
gcc -c sqlite3.c -o sqlite3.o
echo Building Hotel Management Server...
g++ server.cpp database.cpp sqlite3.o -o hotel_server -lws2_32 -pthread -std=c++17
if %errorlevel% neq 0 (
    echo Build failed.
) else (
    echo Build successful! Application ready.
)
