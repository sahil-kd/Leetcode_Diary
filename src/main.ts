/*
    Core ts dev guide:
    a) run ts in watch mode using tsc -w or, npm run dev | Ctrl + C to exit mode
    b) after running tsc -w, add new terminal with '+' icon, now you can use git bash while
       previous terminal takes care of watching changes in ts file on each save, or set ts
       watch mode on one terminal & use git bash cli app -> easier to switch
    c) use Prettier
    d) run npm start
*/

import chalk from "chalk";
// import inquirer from "inquirer";
import * as f from "./modules/file_n_path_ops.js";
import sqlite3 from "sqlite3";
import { PathLike, createReadStream, createWriteStream } from "node:fs";
import { createInterface } from "node:readline";

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

	static createTable(dbHandle: sqlite3.Database, sqlQuery: string) {
		return new Promise<void>((resolve) => {
			dbHandle.run(sqlQuery, (err) => {
				if (err) {
					console.error(chalk.red("AppError: Table-creation Error --> " + err.message));
					resolve();
				} else {
					resolve();
				}
			}); // Creation of a table (mini-database)
		});
	}

	static createTempTable(dbHandle: sqlite3.Database, sqlQuery: string) {
		return new Promise<void>((resolve) => {
			dbHandle.run(sqlQuery, (err) => {
				if (err) {
					console.error(chalk.red("AppError: Temp-table creation error --> " + err.message));
					resolve();
				} else {
					resolve();
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
	}

	static deleteTable(dbHandle: sqlite3.Database, sqlQuery: string) {
		return new Promise<void>((resolve) => {
			dbHandle.run(sqlQuery, (err) => {
				if (err) {
					console.error(chalk.red("AppError: Table deletion error --> " + err.message));
					resolve();
				} else {
					resolve();
				}
			}); // delete the table named users
		});
	}

	static disconnect(dbHandle: sqlite3.Database) {
		return new Promise<void>((resolve) => {
			dbHandle.close((err) => {
				if (err) {
					console.error(chalk.red("AppError: db disconnection error --> " + err.message));
					resolve();
				} else {
					resolve();
				}
			}); // Close connection to the database
		});
	}
}

console.log(` ${chalk.bold.underline.green("Leetcode Diary")}\n`); // Main App Title

/* *** main() function below *** */

(async function main() {
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

	/* Database entry point --> later move .db to %LOCALAPPDATA% & %APPDATA% --> No need to abstract as in if-else in else we can run code on success & is faster */

	interface userCommitLogEntry {
		sl_no: number;
		username: string;
		commit_time: string;
		commit_date: string;
		commit_no: number;
		line_no: number;
		line_string: string;
		commit_msg: string | null;
	} // Type of row / entry into the table --> each attr is a column

	const db = await SQLite3_DB.connect("./db/test.db");

	const u_input = await user_input("\nEnter the command: ");
	console.log("User input: ", u_input);

	const u_input2 = await user_input("\nEnter another command: ");
	console.log("User input: ", u_input2);

	if (db) {
		await SQLite3_DB.createTable(
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

		await SQLite3_DB.createTempTable(
			db,
			`
			CREATE TEMPORARY TABLE temp_file(
				line_no INTEGER,
				line_string TEXT
			)
		`
		);

		const commit_time = sqlLocalTime();
		const commit_date = sqlLocalDate();

		const commitData = f.readJson("./db/commitData.json"); // retrive data as object (key-value pair) from JSON file
		commitData.commit_no += 1; // set the changes to staging
		// commitData.abrupt_exit = !commitData.abrupt_exit; // set the changes to staging
		f.writeJson("./db/commitData.json", commitData); // commit changes to the JSON file --> then resolve the promise

		await SQLite3_DB.fromFileInsertEachRow(
			db,
			"../../canJump1 Leetcode - Copy.txt",
			"Sahil Dutta",
			commit_time,
			commit_date,
			commitData.commit_no,
			"My first commit"
		);

		await SQLite3_DB.writeFromTableToFile(db, "../../output.txt", "SELECT line_string FROM commit_log");

		await SQLite3_DB.deleteTable(db, "DROP TABLE commit_log");

		await SQLite3_DB.disconnect(db);

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

	const u_input3 = await user_input("Enter 3rd command: ");
	console.log("User input: ", u_input3);

	/* Program exit */
	process.stdin.destroy(); // destroying any open input stream to properly exit --> working
})();

/* *** End of main() function above *** */

function user_input(prompt?: string): Promise<string> {
	return new Promise((resolve) => {
		prompt && console.log(prompt);
		process.stdout.write("> ");

		const onData = (data: { toString: () => string }) => {
			const userInput = data.toString().trim();
			resolve(userInput);
			cleanup();
		};

		const cleanup = () => {
			process.stdin.off("data", onData); // off is used to remove the event listener for "data" once the input received, preventing potential memory leaks
			// stdin.destroy(); // do not close input stream else it will turn off core input stream including inputs for prompts/MCQs from inquirer.js
		};

		process.stdin.once("data", onData);
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

function sqlLocalTime() {
	return new Date().toLocaleTimeString("en-US", { hour12: false });
}

function sqlLocalDate() {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth() + 1;
	const date = now.getDate();

	return `${year}-${month.toString().padStart(2, "0")}-${date.toString().padStart(2, "0")}`;
}
