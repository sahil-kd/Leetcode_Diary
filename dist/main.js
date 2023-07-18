import chalk from "chalk";
import { fromEvent, defer, EMPTY } from "rxjs";
import { mergeMap, tap, finalize, catchError } from "rxjs/operators";
import * as f from "./modules/file_n_path_ops.js";
import sqlite3 from "sqlite3";
import { createReadStream, createWriteStream } from "node:fs";
import { createInterface } from "readline";
import { stdin } from "node:process";
console.log(` ${chalk.bold.underline.green("Leetcode Diary")}\n`);
(async function main() {
    f.getMemoryLog();
    console.log(`> pwd is ${f.currentDir()}`);
    const programFilesPath = process.env.PROGRAMFILES;
    if (programFilesPath) {
        console.log("Program Files Path:", programFilesPath);
    }
    else {
        console.log("env variable couldn't be set up, alternative setups to be added later");
    }
    const appDataPath = process.env.APPDATA || f.joinPath(f.getUserHomeDirPath(), "AppData", "Roaming");
    const cachePath = process.env.LOCALAPPDATA || f.joinPath(f.getUserHomeDirPath(), "AppData", "Local");
    const tmpdirPath = f.getTempDirPath();
    if (appDataPath) {
        f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Local storage"));
        f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Session storage"));
        f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Network"));
        f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Local state"));
        f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Previous session logs"));
    }
    else {
        console.log("Setup failed at APPDATA, alternative ways to be added later");
    }
    if (cachePath) {
        f.createDir(f.joinPath(cachePath, "Leetcodeislife", "Current session state"));
        f.createDir(f.joinPath(cachePath, "Leetcodeislife", "User activity profile"));
        f.createDir(f.joinPath(cachePath, "Leetcodeislife", "Current session variables"));
        f.createDir(f.joinPath(cachePath, "Leetcodeislife", "Current session map"));
        f.createDir(f.joinPath(cachePath, "Leetcodeislife", "Previous session logs"));
    }
    else {
        console.log("Setup failed at LOCALAPPDATA, alternative ways to be added later");
    }
    f.createDir(f.joinPath(tmpdirPath, "leetcodeislife", "Current session storage", "log"));
    const currentDateTime = getLocalDateTime();
    console.log(currentDateTime);
    const lineReader = createInterface({
        input: createReadStream("../../canJump1 Leetcode - Copy.txt", "utf8"),
        crlfDelay: Infinity,
    });
    const makeAsyncVoid = (callback) => defer(() => {
        callback();
        return EMPTY;
    });
    const db = new sqlite3.Database("./db/test.db", (err) => {
        err && console.log(chalk.red("AppError: Could not connect to db --> " + err.message));
    });
    const lineObservable = fromEvent(lineReader, "line");
    db.serialize(() => {
        db.run(`
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
		`, (err) => {
            err && console.log(chalk.red("AppError: Table-creation Error --> " + err.message));
        });
        db.run(`
			CREATE TEMPORARY TABLE temp_file(
				line_no INTEGER,
				line_string TEXT
			)
		`, (err) => {
            err && console.log(chalk.red("AppError: Temp-table creation error --> " + err.message));
        });
    });
    lineObservable
        .pipe(mergeMap((line) => makeAsyncVoid(() => {
        db.serialize(() => {
            db.run(`INSERT INTO commit_log (username, commit_time, commit_date, commit_no, line_no, line_string, commit_msg)
							VALUES (?, TIME(?), DATE(?), ?, ?, ?, ?)`, ["Sahil Dutta", sqlLocalTime(), sqlLocalDate(), 1, 1, line, `Commit msg ${1}`], (err) => {
                err && console.log(chalk.red("AppError: row/entry insertion error --> " + err.message));
            });
        });
    })), tap((line) => {
        console.log("-" + line);
    }), finalize(() => {
        lineReader.close();
        db.serialize(() => {
            const commit_data = f.readJson("./db/commit_data.json");
            commit_data.commit_no += 1;
            f.writeJson("./db/commit_data.json", commit_data);
            const fileWriteStream = createWriteStream("../../output.txt");
            db.each("SELECT line_string FROM commit_log", (err, row) => {
                if (err) {
                    console.error("Error retrieving row:", err);
                }
                else {
                    fileWriteStream.write(row.line_string + "\n");
                }
            }, () => {
                fileWriteStream.end();
                console.log("\nLines written to file successfully.");
            });
            db.run("DROP TABLE commit_log", (err) => {
                err && console.log(chalk.red("AppError: Table deletion error --> " + err.message));
            });
            db.close((err) => {
                err && console.log(chalk.red("AppError: db disconnection error --> " + err.message));
            });
        });
    }), catchError((error) => {
        console.error("Error reading the file:", error);
        return EMPTY;
    }))
        .subscribe({
        next: (line) => {
        },
        error: (error) => {
            console.error("Subscription error:", error);
        },
        complete: () => {
            console.log("Subscription complete");
        },
    });
    stdin.destroy();
})();
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
