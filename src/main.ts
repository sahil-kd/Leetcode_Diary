#!/usr/bin/env node

/*
    Core ts dev guide:
    a) run ts in watch mode using tsc -w or, npm run dev | Ctrl + C to exit mode
    b) after running tsc -w, add new terminal with '+' icon, now you can use git bash while
       previous terminal takes care of watching changes in ts file on each save, or set ts
       watch mode on one terminal & use git bash cli app -> easier to switch
    c) use Prettier
    d) run npm start
*/

/* 
	export PS1="" for MSYS2 and only display the username/host computer name and let console logs take care of App output: Leetcode Diary --> "./path"
	inside a .bashrc this command will run automatically at startup and also manage app title at title bar with PS1
*/

import chalk from "chalk";
// import inquirer from "inquirer";
import { exec, spawn, spawnSync } from "node:child_process";
import * as f from "./modules/file_n_path_ops.js";
import sqlite3 from "sqlite3";
import { PathLike, createReadStream, createWriteStream } from "node:fs";
import { createInterface } from "node:readline";
import { EventEmitter } from "node:events";
/*
`
	CREATE TABLE IF NOT EXISTS commit_log (
		sl_no INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT NOT NULL,
		commit_time TIME NOT NULL,
		commit_date DATE NOT NULL,
		commit_no INTEGER NOT NULL,
		line_no INTEGER NOT NULL,
		line_string TEXT NOT NULL,
		commit_msg TEXT DEFAULT NULL
	)
`

`
	CREATE TEMPORARY TABLE temp_file(
		line_no INTEGER,
		line_string TEXT
	)
`
*/

type convertSQLTypes<T> = {
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
		: T[K] extends "INTEGER PRIMARY KEY AUTOINCREMENT"
		? number
		: "Invalid SQLite types";
}; // basically interating over the property types of interface T (this is a type function)

class CREATE_TABLE_IF_NOT_EXIST<
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

	constructor(dbHandle: sqlite3.Database | undefined, tablename: string, shape: TableShape) {
		this.tablename = tablename;
		this.dbHandle = dbHandle;
		this.sqlQuery = `CREATE TABLE IF NOT EXISTS ${tablename} (\n`;

		Object.keys(shape).map((key) => {
			this.sqlQuery += `${key} ${shape[key]},\n`;
		});

		this.sqlQuery = this.removeTrailingCommas(this.sqlQuery);
		this.sqlQuery += "\n)";

		console.log("this.sqlQuery below:\n");
		console.log(this.sqlQuery);

		dbHandle?.serialize(() => {
			dbHandle.run(this.sqlQuery as string, (err) => {
				if (err) {
					console.error(chalk.red("AppError: Table-creation Error --> " + err.message));
				}
			}); // Creation of a table (mini-database)
		});
	}

	method(o: convertSQLTypes<TableShape>) {
		console.log(o);
	}

	insertRow(log: convertSQLTypes<TableShape>) {
		(this.dbHandle as sqlite3.Database)?.serialize(() => {
			(this.dbHandle as sqlite3.Database).run(
				`INSERT INTO commit_log (username, commit_time, commit_date, commit_no, line_no, line_string, commit_msg)
					VALUES (?, TIME(?), DATE(?), ?, ?, ?, ?)`,
				this.objectToArray(log),
				(err) => {
					err && console.error(chalk.red("AppError: row/entry insertion error --> " + err.message));
				}
			);
		});
	}

	/* Utils below */

	private removeTrailingCommas(inputString: string) {
		const cleanedString = inputString.replace(/[, \n]+$/, "");
		return cleanedString;
	}

	private objectToArray(obj: convertSQLTypes<TableShape>): Array<string | number | null> {
		return Object.keys(obj).map((key) => obj[key]);
	}
}

const nn = new CREATE_TABLE_IF_NOT_EXIST(undefined, "", {
	username: "TEXT",
	no: "INTEGER PRIMARY KEY AUTOINCREMENT",
	password: "TEXT NOT NULL",
	Additional_comment: "TEXT DEFAULT NULL",
	count: "INTEGER",
	Date: "DATE NOT NULL",
	Time: "TEXT NOT NULL",
});

nn.method({
	username: null,
	no: 0,
	password: "",
	Additional_comment: null,
	count: null,
	Date: "",
	Time: "",
});

/*  
	- My database is static class to prevent two or more instances of the class from changing data at the same time and reading while other function
		is changing data --> To prevent data races
	- It helps to directly access the database from multiple zones as the methods are global
	- Syntactically more clear in purpose and functionality --> SQLite3_DB.method_name
	- static methods are faster than non-static methods

	- If you want another instance of the database simply make const db2 = await SQLite3_DB.connect("./db/test.db");
		const db3 = await SQLite3_DB.connect("./db/test.db"); and subsequently call their respective destructors/db disconnector to stop the db
		connection
	- The design of the class is intentional to enable these functionalitites. You can create multiple instances of database without creating
		unnecessary instances of this class. Classes are faster. Class gives a good wrapper around database methods and nested class to extend
		the EventEmitter which gives better visual clarity on what the methods purpose and functionality are.
	- Use two instances of database when one is writing and others are reading, but not reading what is being currently written upon

*/

class SQLite3_DB {
	static connect(dbFilePath: string) {
		return new Promise<sqlite3.Database | undefined>((resolve) => {
			const db = new sqlite3.Database(dbFilePath, (err) => {
				if (err) {
					console.error(chalk.red("AppError: Could not connect to db --> " + err.message));
					resolve(undefined);
				} else {
					resolve(db);
				}
			}); // Establishing a connection between this node process and SQLite3 Database
		});
	} // this function when resolved returns false if db connection failed else returns the db handler

	static createTable(dbHandle: sqlite3.Database | undefined, sqlQuery: string) {
		dbHandle?.serialize(() => {
			dbHandle.run(sqlQuery, (err) => {
				if (err) {
					console.error(chalk.red("AppError: Table-creation Error --> " + err.message));
				}
			}); // Creation of a table (mini-database)
		});
	}

	static createTempTable(dbHandle: sqlite3.Database | undefined, sqlQuery: string) {
		dbHandle?.serialize(() => {
			dbHandle.run(sqlQuery, (err) => {
				if (err) {
					console.error(chalk.red("AppError: Temp-table creation error --> " + err.message));
				}
			});
		});
	}

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

	static deleteTable(dbHandle: sqlite3.Database | undefined, sqlQuery: string) {
		dbHandle?.serialize(() => {
			dbHandle.run(sqlQuery, (err) => {
				if (err) {
					console.error(chalk.red("AppError: Table deletion error --> " + err.message));
				}
			}); // delete the table named users
		});
	}

	static disconnect(dbHandle: sqlite3.Database | undefined) {
		dbHandle?.serialize(() => {
			dbHandle.close((err) => {
				if (err) {
					console.error(chalk.red("AppError: db disconnection error --> " + err.message));
				}
			}); // Close connection to the database
		});
	}

	/* Non-promise based db functions below */

	static insertRow(dbHandle: sqlite3.Database | undefined, log: SQLite3_DB.userCommitLogEntry) {
		dbHandle?.serialize(() => {
			dbHandle.run(
				`INSERT INTO commit_log (username, commit_time, commit_date, commit_no, line_no, line_string, commit_msg)
					VALUES (?, TIME(?), DATE(?), ?, ?, ?, ?)`,
				SQLite3_DB.objectToArray(log),
				(err) => {
					err && console.error(chalk.red("AppError: row/entry insertion error --> " + err.message));
				}
			);
		});
	}

	/* Database event emitters below */

	static eventEmitter = class extends EventEmitter {
		constructor() {
			super();
		}
	};

	/* Utils below */

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

	static objectToArray(obj: SQLite3_DB.userCommitLogEntry): Array<string | number | null> {
		return Object.keys(obj).map((key) => obj[key]);
	}
}

namespace SQLite3_DB {
	/* 
		- Declare this interface by doing let u: SQLite3_DB.userCommitLogEntry = {}
		- You'll get an error -> Quick fix (Ctrl + .)
		- Select 'Add missing properties'
		- Use the autocomplete technique above and do not deliberately change the order of the object properties else db data will be
			be corrupted and won't show error --> maybe better to use tuple type object to enforce the order of object properties
	*/
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

/* *** main() function below *** */

(async function main() {
	console.log(` ${chalk.bold.underline.green("\nLeetcode Diary")}\n`); // Main App Title

	console.log(chalk.hex("#9C33FF")("h --> help"));

	f.getMemoryLog();
	// console.log("File extension: ", "" === f.getFileExtension("_folder_name")); // returns true
	console.log(`> pwd is ${f.currentDir()}`);

	/* Setup process */

	const programFilesPath = process.env.PROGRAMFILES;
	if (programFilesPath) {
		console.log("Program Files Path:", programFilesPath);
		// f.createDir(f.joinPath(programFilesPath, "Userdata")); // Permission not granted to read and write
	} else {
		console.log("env variable couldn't be set up, alternative setups to be added later");
	}

	const appDataPath = process.env.APPDATA || f.joinPath(f.getUserHomeDirPath(), "AppData", "Roaming"); // %APPDATA% --> user data
	const cachePath = process.env.LOCALAPPDATA || f.joinPath(f.getUserHomeDirPath(), "AppData", "Local"); // %LOCALAPPDATA% --> session cache & autocomplete
	const tmpdirPath = f.getTempDirPath();

	if (appDataPath) {
		f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Local storage"));
		f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Session storage")); // unlike "Current session storage" here it's incrementally updated every 5-10 mins
		f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Network"));
		f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Local state")); // --> user profile during --> dictionary (database for user info)
		f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Previous session logs"));
	} else {
		console.log("Setup failed at APPDATA, alternative ways to be added later");
	}

	if (cachePath) {
		f.createDir(f.joinPath(cachePath, "Leetcodeislife", "Current session state")); // engagement record --> user activity analytics
		f.createDir(f.joinPath(cachePath, "Leetcodeislife", "User activity profile"));
		f.createDir(f.joinPath(cachePath, "Leetcodeislife", "Current session variables"));
		f.createDir(f.joinPath(cachePath, "Leetcodeislife", "Current session map"));
		f.createDir(f.joinPath(cachePath, "Leetcodeislife", "Previous session logs")); // a backup copy if in APPDATA not found previous logs
	} else {
		console.log("Setup failed at LOCALAPPDATA, alternative ways to be added later");
	}

	f.createDir(f.joinPath(tmpdirPath, "leetcodeislife", "Current session storage", "log"));
	/* logs stored/updated every few secs, incase of abrupt exit logs remain stored
	there and in the next session logs are automtically recovered if abrupt_exit=true, when 
	session ends it transfers logs from %temp% to previous session logs with dates and time
	of entry (history) (to give user a map of how many things they did between these dates and
	what problems they did) and it clears up the %temp% files */

	const currentDateTime = getLocalDateTime();
	console.log(currentDateTime);

	/* End of setup process */

	/* Event listensers section */

	const listener = new SQLite3_DB.eventEmitter();

	listener.on("db event", (a, b) => console.log(`db event fired with args ${a} and ${b}`));

	/* Event listensers section exit */

	/* Database entry point --> later move .db to %LOCALAPPDATA% & %APPDATA% --> No need to abstract as in if-else in else we can run code on success & is faster */

	// const items = await listItemsInDirectory(`"${dirPath}"`); // <-- working
	// items.forEach((item) => console.log(">> ", item));

	// const da = await SQLite3_DB.connect("./db/test.db");
	const da = undefined;

	SQLite3_DB.createTable(
		da,
		`
			CREATE TABLE IF NOT EXISTS commit_log (
				sl_no INTEGER PRIMARY KEY AUTOINCREMENT,
				username TEXT NOT NULL,
				commit_time TIME NOT NULL,
				commit_date DATE NOT NULL,
				commit_no INTEGER NOT NULL,
				line_no INTEGER NOT NULL,
				line_string TEXT NOT NULL,
				commit_msg TEXT DEFAULT NULL
			)
		`
	);

	SQLite3_DB.insertRow(da, {
		username: "sahil",
		commit_time: SQLite3_DB.localTime(),
		commit_date: SQLite3_DB.localDate(),
		commit_no: 1,
		line_no: 2,
		line_string: "Line 1",
		commit_msg: null,
	});

	SQLite3_DB.insertRow(da, {
		username: "sahil",
		commit_time: SQLite3_DB.localTime(),
		commit_date: SQLite3_DB.localDate(),
		commit_no: 1,
		line_no: 2,
		line_string: "Line 2",
		commit_msg: null,
	});

	SQLite3_DB.insertRow(da, {
		username: "sahil",
		commit_time: SQLite3_DB.localTime(),
		commit_date: SQLite3_DB.localDate(),
		commit_no: 1,
		line_no: 2,
		line_string: "Line 3",
		commit_msg: "First commit msg",
	});

	SQLite3_DB.disconnect(da);

	// const db = await SQLite3_DB.connect("./db/test.db");
	const db = undefined;

	if (db) {
		SQLite3_DB.createTable(
			db,
			`
			CREATE TABLE IF NOT EXISTS commit_log (
				sl_no INTEGER PRIMARY KEY AUTOINCREMENT,
				username TEXT NOT NULL,
				commit_time TIME NOT NULL,
				commit_date DATE NOT NULL,
				commit_no INTEGER NOT NULL,
				line_no INTEGER NOT NULL,
				line_string TEXT NOT NULL,
				commit_msg TEXT DEFAULT NULL
			)
		`
		);

		SQLite3_DB.createTempTable(
			db,
			`
			CREATE TEMPORARY TABLE temp_file(
				line_no INTEGER,
				line_string TEXT
			)
		`
		);

		const commit_time = SQLite3_DB.localTime();
		const commit_date = SQLite3_DB.localDate();

		const commitData = f.readJson("./db/commitData.json"); // retrive data as object (key-value pair) from JSON file
		commitData.commit_no += 1; // set the changes to staging
		// commitData.abrupt_exit = !commitData.abrupt_exit; // set the changes to staging
		f.writeJson("./db/commitData.json", commitData); // commit changes to the JSON file --> then resolve the promise

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

		// await SQLite3_DB.deleteTable(db, "DROP TABLE commit_log");

		SQLite3_DB.disconnect(db);

		// // eg: SELECT * FROM commit_log WHERE commit_time > TIME('00:00:00')
		// db.all("SELECT * FROM commit_log", (err, rows: userCommitLogEntry[]) => {
		// 	if (err) {
		// 		console.log(chalk.red("AppError: Table output error --> --> " + err.message));
		// 	} else {
		// 		rows.length == 0
		// 			? console.log("No records found")
		// 			: rows.forEach((entry) => {          // use db.each() and encompass it inside db.serialize() else memory overflow
		// 					console.log(entry);
		// 					// console.log(
		// 					// 	`Commit-log ${entry.sl_no} --> Username: ${entry.username} | Date: ${entry.commit_date} | Time: ${entry.commit_time}`
		// 					// );
		// 			  });
		// 	} // **REMINDER: to replace forEach with for-loop cause the later is faster than the former as the iternation becomes larger
		// }); // Get/Fetch data from table (db) and display entire table or list of sorted/filtered rows

		// process.exit(); // simulating an abrupt app closure before db is gracefully disconnected, on executing this I observed both commit_log and temp table
		// do not exits when accessed through SQLite3 terminal session, maybe SQLite3 has an internal cleaning or commit system for resolving abrupt closures
		// since primary table also not retained hence need to store every 5-10 secs in %temp% dir with a condition if-abrupt closure occured, restore & auto-commit
		// on next startup with a commit msg "Auto-commited due to abrupt closure" | neither was the SELECT data displayed, weird
	}

	/* Database exit point */

	/* User input section */

	while (true) {
		process.stdout.write("\n");
		process.stdout.write(chalk.cyanBright("Leetcode Diary") + chalk.yellow(" --> ") + chalk.yellow(process.cwd())); // hex("#9C33FF")
		process.stdout.write("\n");

		const child_terminal_input = await user_input();
		const parsed_input = parse_command(child_terminal_input);
		const command = parsed_input.command;

		if (!command) {
			console.error(chalk.red("No command entered | Type h to view the list of all in-app commands"));
			continue;
		} else if (command === "fire") {
			const default_args = ["default1", "default2"];
			listener.emit("db event", ...(parsed_input.args.length > 0 ? parsed_input.args : default_args));
			continue;
		} else if (command === "exit" || command === "q") {
			listener.removeAllListeners("db event"); // also need to run background processes to ensure cleanup when user abruptly closes the app
			break;
		} else if (command === "pwd") {
			console.log(chalk.cyanBright(process.cwd()));
			continue;
		}

		/* ------------------------------------------------------------------------------------------------------------------------------------- */

		if (command === "h") {
			if (parsed_input.args.length != 0) {
				console.error(chalk.red("Incorrect usage | Type h for help menu"));
				continue;
			}
			console.log(chalk.cyanBright("List of commands: \n"));
			console.log(
				chalk.cyanBright(
					"  build --> builds the executable for a .cpp file that you can execute later using run command"
				)
			);
			console.log(chalk.cyanBright("            build filename.cpp "));
			console.log(chalk.cyanBright("  run   --> builds and runs the executable for .cpp file | run filename.cpp"));
			console.log(
				chalk.redBright(
					"          **Don't run the .exe file directly by typing filename.exe, it won't work as expected"
				)
			);
			console.log(chalk.redBright("            instead use the run command above"));
			console.log(chalk.cyanBright("  cd    --> change directory | advisable to wrap the path in single-quotes '...'"));
			console.log("----------------------------------------------------------------------------------------------");
			console.log(chalk.cyanBright("  q | exit  --> exits the app | recommended way"));
			console.log(chalk.redBright("     **Basic commands of default terminals valid here too"));
			continue;
		}

		// For "cd" command, handle it separately with process.chdir()
		if (command === "cd") {
			const targetDirectory = parsed_input.args[0];
			if (parsed_input.args.length == 0) {
				console.error(chalk.red("No path provided | To resolve enter a path --> cd path/to/folderOrFilename.ext"));
				continue;
			}

			try {
				if (targetDirectory == "~") {
					process.chdir(f.getUserHomeDirPath());
					continue;
				} else if (targetDirectory == "-") {
					console.error(chalk.red("Directory quick switch currently unsupported"));
					continue;
				}
				process.chdir(targetDirectory); // not available in worker threads
			} catch (error: any) {
				const errorString = error.message;
				try {
					const [, errorMessage, _fromDirectory, _toDirectory] = errorString.match(
						/ENOENT: (.*), chdir '(.*?)' -> '(.*?)'/
					);
					console.error(chalk.red(errorMessage));
					console.error(
						chalk.red("Tip: use single-quotes to wrap the path containing spaces | cd 'path/to/file name.ext'")
					); // error-message simplifier
				} catch (err) {
					if (err) console.error(chalk.red(errorString));
				} // activates when error-message simplifier fails --> safeguard in place cause error-msg simplifier relies on pattern-matching
			}
		} else if (command == "build") {
			if (parsed_input.args.length == 0) {
				console.error(
					chalk.red("No path provided | To resolve enter the cpp file path --> build path/to/filename.cpp")
				);
				continue;
			}

			const file = f.getFileExtensionAndName(parsed_input.args[0]);
			if (file.extension != "cpp") {
				console.error(chalk.red("Currently can only build .cpp files"));
				continue;
			}

			const child1 = spawnSync("g++", ["-o", `${file.name}.o`, "-c", `${file.name}.cpp`]);
			if (child1.stderr.toString()) {
				console.error(chalk.red("Compilation Error -->\n\n" + child1.stderr.toString()));
				continue;
			}

			const child2 = spawnSync("g++", ["-o", `${file.name}.exe`, `${file.name}.o`]);
			if (child2.stderr.toString()) {
				console.error(chalk.red("Linking Error -->\n\n" + child2.stderr.toString()));
				continue;
			}

			console.log(chalk.greenBright(`Build successfull. To execute the file type run ${file.name}.cpp and ENTER`));
		} else if (command == "run") {
			if (parsed_input.args.length == 0) {
				console.error(chalk.red("No path provided | To resolve enter the cpp file path --> run path/to/filename.cpp"));
				continue;
			}

			const file = f.getFileExtensionAndName(parsed_input.args[0]);
			if (file.extension != "cpp") {
				console.error(chalk.red("Currently can only run .cpp files, type run filename.cpp"));
				continue;
			}

			const child1 = spawnSync("g++", ["-o", `${file.name}.o`, "-c", `${file.name}.cpp`]);
			if (child1.stderr.toString()) {
				console.error(chalk.red("Compilation Error -->\n\n" + child1.stderr.toString().trimEnd()));
				continue;
			}

			const child2 = spawnSync("g++", ["-o", `${file.name}.exe`, `${file.name}.o`]);
			if (child2.stderr.toString()) {
				console.error(chalk.red("Linking Error -->\n\n" + child2.stderr.toString().trimEnd()));
				console.error(chalk.redBright("\nTip: Try turning off the currently running .exe file and rerun run command"));
				continue;
			}

			console.log(chalk.greenBright("Build successfully, running...\n"));

			const child3 = spawn(`${file.name}.exe`, { stdio: "pipe" });

			// Event listener for capturing the output of the child process
			child3.stdout.on("data", (data) => {
				process.stdout.write(data.toString());
			});

			// Event listener for capturing any errors from the child process
			child3.stderr.on("data", (data) => {
				process.stderr.write(chalk.redBright("\nError: " + data.toString()));
			});

			let term_open = true;

			// Event listener for handling the completion of the child process
			child3.on("close", (code) => {
				process.stdout.write(`\nProcess exited with code ${code}, press any key to continue`);
				term_open = false;
			}); // end the while loop when this event fired and use a diff input method to treat entire user input as a string for whitespaces

			while (term_open) {
				const inp = await user_input("", false);
				child3.stdin.write(inp + "\n"); // this \n is necessary as it signals user pressing ENTER
			}

			// no stdin method linked to recieve input for the child process --> no input to cpp file, only output
		} else {
			const child = spawnSync(command, parsed_input.args, { stdio: "pipe" }); // by default runs on cmd.exe

			/* if (process.env.TERM) {
				console.log(`\nCurrent terminal: ${process.env.TERM}\n`); // in git bash spawnSync uses "xterm" terminal | env.TERM does not exists in windows
			} else {
				console.log("\nTerminal information not available.\n");
			} */

			// Convert Buffer objects to strings for stdout and stderr
			const stdout = child.stdout ? child.stdout.toString() : "";
			const stderr = child.stderr ? child.stderr.toString() : "";

			process.stdout.write(chalk.cyanBright(stdout) || chalk.red(stderr));

			if (child.error) {
				if (child.error.message.includes("spawnSync") && child.error.message.includes("ENOENT")) {
					// above condition is checking for no entity (found) error of spawnSync method
					const child_powershell = spawnSync(command, parsed_input.args, { stdio: "pipe", shell: "powershell.exe" });
					// runs on powershell when cmd.exe fails to execute command --> stdio: inherit by default
					// powershell not run by default cause each time shell: "powershell.exe" takes time to setup and execute, while cmd.exe is fast

					/* if (process.env.TERM) {
						console.log(`\nCurrent terminal: ${process.env.TERM}\n`);
					} else {
						console.log("\nTerminal information not available.\n");
					} */

					// Convert Buffer objects to strings for stdout and stderr
					const stdout = child_powershell.stdout ? child_powershell.stdout.toString().trim() : "";
					const stderr = child_powershell.stderr ? child_powershell.stderr.toString().trim() : "";
					process.stdout.write("\n");
					process.stdout.write(chalk.cyanBright(stdout) || chalk.red(stderr));
					process.stdout.write("\n");
					stderr != "" && console.error("\n" + chalk.red(`${command}: unrecognised command | Type h for help`));
				} else {
					console.error(chalk.red("Error:", child.error.message));
				}
			}
		}
	}

	/* User input section end */

	// /* Program exit */
	// process.stdin.destroy(); // destroying any open input stream to properly exit --> working
})();

/* *** End of main() function above *** */

function user_input(prompt?: string, input_guide: boolean = true): Promise<string> {
	return new Promise((resolve) => {
		prompt && process.stdout.write(prompt);
		input_guide && process.stdout.write(">> ");

		const onData = (data: { toString: () => string }) => {
			const userInput = data.toString().trim();
			resolve(userInput);
			cleanup();
		};

		const cleanup = () => {
			// Remove the event listener for "data"
			process.stdin.removeListener("data", onData);
			// Pause the input stream to prevent further data events
			process.stdin.pause();
		};

		// Resume the input stream and add the event listener for "data" once
		const resumeAndAddListener = () => {
			process.stdin.resume();
			process.stdin.once("data", onData);
		};

		// Initially, resume and add the event listener for "data"
		resumeAndAddListener();
	});
}

function getLocalDateTime() {
	const now = new Date();
	const date = now.getDate();
	const month = now.getMonth() + 1;
	const year = now.getFullYear();
	const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
	let hours = now.getHours();
	const minutes = now.getMinutes();
	const seconds = now.getSeconds();
	let period = "AM";

	if (hours >= 12) {
		period = "PM";
		if (hours > 12) {
			hours -= 12;
		}
	}

	return {
		time12hformat: `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
			.toString()
			.padStart(2, "0")} ${period}`,
		time24hformat: now.toLocaleTimeString("en-US", { hour12: false }),
		yyyy_mm_dd: `${year}-${month.toString().padStart(2, "0")}-${date.toString().padStart(2, "0")}`,
		dd_mm_yyyy: `${date.toString().padStart(2, "0")}-${month.toString().padStart(2, "0")}-${year}`,
		dayOfWeek: daysOfWeek[now.getDay()],
	};
}

async function listItemsInDirectory(directory_path: string) {
	try {
		const items = await (function (command: string) {
			return new Promise<string[]>((resolve, reject) => {
				exec(command, (error, stdout, stderr) => {
					if (error) {
						reject(error);
					} else {
						resolve(stdout.trim().split("\n") || stderr);
					}
				});
			});
		})(`ls "${directory_path}"`); // IIFE
		return items.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })); // case-insensitive sort
	} catch (error: any) {
		console.error("Error listing items:", error.message);
		return [];
	}
}

async function changeDirectory(path: string) {
	try {
		await (function (command: string) {
			return new Promise((resolve, reject) => {
				exec(command, (error, stdout, stderr) => {
					if (error) {
						reject(error);
					} else {
						resolve(stdout || stderr);
					}
				});
			});
		})(`cd "${path}"`); // IIFE
		// console.log(`Changed directory to: ${path}`);
	} catch (error: any) {
		console.error("Error changing directory:", error.message);
	}
}

async function printWorkingDirectory() {
	try {
		const currentDirectory = await (function (command: string) {
			return new Promise<string>((resolve, reject) => {
				exec(command, (error, stdout, stderr) => {
					if (error) {
						reject(error);
					} else {
						resolve(stdout.trim() || stderr);
					}
				});
			});
		})("pwd"); // IIFE
		return currentDirectory;
	} catch (error: any) {
		console.error("Error getting current working directory:", error.message);
		return null;
	}
}

function parse_command(str: string) {
	const arr: string[] = [];
	let i = 0;

	while (i < str.length) {
		if (str[i] === '"') {
			// Handle quoted sections
			i++;
			const endIndex = str.indexOf('"', i);
			if (endIndex !== -1) {
				arr.push(str.substring(i, endIndex));
				i = endIndex + 1;
			}
		} else if (str[i] === "'") {
			// Handle quoted sections
			i++;
			const endIndex = str.indexOf("'", i);
			if (endIndex !== -1) {
				arr.push(str.substring(i, endIndex));
				i = endIndex + 1;
			}
		} else if (str[i] !== " ") {
			// Handle regular sections
			let puff = "";
			while (i < str.length && str[i] !== " " && str[i] !== '"') {
				puff += str[i];
				i++;
			}
			arr.push(puff);
		} else {
			i++;
		}
	}

	const command = arr.shift();

	return {
		command: command,
		args: arr,
	};
}
