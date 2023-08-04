import sqlite3 from "sqlite3";
import chalk from "chalk";
import { EventEmitter } from "node:events";
import { PathLike, createReadStream, createWriteStream } from "node:fs";
import { createInterface } from "node:readline";

type ConvertSQLTypes<T> = {
	[K in keyof T]: T[K] extends "TEXT"
		? string | null
		: T[K] extends "INTEGER"
		? number | null
		: T[K] extends "INTEGER"
		? number | null
		: T[K] extends "TIME"
		? string | null
		: T[K] extends "DATE"
		? string | null
		: T[K] extends "TEXT NOT NULL"
		? string
		: T[K] extends "INTEGER NOT NULL"
		? number
		: T[K] extends "TIME NOT NULL"
		? string
		: T[K] extends "DATE NOT NULL"
		? string
		: T[K] extends "TEXT DEFAULT NULL"
		? string | null
		: T[K] extends "INTEGER DEFAULT NULL"
		? number | null
		: T[K] extends "TIME DEFAULT NULL"
		? string | null
		: T[K] extends "DATE DEFAULT NULL"
		? string | null
		: "Invalid SQLite type";
}; // basically interating over the property types of interface T (this is a type function)

type OmitPropertyByType<T, U> = {
	[K in keyof T as T[K] extends U ? never : K]: T[K];
};

class SQLite3_DB {
	private static allConnections: sqlite3.Database[] = []; // Private class attribute to store all active database connections

	dbHandler: sqlite3.Database | undefined = undefined;

	constructor() {} // connection working

	static async connect(databaseFilePath: string) {
		return new Promise<SQLite3_DB | undefined>((resolve) => {
			const instance = new SQLite3_DB();
			instance.dbHandler = new sqlite3.Database(databaseFilePath, (err) => {
				if (err) {
					console.error(chalk.red("AppError: Error connecting to the database --> ", err.message));
					resolve(undefined);
				} else {
					SQLite3_DB.allConnections.push(instance.dbHandler as sqlite3.Database); // tracking all instances of SQLite3_DB
					// instance of class SQLite3_DB stored inside class TABLE | 'this' here is an instance of SQLite3_DB
					// but since this method is static we are creating an instance of SQLite3_DB cause we can't directly reference using 'this' keyword
					instance.TABLE.instanceOfSQLite3_DB = instance;
					resolve(instance);
				}
			});
		});
	}

	/* Exit handler function below --> automatic database disconnectors --> I don't think they are working right now */

	setupExitHandler() {
		// listener for normal exit event
		process.on("exit", () => {
			this.closeAllConnections();
		});

		// Attach a listener for the 'SIGINT' event (Ctrl+C) also emitted when X button pressed or user puts pc to sleep
		process.on("SIGINT", () => {
			this.closeAllConnections();
			process.exit(1);
		});

		// a listener for the 'uncaughtException' event
		process.on("uncaughtException", (err) => {
			console.error("Uncaught Exception:", err);
			this.closeAllConnections();
			process.exit(1); // Exit with an error code after cleanup
		});
	}

	closeAllConnections() {
		for (const db of SQLite3_DB.allConnections) {
			db.serialize(() => {
				db.close((err) => {
					if (err) {
						console.error("Error closing database:", err.message);
					} else {
						console.log("Database connection closed successfully.");
					}
				});
			});
		}
	}

	/* Core functions below */

	/*
    	connect() {
            return new Promise<sqlite3.Database | undefined>((resolve) => {
                this.dbHandler = new sqlite3.Database(this.databaseFilePath, (err) => {
                    if (err) {
                        console.error(chalk.red("AppError: Error connecting to the database --> ", err.message));
                        resolve(undefined);
                    } else {
                        SQLite3_DB.allConnections.push(this.dbHandler as sqlite3.Database);
                        resolve(this.dbHandler);
                    }
                });
            });
	    }
    */

	disconnect() {
		(this.dbHandler as sqlite3.Database | undefined)?.serialize(() => {
			(this.dbHandler as sqlite3.Database).close((err) => {
				if (err) {
					console.error(chalk.red("AppError: db disconnection error --> " + err.message));
				}
			}); // Close connection to the database
		});
	} // disconnection working

	/* Local time and date functions below */

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

	/* Database event emitters below */

	static eventEmitter = class extends EventEmitter {
		constructor() {
			super();
		}
	};

	/* Table creation and operations class below */

	/*

	Explaining the class architechture based on SQLite3 and NodeJs architechture:

		- SQLite3 can handle only one request per connection hence static class CREATE_TABLE_IF_NOT_EXIST so each instance of a
			connection can only access one table at a time, other tasks wait in a queue to be executed later
		- But NodeJs is non-blocking and can handle multiple connections in parallel using threads (true parallism, & async is
			fake parallelism and only event loop) hence we can create multiple instances of the parent class
	
	*/

	/*
		- Objects are by javascript defintion set of unordered properties hence I cannot enforce order of properties through
			typescript as the complexity is beyond the capabilities of the type system
		- Objects are elegant to look at and more intuitive than maps, and they give the sweet autocomplete which reduces the
			chances of errors, infact don't manually insert properties into functions like insertRow(), simply make:
			
			const connection1 = new A();

			const table1 = new connection1.CREATE_TABLE_IF_NOT_EXIST(
				"hello_world",
				{
					sl_no: "INTEGER PRIMARY KEY AUTOINCREMENT",
					name: "TEXT NOT NULL",
					age: "INTEGER NOT NULL",
					dob: "DATE DEFAULT NULL",
				},
				connection1.dbHandler
			);

			table1.insertRow({});
			                 ^^ Error here --> move cursor here Ctrl + . then click 'Add missing properties'
				    and it will autocomplete for you like this in the correct order
					|
					|
					V

			table1.insertRow({
				name: "",
				age: 0,
				dob: null,
			});

			.
			.
			.

			connection1.disconnect();
	*/

	TABLE = class TABLE<
		TableShape extends {
			[key: string]:
				| "TEXT"
				| "INTEGER"
				| "TIME"
				| "DATE"
				| "TEXT NOT NULL"
				| "INTEGER NOT NULL"
				| "TIME NOT NULL"
				| "DATE NOT NULL"
				| "TEXT DEFAULT NULL"
				| "INTEGER DEFAULT NULL"
				| "TIME DEFAULT NULL"
				| "DATE DEFAULT NULL"
				| "INTEGER PRIMARY KEY AUTOINCREMENT";
		}
	> {
		[x: string]:
			| string
			| sqlite3.Database
			| undefined
			| TableShape
			| ((...args: any[]) => any | any[])
			| { [x: string]: string | number | boolean | null };

		dbHandler: sqlite3.Database | undefined;
		tablename: string;

		/*
			The static property below stores an instance of SQLite3_DB, each instance of SQLite3_DB can make many instances of
			class TABLE and TABLE needs the single instance of SQLite3_DB to get access to the one dbHandler of one instance
			as each instance of SQLite3_DB is given one dbHandler variable
		*/

		static instanceOfSQLite3_DB: SQLite3_DB | null = null; // Static property to store the instance of class SQLite3_DB

		constructor(
			tablename: string,
			shape: TableShape,
			dbHandler: sqlite3.Database | undefined,
			typeofTable: "CREATE TABLE IF NOT EXISTS" | "CREATE TEMPORARY TABLE"
		) {
			this.tablename = tablename;
			this.dbHandler = dbHandler;
			this.sqlQuery = `${typeofTable} ${tablename} (\n`;

			Object.keys(shape).map((key) => {
				this.sqlQuery += `${key} ${shape[key]},\n`;
			});

			this.sqlQuery = this.removeTrailingCommas(this.sqlQuery);
			this.sqlQuery += "\n)";

			(this.dbHandler as sqlite3.Database | undefined)?.serialize(() => {
				(this.dbHandler as sqlite3.Database).run(this.sqlQuery as string, (err) => {
					if (err) {
						console.error(chalk.red("AppError: Table-creation Error --> " + err.message));
					}
				}); // Creation of a table (mini-database)
			});
		}

		/* Table build functions below -->
            To build do const connection = new
        */

		public static async CREATE_TABLE_IF_NOT_EXISTS<
			T extends {
				[key: string]:
					| "TEXT"
					| "INTEGER"
					| "TIME"
					| "DATE"
					| "TEXT NOT NULL"
					| "INTEGER NOT NULL"
					| "TIME NOT NULL"
					| "DATE NOT NULL"
					| "TEXT DEFAULT NULL"
					| "INTEGER DEFAULT NULL"
					| "TIME DEFAULT NULL"
					| "DATE DEFAULT NULL"
					| "INTEGER PRIMARY KEY AUTOINCREMENT";
			}
		>(tablename: string, shape: T) {
			return new this(tablename, shape, TABLE.instanceOfSQLite3_DB?.dbHandler, "CREATE TABLE IF NOT EXISTS");
		} // cannot return promise explicitly else I lose 'this' reference to the instance of class TABLE | trapped in its own complexity

		public static async CREATE_TEMPORARY_TABLE<
			T extends {
				[key: string]:
					| "TEXT"
					| "INTEGER"
					| "TIME"
					| "DATE"
					| "TEXT NOT NULL"
					| "INTEGER NOT NULL"
					| "TIME NOT NULL"
					| "DATE NOT NULL"
					| "TEXT DEFAULT NULL"
					| "INTEGER DEFAULT NULL"
					| "TIME DEFAULT NULL"
					| "DATE DEFAULT NULL"
					| "INTEGER PRIMARY KEY AUTOINCREMENT";
			}
		>(tablename: string, shape: T) {
			return new this(tablename, shape, TABLE.instanceOfSQLite3_DB?.dbHandler, "CREATE TEMPORARY TABLE");
		}

		/* ------------------------------------------------------------------------------------------- */

		method(o: ConvertSQLTypes<TableShape>) {
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
		} // Dummy method for type testing

		/*

		Property INTEGER PRIMARY KEY AUTOINCREMENT is omitted in "insertRow" to disable manual manipulation of primary key
		as it's increment will be automatically handled by the database
		all other properties are enabled to give quick autocomplete through 'Add missing properties' else in Partial<>
		types app devs have to manually enter each property they want & properties can be out of order resulting in database
		error --> simply set other properties to nullable properties
		--> but for non-NULL properties, numbers and str you'll have to put 0 and "" as they are compulsory during insert
		operation else they fail
		|
		|
		V

		*/

		insertRow(log: ConvertSQLTypes<OmitPropertyByType<TableShape, "INTEGER PRIMARY KEY AUTOINCREMENT">>) {
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

			(this.dbHandler as sqlite3.Database | undefined)?.serialize(() => {
				(this.dbHandler as sqlite3.Database).run(
					sql_query,
					this.objectPropertyValuesToArray(log as ConvertSQLTypes<TableShape>),
					(err) => {
						err && console.error(chalk.red("AppError: row/entry insertion error --> " + err.message));
					}
				);
			});
		}

		selectAll() {
			return new Promise<ConvertSQLTypes<TableShape>[] | null | undefined>((resolve) => {
				let result;
				(this.dbHandler as sqlite3.Database | undefined)?.serialize(() => {
					(this.dbHandler as sqlite3.Database).all(
						`SELECT * FROM ${this.tablename}`,
						(err, rows: ConvertSQLTypes<TableShape>[]) => {
							if (err) {
								console.error(chalk.red("AppError: Table output error --> --> " + err.message));
								resolve(undefined); // including this resolve is necessary else terminates the whole program
							} else {
								rows.length == 0
									? (result = null) // No records found
									: (result = rows); // Records found
								// use db.each() and encompass it inside db.serialize() else memory overflow or use buffer returns
								resolve(result);
							}
						}
					);
				});
			});
		} // db.all() is asynchronous so promise added --> DON'T use this function for very large tables else memory overflow

		// sub-methods inside functions to allow optional method chaning for complex queries: select.where()

		/* Duplicate entries inside select will be removed at runtime by sqlite3 module to allow only single column names selection */

		select(...columns: Array<keyof OmitPropertyByType<TableShape, "INTEGER PRIMARY KEY AUTOINCREMENT">>) {
			return new Promise<ConvertSQLTypes<TableShape>[] | null | undefined>((resolve) => {
				let result;
				(this.dbHandler as sqlite3.Database | undefined)?.serialize(() => {
					(this.dbHandler as sqlite3.Database).all(
						`SELECT ${columns.join(", ")} FROM ${this.tablename}`,
						(err, rows: ConvertSQLTypes<TableShape>[]) => {
							if (err) {
								console.log(chalk.red("AppError: Table output error --> --> " + err.message));
								resolve(undefined); // it actually returns undefined on runtime failure irrespective of types
							} else {
								rows.length == 0
									? (result = null) // No records found
									: (result = rows); // Records found
								// use db.each() and encompass it inside db.serialize() else memory overflow or use buffer returns
								resolve(result);
							}
						}
					);
				});
			});
		} // db.all() is asynchronous so promise added --> DON'T use this function for very large tables else memory overflow

		deleteTable() {
			(this.dbHandler as sqlite3.Database | undefined)?.serialize(() => {
				(this.dbHandler as sqlite3.Database).run(`DROP TABLE ${this.tablename}`, (err) => {
					if (err) {
						console.error(chalk.red("AppError: Table deletion error --> " + err.message));
					}
				}); // delete the table named users
			});
		}

		/* Database to file and file to database operations */

		/* 
        let line_no = 0;
        fn_forEach_row = (line_string) => {
                line_no += 1;
                this.insertRow({...})
            }
        */

		fromFileInsertEachRow(inputFile: PathLike, fn_forEach_row: (line_string_from_file: string) => void) {
			return new Promise<void>((resolve) => {
				const lineReader = createInterface({
					input: createReadStream(inputFile, "utf8"),
					crlfDelay: Infinity, // To handle both Unix and Windows line endings
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

		/* Utils below */

		private removeTrailingCommas(inputString: string) {
			const cleanedString = inputString.replace(/[, \n]+$/, "");
			return cleanedString;
		}

		private objectPropertyValuesToArray(obj: ConvertSQLTypes<TableShape>): Array<string | number | null> {
			return Object.keys(obj).map((key) => obj[key]);
		}
	};

	/* CREATE TEMPORARY TABLE temp_file(
	line_no INTEGER,
	line_string TEXT
	) */
}

/* Exported members below */
export { SQLite3_DB }; // SQLite3_DB is not exported as default to enforce the name SQLite3_DB, as this name provides better clarity about the functionality

/*

	static fromFileInsertEachRow(
		dbHandle: sqlite3.Database,
		inputFile: PathLike,
		username: string,
		commit_time: string,
		commit_date: string,
		commit_no: number,
		commit_msg: string
	) {
		return new Promise<void>((resolve) => {
			const lineReader = createInterface({
				input: createReadStream(inputFile, "utf8"),
				crlfDelay: Infinity, // To handle both Unix and Windows line endings
			});

			let line_no = 0;

			lineReader.on("line", (line_string) => {
				// Insert each line into the table
				dbHandle.serialize(() => {
					line_no += 1;
					dbHandle.run(
						`INSERT INTO commit_log (username, commit_time, commit_date, commit_no, line_no, line_string, commit_msg)
					VALUES (?, TIME(?), DATE(?), ?, ?, ?, ?)`,
						[username, commit_time, commit_date, commit_no, line_no, line_string, commit_msg],
						(err) => {
							err && console.error(chalk.red("AppError: row/entry insertion error --> " + err.message));
						}
					);
				}); // db.serialize() make the database process go step by step / synchronously
			});

			lineReader.on("close", () => {
				resolve();
			});

			lineReader.on("error", (err) => {
				console.error(chalk.red("AppError: Error reading the inputFile: --> " + err.message));
				resolve();
			});
		});
	}

	static writeFromTableToFile(dbHandle: sqlite3.Database, outFile: PathLike, sqlQuery: string) {
		return new Promise<void>((resolve) => {
			const fileWriteStream = createWriteStream(outFile);

			dbHandle.serialize(() => {
				dbHandle.each(
					sqlQuery,
					(err, row: { line_string: string }) => {
						if (err) {
							console.error(chalk.red("SQLite3_DB.writeFromTableToFile: Error retrieving row --> " + err.message));
						} else {
							fileWriteStream.write(row.line_string + "\n", (writeErr) => {
								if (writeErr) {
									console.error(
										chalk.red("SQLite3_DB.writeFromTableToFile: Error writing to file --> " + writeErr.message)
									);
								}
							});
						}
					},
					(completeErr, rowCount) => {
						if (completeErr) {
							console.error(
								chalk.red(
									`SQLite3_DB.writeFromTableToFile: Error completing query at ${rowCount} row count --> ` +
										completeErr.message
								)
							);
						}

						fileWriteStream.end(() => {
							resolve();
						});
					}
				);
			});
		});
	} // db.serialize() does not impact the order of execution of read and write streams of fileWriteStream cause they run parallel in event loop

    -------------------------------------------------------------------------------------------------------------------------------------------------
    const commit_time = SQLite3_DB.localTime();
    const commit_date = SQLite3_DB.localDate();

    await SQLite3_DB.fromFileInsertEachRow(
    db,
    "../../optimizedsumofprimes.cpp",
    "Sahil Dutta",
    commit_time,
    commit_date,
    commitData.commit_no,
    "My first commit"
    );

    await SQLite3_DB.writeFromTableToFile(db, "../../output.txt", "SELECT line_string FROM commit_log");
    ----------------------------------------------------------------------------------------------------------------------------------------------
    - Namespace-Class merging:

    namespace SQLite3_DB {
        export interface userCommitLogEntry {
            username: string;
            commit_time: string;
            commit_date: string;
            commit_no: number;
            line_no: number;
            line_string: string;
            commit_msg: string | null;

            // Index signature to allow access using a string key
            [key: string]: number | string | null;
        } // Type of row / entry into the table --> each attr is a column
    }

*/
