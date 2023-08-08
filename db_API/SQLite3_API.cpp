#include <iostream>
// #include <string>
#include "include/sqlite3.h"
int main()
{
    sqlite3 *db;
    int rc = sqlite3_open("test.db", &db);

    if (rc)
    {
        std::cerr << "Error opening database: " << sqlite3_errmsg(db) << std::endl;
        return 1;
    }

    const char *createTableSQL = "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)";
    rc = sqlite3_exec(db, createTableSQL, 0, 0, 0);

    if (rc)
    {
        std::cerr << "Error creating table: " << sqlite3_errmsg(db) << std::endl;
        return 1;
    }

    const char *insertSQL = "INSERT INTO users (name) VALUES ('John Doe')";
    rc = sqlite3_exec(db, insertSQL, 0, 0, 0);

    if (rc)
    {
        std::cerr << "Error inserting data: " << sqlite3_errmsg(db) << std::endl;
        return 1;
    }

    sqlite3_close(db);
    return 0;
}