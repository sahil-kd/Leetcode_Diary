import sqlite3 from "sqlite3";
import chalk from "chalk";
import { EventEmitter } from "node:events";
import { PathLike, createReadStream, createWriteStream } from "node:fs";
import { createInterface } from "node:readline";

/*
	Side Note:

	I've noticed while testing my library that the popular sqlite3 module will create a new .db file if the address to the .db file is not
	found, then it will create a new .db file inside the directory the path was pointing at provided the directory path is valid | even .db 
	is valid filename
*/

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

// (below) first is Default type else union type excluding Default type
type UnionizeParams<T extends any[]> = T extends [infer Default, ...infer Params] ? Params[number] : T[0];

class SQLite3_DB {
	private static allConnections: sqlite3.Database[] = []; // Private class attribute to store all active database connections

	dbHandler: sqlite3.Database | undefined = undefined;

	constructor() {}

	static async connect(databaseFilePath: string) {
		return new Promise<SQLite3_DB | undefined>((resolve) => {
			const instance = new SQLite3_DB();
			instance.dbHandler = new sqlite3.Database(databaseFilePath, (err) => {
				if (err) {
					console.error(chalk.red("SQLite3_DB: Error connecting to the database --> ", err.message));
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
			if (db === undefined) {
				console.error(chalk.red("SQLite3_DB: Auto disconnector error --> Database not connected"));
				continue;
			}

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

	disconnect() {
		(this.dbHandler as sqlite3.Database).serialize(() => {
			(this.dbHandler as sqlite3.Database).close((err) => {
				if (err) {
					console.error(chalk.red("SQLite3_DB: db disconnection error --> " + err.message));
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

	[Important guide]:
		- Objects are by javascript defintion set of unordered properties hence I cannot enforce order of properties through
			typescript as the complexity is beyond the capabilities of the type system
		- Objects are elegant to look at and more intuitive than maps, and they give the sweet autocomplete which reduces the
			chances of errors, infact don't manually insert properties into functions like insertRow(), simply make:
			
			const connection1 = await SQLite3_DB.connect("path/to/database_file.db");

			const table2 = await connection1?.TABLE.CREATE_TABLE_IF_NOT_EXISTS(
				"hello_world",
				{
					sl_no: "INTEGER PRIMARY KEY AUTOINCREMENT",
					name: "TEXT NOT NULL",
					age: "INTEGER NOT NULL",
					dob: "DATE DEFAULT NULL",
				}
			);

			table1?.insertRow({});
			                 ^^ Error here --> move cursor here Ctrl + . then click 'Add missing properties'
				    and it will autocomplete for you like this in the correct order
					|
					|
					V

			table1?.insertRow({
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

		public dbHandler: sqlite3.Database | undefined; // raw database handler for when developer wants to use native sqlite3 mthods like run(), all(), etc
		public tablename: string; // available if dev needs the name of the table --> helpful for debugging & logging in larger codebases

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

			this.dbHandler?.serialize(() => {
				// important if-check to see if db connected | removing this check will lead to fatal error & program will abrupty exit
				(this.dbHandler as sqlite3.Database).run(this.sqlQuery as string, (err) => {
					if (err) {
						console.error(chalk.red("SQLite3_DB: Table-creation Error --> " + err.message));
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
			let keys_arr: string[] = [];

			// Freezing the object for tiny performance gains --> 2 secs lower time with object freezing
			Object.freeze(log);

			Object.keys(log).map((key) => keys_arr.push(key));

			/* I made this function and query creation below as efficient as possible without losing ease of use */

			let placeholders = new Array(keys_arr.length).fill("?").join(", ");
			let sql_query = `INSERT INTO ${this.tablename} (${keys_arr.join(", ")}) VALUES (${placeholders})`;

			(this.dbHandler as sqlite3.Database).serialize(() => {
				(this.dbHandler as sqlite3.Database).run(
					sql_query,
					Object.keys(log).map((key) => (log as ConvertSQLTypes<TableShape>)[key]),
					(err) => {
						err && console.error(chalk.red("SQLite3_DB [insertRow()]: row/entry insertion error --> " + err.message));
					}
				);
			});
		}

		selectAll() {
			return new Promise<ConvertSQLTypes<TableShape>[] | null | undefined>((resolve) => {
				let result;
				(this.dbHandler as sqlite3.Database).serialize(() => {
					(this.dbHandler as sqlite3.Database).all(
						`SELECT * FROM ${this.tablename}`,
						(err, rows: Array<ConvertSQLTypes<TableShape>>) => {
							if (err) {
								console.error(chalk.red("SQLite3_DB [selectAll()]: SELECT * error --> --> " + err.message));
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

		select(...columns: Array<keyof TableShape>) {
			return new Promise<ConvertSQLTypes<TableShape>[] | null | undefined>((resolve) => {
				let result;
				(this.dbHandler as sqlite3.Database).serialize(() => {
					(this.dbHandler as sqlite3.Database).all(
						`SELECT ${columns.join(", ")} FROM ${this.tablename}`,
						(err, rows: ConvertSQLTypes<TableShape>[]) => {
							if (err) {
								console.log(chalk.red("SQLite3_DB [select()]: SELECT error --> " + err.message));
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
			(this.dbHandler as sqlite3.Database).serialize(() => {
				(this.dbHandler as sqlite3.Database).run(`DROP TABLE ${this.tablename}`, (err) => {
					if (err) {
						console.error(chalk.red("SQLite3_DB: Table deletion error --> " + err.message));
					}
				}); // delete the table named users
			});
		}

		/* Database to file and file to database operations */

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
					console.error(
						chalk.red("SQLite3_DB [fromFileInsertEachRow()]: Error reading the inputFile: --> " + err.message)
					);
					resolve();
				});
			});
		}

		// Array<keyof OmitPropertyByType<TableShape, "INTEGER PRIMARY KEY AUTOINCREMENT">>

		writeFromTableToFile<T extends Array<keyof TableShape>>(
			outputFile: PathLike,
			forEach_rowObject: (
				rowObject: Pick<ConvertSQLTypes<TableShape>, UnionizeParams<[ConvertSQLTypes<TableShape>, ...T]>>
			) => string,
			...selected_columns: T[]
		) {
			// return type is apparently void | PromiseLike<void>
			return new Promise<void>((resolve) => {
				const fileWriteStream = createWriteStream(outputFile);
				const sql_query = `SELECT ${selected_columns.length === 0 ? "*" : selected_columns.join(", ")} FROM ${
					this.tablename
				}`;

				// asserting type cause here dbHandler will be of type sqlite3.Database to avoid using unnecessary if checks like this this.dbHandler?.serialize(...)
				// to improve performance when transpiled to javascript, cause these tiny things matters in large databases
				(this.dbHandler as sqlite3.Database).serialize(() => {
					(this.dbHandler as sqlite3.Database).each(
						sql_query,
						(err, row: Pick<ConvertSQLTypes<TableShape>, UnionizeParams<[ConvertSQLTypes<TableShape>, ...T]>>) => {
							if (err) {
								console.error(
									chalk.red("SQLite3_DB [writeFromTableToFile()]: Error retrieving row --> " + err.message)
								);
							} else {
								fileWriteStream.write(forEach_rowObject(row) + "\n", (writeErr) => {
									if (writeErr) {
										console.error(
											chalk.red("SQLite3_DB [writeFromTableToFile()]: Error writing to file --> " + writeErr.message)
										);
									}
								});
							}
						},
						(completeErr, rowCount) => {
							if (completeErr) {
								console.error(
									chalk.red(
										`SQLite3_DB [writeFromTableToFile()]: Error completing query at ${rowCount} row count --> ` +
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
		}

		/* Utils below */

		private removeTrailingCommas(inputString: string) {
			const cleanedString = inputString.replace(/[, \n]+$/, "");
			return cleanedString;
		}
	};
}

/* Exported members below */
export { SQLite3_DB }; // SQLite3_DB is not exported as default to enforce the name SQLite3_DB, as this name provides better clarity about the functionality

/*
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
