#include <iostream>
#include <ctime>
#include <string>
// #include <time.h>
#include "include/sqlite3.h"
int main()
{
    // Get the current time
    std::time_t currentTime = std::time(nullptr);

    // Convert the time to the local time struct
    std::tm *localTime = std::localtime(&currentTime);
    // std::tm *localTime = localtime_s(&currentTime); // safer alt from time.h library

    // Format and display the local time and date
    std::cout << "Current local time: " << localTime->tm_hour << ":" << localTime->tm_min << ":" << localTime->tm_sec << "\n";
    std::cout << "Current local date: " << localTime->tm_year + 1900 << "-" << localTime->tm_mon + 1 << "-" << localTime->tm_mday << "\n";

    sqlite3 *db;
    int rc = sqlite3_open("../db/test.db", &db);

    if (rc)
    {
        std::cerr << "Error opening database: " << sqlite3_errmsg(db) << std::endl;
        return 1;
    }

    const char *createTableSQL = R"(
        CREATE TABLE IF NOT EXISTS users (
            sl_no INTEGER PRIMARY KEY,
            username TEXT,
            commit_time TIME,
            commit_date DATE,
            commit_no INTEGER,
            line_no INTEGER,
            line_string TEXT,
            commit_msg TEXT DEFAULT NULL
        )
    )";

    rc = sqlite3_exec(db, createTableSQL, 0, 0, 0);

    if (rc)
    {
        std::cerr << "Error creating table: " << sqlite3_errmsg(db) << std::endl;
        return 1;
    }

    const char *insertSQL = "INSERT INTO users (username) VALUES ('John Doe')";
    rc = sqlite3_exec(db, insertSQL, 0, 0, 0);

    if (rc)
    {
        std::cerr << "Error inserting data: " << sqlite3_errmsg(db) << std::endl;
        return 1;
    }

    sqlite3_close(db); // close the database connection else will have memory leaks

    return 0;
}