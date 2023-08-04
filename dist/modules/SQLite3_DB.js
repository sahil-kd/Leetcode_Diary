import sqlite3 from "sqlite3";
import chalk from "chalk";
import { EventEmitter } from "node:events";
import { createReadStream } from "node:fs";
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
                    console.error(chalk.red("AppError: Error connecting to the database --> ", err.message));
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
        this.dbHandler?.serialize(() => {
            this.dbHandler.close((err) => {
                if (err) {
                    console.error(chalk.red("AppError: db disconnection error --> " + err.message));
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
                        console.error(chalk.red("AppError: Table-creation Error --> " + err.message));
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
        method(o) {
            console.log(o);
            console.log("objectPropertyValuesToArray below: \n");
            console.log(this.objectPropertyValuesToArray(o));
            let q = "(";
            Object.keys(o).map((key) => {
                q += `${key}, `;
            });
            q = q.slice(0, -2);
            q += ")";
            console.log("q = " + q);
        }
        insertRow(log) {
            let second_part = "VALUES (";
            let sql_query = `INSERT INTO ${this.tablename} (`;
            Object.keys(log).map((key) => {
                sql_query += `${key}, `;
                second_part += "?, ";
            });
            sql_query = sql_query.slice(0, -2);
            second_part = second_part.slice(0, -2);
            sql_query += ")\n";
            second_part += ")";
            sql_query += second_part;
            this.dbHandler?.serialize(() => {
                this.dbHandler.run(sql_query, this.objectPropertyValuesToArray(log), (err) => {
                    err && console.error(chalk.red("AppError: row/entry insertion error --> " + err.message));
                });
            });
        }
        selectAll() {
            return new Promise((resolve) => {
                let result;
                this.dbHandler?.serialize(() => {
                    this.dbHandler.all(`SELECT * FROM ${this.tablename}`, (err, rows) => {
                        if (err) {
                            console.error(chalk.red("AppError: Table output error --> --> " + err.message));
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
                this.dbHandler?.serialize(() => {
                    this.dbHandler.all(`SELECT ${columns.join(", ")} FROM ${this.tablename}`, (err, rows) => {
                        if (err) {
                            console.log(chalk.red("AppError: Table output error --> --> " + err.message));
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
            this.dbHandler?.serialize(() => {
                this.dbHandler.run(`DROP TABLE ${this.tablename}`, (err) => {
                    if (err) {
                        console.error(chalk.red("AppError: Table deletion error --> " + err.message));
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
                    console.error(chalk.red("AppError: Error reading the inputFile: --> " + err.message));
                    resolve();
                });
            });
        }
        removeTrailingCommas(inputString) {
            const cleanedString = inputString.replace(/[, \n]+$/, "");
            return cleanedString;
        }
        objectPropertyValuesToArray(obj) {
            return Object.keys(obj).map((key) => obj[key]);
        }
    };
}
export { SQLite3_DB };
