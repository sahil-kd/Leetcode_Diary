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

console.log(` ${chalk.bold.underline.green("Leetcode version control")}\n`); // Main App Title

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
	} // Type of row / entry into the table --> each attr is a column

	const db = new sqlite3.Database("./db/test.db", (err) => {
		if (err) {
			console.error("db connection error --> " + err.message);
		} else {
			console.log("Database connected");
		}
	}); // Establishing a connection between this node process and SQLite3 Database

	db.serialize(() => {
		db.run(
			`
		CREATE TABLE IF NOT EXISTS commit_log (
			sl_no INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT,
			commit_time TIME,
			commit_date DATE
		)
		`,
			(err) => {
				if (err) {
					console.error("table-creation error --> " + err.message);
				} else {
					console.log("Table created successfully");
				}
			}
		); // Creation of a table (mini-database)

		db.run(
			"INSERT INTO commit_log (username, commit_time, commit_date) VALUES (?, TIME(?), DATE(?))",
			["Sahil Dutta", sqlLocalTime(), sqlLocalDate()],
			(err) => {
				if (err) {
					console.error("row/entry insertion error --> " + err.message);
				} else {
					console.log("Inserted an entry/row");
				}
			}
		); // Insert a row/entry into the table/database

		db.all("SELECT * FROM commit_log WHERE commit_time > TIME('00:00:00')", (err, rows: userCommitLogEntry[]) => {
			if (err) {
				console.error("table output error --> ", err.message);
			} else {
				rows.length == 0
					? console.log("No records found")
					: rows.forEach((entry) => {
							console.log(entry);
							console.log(
								`Commit-log ${entry.sl_no} --> Username: ${entry.username} | Date: ${entry.commit_date} | Time: ${entry.commit_time}`
							);
					  });
			}
		}); // Display entire table or list of sorted/filtered rows

		db.run("DROP TABLE commit_log", (err) => {
			if (err) {
				console.error("table del error --> " + err.message);
			} else {
				console.log("Table successfully deleted");
			}
		}); // delete the table named users

		db.close((err) => {
			if (err) {
				console.error("db exit error --> " + err.message);
			} else {
				console.log("Connection to database closed successfully");
			}
		}); // Close connection to the database
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
