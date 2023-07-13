import chalk from "chalk";
import * as f from "./modules/file_n_path_ops.js";
import sqlite3 from "sqlite3";
console.log(` ${chalk.bold.underline.green("Leetcode version control")}\n`);
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
    const db = new sqlite3.Database("./db/test.db", (err) => {
        if (err) {
            console.error("db connection error --> " + err.message);
        }
        else {
            console.log("Database connected");
        }
    });
    db.serialize(() => {
        db.run(`
		CREATE TABLE IF NOT EXISTS commit_log (
			sl_no INTEGER PRIMARY KEY AUTOINCREMENT,
			username TEXT,
			commit_time TIME,
			commit_date DATE
		)
		`, (err) => {
            if (err) {
                console.error("table-creation error --> " + err.message);
            }
            else {
                console.log("Table created successfully");
            }
        });
        db.run("INSERT INTO commit_log (username, commit_time, commit_date) VALUES (?, TIME(?), DATE(?))", ["Sahil Dutta", sqlLocalTime(), sqlLocalDate()], (err) => {
            if (err) {
                console.error("row/entry insertion error --> " + err.message);
            }
            else {
                console.log("Inserted an entry/row");
            }
        });
        db.all("SELECT * FROM commit_log WHERE commit_time > TIME('00:00:00')", (err, rows) => {
            if (err) {
                console.error("table output error --> ", err.message);
            }
            else {
                rows.length == 0
                    ? console.log("No records found")
                    : rows.forEach((entry) => {
                        console.log(entry);
                        console.log(`Commit-log ${entry.sl_no} --> Username: ${entry.username} | Date: ${entry.commit_date} | Time: ${entry.commit_time}`);
                    });
            }
        });
        db.run("DROP TABLE commit_log", (err) => {
            if (err) {
                console.error("table del error --> " + err.message);
            }
            else {
                console.log("Table successfully deleted");
            }
        });
        db.close((err) => {
            if (err) {
                console.error("db exit error --> " + err.message);
            }
            else {
                console.log("Connection to database closed successfully");
            }
        });
    });
})();
function user_input(prompt) {
    return new Promise((resolve) => {
        console.log(prompt);
        const onData = (data) => {
            const userInput = data.toString().trim();
            resolve(chalk.blue(userInput));
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
function insertEntry(db, sqlquery, params) {
    db.run(sqlquery, params, (err) => {
        if (err) {
            console.error("row/entry insertion error --> " + err.message);
        }
    });
}
