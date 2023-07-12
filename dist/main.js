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
    const currentDateTime = getCurrentDateTime();
    console.log(currentDateTime);
    const db = new sqlite3.Database("./db/test.db", (err) => {
        if (err) {
            console.error(err.message);
        }
        else {
            console.log("Database connected");
        }
    });
    db.run(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT,
			age INTEGER
		)
	`, (err) => {
        if (err) {
            console.error(err.message);
        }
        else {
            console.log("Table created successfully");
        }
    });
    db.run(`
		INSERT INTO users (name, age) VALUES (?, ?)
	`, ["Sahil Dutta", 23], (err) => {
        if (err) {
            console.error(err.message);
        }
        else {
            console.log("Inserted an entry/row");
        }
    });
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        else {
            console.log("Connection to database closed successfully");
        }
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
function getCurrentDateTime() {
    const now = new Date();
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return {
        time12hformat: now.toLocaleTimeString(),
        time24hformat: now.toLocaleTimeString("en-US", { hour12: false }),
        fulldate: now.toLocaleDateString(),
        dayOfWeek: daysOfWeek[now.getDay()],
    };
}
