import sqlite3 from "sqlite3";
import chalk from "chalk";
import { EventEmitter } from "node:events";
import { createReadStream, createWriteStream } from "node:fs";
import { createInterface } from "node:readline";
class SQLite3_DB {
    static allConnections = [];
    dbHandler = undefined;
    constructor() { }
    static async connect(databaseFilePath) {
        return new Promise((resolve) => {
            const instance = new SQLite3_DB();
            instance.dbHandler = new sqlite3.Database(databaseFilePath, (err) => {
                if (err) {
                    console.error(chalk.red("SQLite3_DB: Error connecting to the database --> ", err.message));
                    resolve(undefined);
                }
                else {
                    SQLite3_DB.allConnections.push(instance.dbHandler);
                    instance.TABLE.instanceOfSQLite3_DB = instance;
                    resolve(instance);
                }
            });
        });
    }
    setupExitHandler() {
        process.on("exit", () => {
            this.closeAllConnections();
        });
        process.on("SIGINT", () => {
            this.closeAllConnections();
            process.exit(1);
        });
        process.on("uncaughtException", (err) => {
            console.error("Uncaught Exception:", err);
            this.closeAllConnections();
            process.exit(1);
        });
    }
    closeAllConnections() {
        for (const db of SQLite3_DB.allConnections) {
            if (db === undefined) {
                console.error(chalk.red("SQLite3_DB: Auto disconnector error --> Database not connected"));
                continue;
            }
            db.serialize(() => {
                db.close((err) => {
                    if (err) {
                        console.error("Error closing database:", err.message);
                    }
                    else {
                        console.log("Database connection closed successfully.");
                    }
                });
            });
        }
    }
    disconnect() {
        this.dbHandler.serialize(() => {
            this.dbHandler.close((err) => {
                if (err) {
                    console.error(chalk.red("SQLite3_DB: db disconnection error --> " + err.message));
                }
            });
        });
    }
    static localTime() {
        return new Date().toLocaleTimeString("en-US", { hour12: false });
    }
    static localDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const date = now.getDate();
        return `${year}-${month.toString().padStart(2, "0")}-${date.toString().padStart(2, "0")}`;
    }
    static eventEmitter = class extends EventEmitter {
        constructor() {
            super();
        }
    };
    TABLE = class TABLE {
        dbHandler;
        tablename;
        static instanceOfSQLite3_DB = null;
        constructor(tablename, shape, dbHandler, typeofTable) {
            this.tablename = tablename;
            this.dbHandler = dbHandler;
            this.sqlQuery = `${typeofTable} ${tablename} (\n`;
            Object.keys(shape).map((key) => {
                this.sqlQuery += `${key} ${shape[key]},\n`;
            });
            this.sqlQuery = this.removeTrailingCommas(this.sqlQuery);
            this.sqlQuery += "\n)";
            this.dbHandler?.serialize(() => {
                this.dbHandler.run(this.sqlQuery, (err) => {
                    if (err) {
                        console.error(chalk.red("SQLite3_DB: Table-creation Error --> " + err.message));
                    }
                });
            });
        }
        static async CREATE_TABLE_IF_NOT_EXISTS(tablename, shape) {
            return new this(tablename, shape, TABLE.instanceOfSQLite3_DB?.dbHandler, "CREATE TABLE IF NOT EXISTS");
        }
        static async CREATE_TEMPORARY_TABLE(tablename, shape) {
            return new this(tablename, shape, TABLE.instanceOfSQLite3_DB?.dbHandler, "CREATE TEMPORARY TABLE");
        }
        insertRow(log) {
            let keys_arr = [];
            Object.freeze(log);
            Object.keys(log).map((key) => keys_arr.push(key));
            let placeholders = new Array(keys_arr.length).fill("?").join(", ");
            let sql_query = `INSERT INTO ${this.tablename} (${keys_arr.join(", ")}) VALUES (${placeholders})`;
            this.dbHandler.serialize(() => {
                this.dbHandler.run(sql_query, Object.keys(log).map((key) => log[key]), (err) => {
                    err && console.error(chalk.red("SQLite3_DB [insertRow()]: row/entry insertion error --> " + err.message));
                });
            });
        }
        selectAll() {
            return new Promise((resolve) => {
                let result;
                this.dbHandler.serialize(() => {
                    this.dbHandler.all(`SELECT * FROM ${this.tablename}`, (err, rows) => {
                        if (err) {
                            console.error(chalk.red("SQLite3_DB [selectAll()]: SELECT * error --> --> " + err.message));
                            resolve(undefined);
                        }
                        else {
                            rows.length == 0
                                ? (result = null)
                                : (result = rows);
                            resolve(result);
                        }
                    });
                });
            });
        }
        select(...columns) {
            return new Promise((resolve) => {
                let result;
                this.dbHandler.serialize(() => {
                    this.dbHandler.all(`SELECT ${columns.join(", ")} FROM ${this.tablename}`, (err, rows) => {
                        if (err) {
                            console.log(chalk.red("SQLite3_DB [select()]: SELECT error --> " + err.message));
                            resolve(undefined);
                        }
                        else {
                            rows.length == 0
                                ? (result = null)
                                : (result = rows);
                            resolve(result);
                        }
                    });
                });
            });
        }
        deleteTable() {
            this.dbHandler.serialize(() => {
                this.dbHandler.run(`DROP TABLE ${this.tablename}`, (err) => {
                    if (err) {
                        console.error(chalk.red("SQLite3_DB: Table deletion error --> " + err.message));
                    }
                });
            });
        }
        fromFileInsertEachRow(inputFile, fn_forEach_row) {
            return new Promise((resolve) => {
                const lineReader = createInterface({
                    input: createReadStream(inputFile, "utf8"),
                    crlfDelay: Infinity,
                });
                lineReader.on("line", fn_forEach_row);
                lineReader.on("close", () => {
                    resolve();
                });
                lineReader.on("error", (err) => {
                    console.error(chalk.red("SQLite3_DB [fromFileInsertEachRow()]: Error reading the inputFile: --> " + err.message));
                    resolve();
                });
            });
        }
        writeFromTableToFile(outputFile, forEach_rowObject, ...selected_columns) {
            return new Promise((resolve) => {
                const fileWriteStream = createWriteStream(outputFile);
                const sql_query = `SELECT ${selected_columns.length === 0 ? "*" : selected_columns.join(", ")} FROM ${this.tablename}`;
                this.dbHandler.serialize(() => {
                    this.dbHandler.each(sql_query, (err, row) => {
                        if (err) {
                            console.error(chalk.red("SQLite3_DB [writeFromTableToFile()]: Error retrieving row --> " + err.message));
                        }
                        else {
                            fileWriteStream.write(forEach_rowObject(row) + "\n", (writeErr) => {
                                if (writeErr) {
                                    console.error(chalk.red("SQLite3_DB [writeFromTableToFile()]: Error writing to file --> " + writeErr.message));
                                }
                            });
                        }
                    }, (completeErr, rowCount) => {
                        if (completeErr) {
                            console.error(chalk.red(`SQLite3_DB [writeFromTableToFile()]: Error completing query at ${rowCount} row count --> ` +
                                completeErr.message));
                        }
                        fileWriteStream.end(() => {
                            resolve();
                        });
                    });
                });
            });
        }
        removeTrailingCommas(inputString) {
            const cleanedString = inputString.replace(/[, \n]+$/, "");
            return cleanedString;
        }
    };
}
export { SQLite3_DB };
