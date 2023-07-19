import chalk from "chalk";
import * as f from "./modules/file_n_path_ops.js";
import sqlite3 from "sqlite3";
import { createReadStream, createWriteStream } from "node:fs";
import { createInterface } from "node:readline";
class SQLite3_DB {
    static connect(dbFilePath) {
        return new Promise((resolve) => {
            const db = new sqlite3.Database(dbFilePath, (err) => {
                if (err) {
                    console.error(chalk.red("AppError: Could not connect to db --> " + err.message));
                    resolve(undefined);
                }
                else {
                    resolve(db);
                }
            });
        });
    }
    static createTable(dbHandle, sqlQuery) {
        return new Promise((resolve) => {
            dbHandle.run(sqlQuery, (err) => {
                if (err) {
                    console.error(chalk.red("AppError: Table-creation Error --> " + err.message));
                    resolve();
                }
                else {
                    resolve();
                }
            });
        });
    }
    static createTempTable(dbHandle, sqlQuery) {
        return new Promise((resolve) => {
            dbHandle.run(sqlQuery, (err) => {
                if (err) {
                    console.error(chalk.red("AppError: Temp-table creation error --> " + err.message));
                    resolve();
                }
                else {
                    resolve();
                }
            });
        });
    }
    static fromFileInsertEachRow(dbHandle, inputFile, username, commit_time, commit_date, commit_no, commit_msg) {
        return new Promise((resolve) => {
            const lineReader = createInterface({
                input: createReadStream(inputFile, "utf8"),
                crlfDelay: Infinity,
            });
            let line_no = 0;
            lineReader.on("line", (line_string) => {
                dbHandle.serialize(() => {
                    line_no += 1;
                    dbHandle.run(`INSERT INTO commit_log (username, commit_time, commit_date, commit_no, line_no, line_string, commit_msg)
					VALUES (?, TIME(?), DATE(?), ?, ?, ?, ?)`, [username, commit_time, commit_date, commit_no, line_no, line_string, commit_msg], (err) => {
                        err && console.error(chalk.red("AppError: row/entry insertion error --> " + err.message));
                    });
                });
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
    static writeFromTableToFile(dbHandle, outFile, sqlQuery) {
        return new Promise((resolve) => {
            const fileWriteStream = createWriteStream(outFile);
            dbHandle.serialize(() => {
                dbHandle.each(sqlQuery, (err, row) => {
                    if (err) {
                        console.error(chalk.red("SQLite3_DB.writeFromTableToFile: Error retrieving row --> " + err.message));
                    }
                    else {
                        fileWriteStream.write(row.line_string + "\n", (writeErr) => {
                            if (writeErr) {
                                console.error(chalk.red("SQLite3_DB.writeFromTableToFile: Error writing to file --> " + writeErr.message));
                            }
                        });
                    }
                }, (completeErr, rowCount) => {
                    if (completeErr) {
                        console.error(chalk.red(`SQLite3_DB.writeFromTableToFile: Error completing query at ${rowCount} row count --> ` +
                            completeErr.message));
                    }
                    fileWriteStream.end(() => {
                        resolve();
                    });
                });
            });
        });
    }
    static deleteTable(dbHandle, sqlQuery) {
        return new Promise((resolve) => {
            dbHandle.run(sqlQuery, (err) => {
                if (err) {
                    console.error(chalk.red("AppError: Table deletion error --> " + err.message));
                    resolve();
                }
                else {
                    resolve();
                }
            });
        });
    }
    static disconnect(dbHandle) {
        return new Promise((resolve) => {
            dbHandle.close((err) => {
                if (err) {
                    console.error(chalk.red("AppError: db disconnection error --> " + err.message));
                    resolve();
                }
                else {
                    resolve();
                }
            });
        });
    }
}
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
    const db = await SQLite3_DB.connect("./db/test.db");
    const u_input = await user_input("\nEnter the command: ");
    console.log("User input: ", u_input);
    const u_input2 = await user_input("\nEnter another command: ");
    console.log("User input: ", u_input2);
    if (db) {
        await SQLite3_DB.createTable(db, `
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
		`);
        await SQLite3_DB.createTempTable(db, `
			CREATE TEMPORARY TABLE temp_file(
				line_no INTEGER,
				line_string TEXT
			)
		`);
        const commit_time = sqlLocalTime();
        const commit_date = sqlLocalDate();
        const commitData = f.readJson("./db/commitData.json");
        commitData.commit_no += 1;
        f.writeJson("./db/commitData.json", commitData);
        await SQLite3_DB.fromFileInsertEachRow(db, "../../canJump1 Leetcode - Copy.txt", "Sahil Dutta", commit_time, commit_date, commitData.commit_no, "My first commit");
        await SQLite3_DB.writeFromTableToFile(db, "../../output.txt", "SELECT line_string FROM commit_log");
        await SQLite3_DB.deleteTable(db, "DROP TABLE commit_log");
        await SQLite3_DB.disconnect(db);
    }
    const u_input3 = await user_input("Enter 3rd command: ");
    console.log("User input: ", u_input3);
    process.stdin.destroy();
})();
function user_input(prompt) {
    return new Promise((resolve) => {
        prompt && console.log(prompt);
        process.stdout.write("> ");
        const onData = (data) => {
            const userInput = data.toString().trim();
            resolve(userInput);
            cleanup();
        };
        const cleanup = () => {
            process.stdin.off("data", onData);
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
