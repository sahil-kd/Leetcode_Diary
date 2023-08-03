import sqlite3 from "sqlite3";
import chalk from "chalk";
import { EventEmitter } from "node:events";
class SQLite3_DB {
    dbHandler;
    constructor(databaseFilePath = "./db/test.db") {
        this.dbHandler = new sqlite3.Database(databaseFilePath, (err) => {
            if (err) {
                console.error(chalk.red("AppError: Error connecting to the database --> ", err.message));
            }
        });
        console.log("cc = ", this.dbHandler);
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
    CREATE_TABLE_IF_NOT_EXIST = class {
        dbHandler;
        tablename;
        constructor(tablename, shape, dbHandler) {
            this.tablename = tablename;
            this.sqlQuery = `CREATE TABLE IF NOT EXISTS ${tablename} (\n`;
            this.dbHandler = dbHandler;
            Object.keys(shape).map((key) => {
                this.sqlQuery += `${key} ${shape[key]},\n`;
            });
            this.sqlQuery = this.removeTrailingCommas(this.sqlQuery);
            this.sqlQuery += "\n)";
            console.log("this.sqlQuery below:\n");
            console.log(this.sqlQuery);
            this.dbHandler?.serialize(() => {
                this.dbHandler.run(this.sqlQuery, (err) => {
                    if (err) {
                        console.error(chalk.red("AppError: Table-creation Error --> " + err.message));
                    }
                });
            });
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
            console.log(sql_query);
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
