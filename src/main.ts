import chalk from "chalk";
import { fromEvent, defer, EMPTY } from "rxjs";
import { mergeMap, tap, finalize, catchError } from "rxjs/operators";
import * as f from "./modules/file_n_path_ops.js";
import sqlite3 from "sqlite3";
import { createReadStream, createWriteStream } from "node:fs";
import { createInterface } from "readline";
import { stdin } from "node:process";

console.log(` ${chalk.bold.underline.green("Leetcode version control")}\n`); // Main App Title

/* *** main() function below *** */

(async function main() {
	f.getMemoryLog();
	console.log(`> pwd is ${f.currentDir()}`);

	/* Setup process */

	const programFilesPath = process.env.PROGRAMFILES;
	if (programFilesPath) {
		console.log("Program Files Path:", programFilesPath);
	} else {
		console.log("env variable couldn't be set up, alternative setups to be added later");
	}

	const appDataPath = process.env.APPDATA || f.joinPath(f.getUserHomeDirPath(), "AppData", "Roaming"); // %APPDATA% --> user data
	const cachePath = process.env.LOCALAPPDATA || f.joinPath(f.getUserHomeDirPath(), "AppData", "Local"); // %LOCALAPPDATA% --> session cache & autocomplete
	const tmpdirPath = f.getTempDirPath();

	if (appDataPath) {
		f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Local storage"));
		f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Session storage"));
		f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Network"));
		f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Local state"));
		f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Previous session logs"));
	} else {
		console.log("Setup failed at APPDATA, alternative ways to be added later");
	}

	if (cachePath) {
		f.createDir(f.joinPath(cachePath, "Leetcodeislife", "Current session state"));
		f.createDir(f.joinPath(cachePath, "Leetcodeislife", "User activity profile"));
		f.createDir(f.joinPath(cachePath, "Leetcodeislife", "Current session variables"));
		f.createDir(f.joinPath(cachePath, "Leetcodeislife", "Current session map"));
		f.createDir(f.joinPath(cachePath, "Leetcodeislife", "Previous session logs"));
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

	const lineReader = createInterface({
		input: createReadStream("../../canJump1 Leetcode - Copy.txt", "utf8"),
		crlfDelay: Infinity, // To handle both Unix and Windows line endings
	});

	const makeAsyncVoid = (callback: () => void) =>
		defer(() => {
			callback();
			return EMPTY;
		});

	const db = new sqlite3.Database("./db/test.db", (err) => {
		err && console.log(chalk.red("AppError: Could not connect to db --> " + err.message));
	}); // Establishing a connection between this node process and SQLite3 Database

	// const dbPromise = defer(
	// 	() =>
	// 		new Promise((resolve) => {
	// 			resolve(db);
	// 		})
	// );

	const lineObservable = fromEvent(lineReader, "line");

	db.serialize(() => {
		db.run(
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
		`,
			(err) => {
				err && console.log(chalk.red("AppError: Table-creation Error --> " + err.message));
			}
		); // Creation of a table (mini-database)

		db.run(
			`
			CREATE TEMPORARY TABLE temp_file(
				line_no INTEGER,
				line_string TEXT
			)
		`,
			(err) => {
				err && console.log(chalk.red("AppError: Temp-table creation error --> " + err.message));
			}
		);
	});

	// A lot of deprecated stuff in RxJS, have to look into this later

	lineObservable
		.pipe(
			mergeMap((line) =>
				makeAsyncVoid(() => {
					// Perform database operations or other async tasks
					// Reading lines from .txt file and inserting them into table
					db.serialize(() => {
						db.run(
							`INSERT INTO commit_log (username, commit_time, commit_date, commit_no, line_no, line_string, commit_msg)
							VALUES (?, TIME(?), DATE(?), ?, ?, ?, ?)`,
							["Sahil Dutta", sqlLocalTime(), sqlLocalDate(), 1, 1, line, `Commit msg ${1}`],
							(err) => {
								err && console.log(chalk.red("AppError: row/entry insertion error --> " + err.message));
							}
						);
					});
				})
			),
			tap((line) => {
				// Additional processing for each line
				// ...
				console.log("-" + line);
			}),
			finalize(() => {
				lineReader.close();

				db.serialize(() => {
					// // eg: SELECT * FROM commit_log WHERE commit_time > TIME('00:00:00')
					// db.all("SELECT * FROM commit_log", (err, rows: userCommitLogEntry[]) => {
					// 	if (err) {
					// 		console.log(chalk.red("AppError: Table output error --> --> " + err.message));
					// 	} else {
					// 		rows.length == 0
					// 			? console.log("No records found")
					// 			: rows.forEach((entry) => {
					// 					console.log(entry);
					// 					// console.log(
					// 					// 	`Commit-log ${entry.sl_no} --> Username: ${entry.username} | Date: ${entry.commit_date} | Time: ${entry.commit_time}`
					// 					// );
					// 			  });
					// 	} // **REMINDER: to replace forEach with for-loop cause the later is faster than the former as the iternation becomes larger
					// }); // Get/Fetch data from table (db) and display entire table or list of sorted/filtered rows

					const commit_data = f.readJson("./db/commit_data.json"); // retrive data as object (key-value pair) from JSON file
					commit_data.commit_no += 1; // set the changes to staging
					// commit_data.abrupt_exit = !commit_data.abrupt_exit; // set the changes to staging
					f.writeJson("./db/commit_data.json", commit_data); // commit changes to the JSON file

					// const fileWriteStream = createWriteStream("../../output.txt", { flags: "a" }); // append the output file with flag 'a'
					const fileWriteStream = createWriteStream("../../output.txt"); // overwrite the output file

					db.each(
						"SELECT line_string FROM commit_log",
						(err, row: { line_string: string }) => {
							if (err) {
								console.error("Error retrieving row:", err);
							} else {
								fileWriteStream.write(row.line_string + "\n");
								// console.log(row.line_string);
							}
						},
						() => {
							fileWriteStream.end();
							console.log("\nLines written to file successfully.");
						}
					); // run a callback on selected columns of each row of the table and a completed callback for cleanup

					db.run("DROP TABLE commit_log", (err) => {
						err && console.log(chalk.red("AppError: Table deletion error --> " + err.message));
					}); // delete the table named users

					db.close((err) => {
						err && console.log(chalk.red("AppError: db disconnection error --> " + err.message));
					}); // Close connection to the database
				});

				// dbPromise
				// 	.pipe(
				// 		mergeMap((db) =>
				// 			makeAsyncVoid(() => {
				// 				// Clean up and finalize database operations
				// 				db.serialize()
				// 			})
				// 		),
				// 		catchError((error) => {
				// 			console.error("Database cleanup error:", error);
				// 			return EMPTY;
				// 		})
				// 	)
				// 	.subscribe();
			}),
			catchError((error) => {
				console.error("Error reading the file:", error);
				return EMPTY;
			})
		)
		.subscribe({
			next: (line) => {
				// Handle each line emitted
				// ...
			},
			error: (error) => {
				console.error("Subscription error:", error);
			},
			complete: () => {
				console.log("Subscription complete");
			},
		});

	/* Program exit */
	stdin.destroy(); // closing any open input stream to properly exit --> working
})();

/* *** End of main() function above *** */

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
