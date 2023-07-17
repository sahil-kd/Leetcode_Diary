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
import { createReadStream, createWriteStream } from "node:fs";
import { createInterface } from "node:readline";

console.log(` ${chalk.bold.underline.green("Leetcode version control")}\n`); // Main App Title

const filePath = "../../canJump1 Leetcode - Copy.txt";
const lineReader = createInterface({
	input: createReadStream(filePath, "utf8"),
	crlfDelay: Infinity, // To handle both Unix and Windows line endings
});

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

	// f.readFileLineByLine("../../canJump1 Leetcode - Copy.txt", (line) => {
	// 	console.log(line);
	// });

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

	const db = new sqlite3.Database("./db/test.db", (err) => {
		err && console.log(chalk.red("AppError: Could not connect to db --> " + err.message));
	}); // Establishing a connection between this node process and SQLite3 Database

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

		lineReader.on("line", (line) => {
			// Insert each line into the table
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
		});

		lineReader.on("close", () => {
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
				); // run a callback on each row of the table and a completed callback for cleanup

				db.run("DROP TABLE commit_log", (err) => {
					err && console.log(chalk.red("AppError: Table deletion error --> " + err.message));
				}); // delete the table named users

				db.close((err) => {
					err && console.log(chalk.red("AppError: db disconnection error --> " + err.message));
				}); // Close connection to the database
			});
		}); // if I make the lineReader "close" return a promise then I can get rid of a lot of nesting

		lineReader.on("error", (err) => {
			console.error("Error reading the file:", err);
		});

		// process.exit(); // simulating an abrupt app closure before db is gracefully disconnected, on executing this I observed both commit_log and temp table
		// do not exits when accessed through SQLite3 terminal session, maybe SQLite3 has an internal cleaning or commit system for resolving abrupt closures
		// since primary table also not retained hence need to store every 5-10 secs in %temp% dir with a condition if-abrupt closure occured, restore & auto-commit
		// on next startup with a commit msg "Auto-commited due to abrupt closure" | neither was the SELECT data displayed, weird
	}); // db.serialize() make the database process go step by step / synchronously

	/* Database exit point */
})();

/* *** End of main() function above *** */

function user_input(prompt: string) {
	return new Promise((resolve) => {
		console.log(prompt);

		const onData = (data: { toString: () => string }) => {
			const userInput = data.toString().trim();
			resolve(chalk.blue(userInput));
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

function insertEntry(db: sqlite3.Database, sqlquery: string, params?: any[]): void {
	db.run(sqlquery, params, (err) => {
		if (err) {
			console.error("row/entry insertion error --> " + err.message);
		}
	});
}
