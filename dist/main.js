#!/usr/bin/env node
import chalk from "chalk";
import { exec, spawn, spawnSync } from "node:child_process";
import * as f from "./modules/file_n_path_ops.js";
import sqlite3 from "sqlite3";
import { createReadStream, createWriteStream } from "node:fs";
import { createInterface } from "node:readline";
import { EventEmitter } from "node:events";
class CREATE_TABLE_IF_NOT_EXIST {
    constructor(dbHandle, tablename, shape) {
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
            dbHandle.run(this.sqlQuery, (err) => {
                if (err) {
                    console.error(chalk.red("AppError: Table-creation Error --> " + err.message));
                }
            });
        });
    }
    method(o) {
        console.log(o);
    }
    insertRow(log) {
        this.dbHandle?.serialize(() => {
            this.dbHandle.run(`INSERT INTO commit_log (username, commit_time, commit_date, commit_no, line_no, line_string, commit_msg)
					VALUES (?, TIME(?), DATE(?), ?, ?, ?, ?)`, this.objectToArray(log), (err) => {
                err && console.error(chalk.red("AppError: row/entry insertion error --> " + err.message));
            });
        });
    }
    removeTrailingCommas(inputString) {
        const cleanedString = inputString.replace(/[, \n]+$/, "");
        return cleanedString;
    }
    objectToArray(obj) {
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
        dbHandle?.serialize(() => {
            dbHandle.run(sqlQuery, (err) => {
                if (err) {
                    console.error(chalk.red("AppError: Table-creation Error --> " + err.message));
                }
            });
        });
    }
    static createTempTable(dbHandle, sqlQuery) {
        dbHandle?.serialize(() => {
            dbHandle.run(sqlQuery, (err) => {
                if (err) {
                    console.error(chalk.red("AppError: Temp-table creation error --> " + err.message));
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
        dbHandle?.serialize(() => {
            dbHandle.run(sqlQuery, (err) => {
                if (err) {
                    console.error(chalk.red("AppError: Table deletion error --> " + err.message));
                }
            });
        });
    }
    static disconnect(dbHandle) {
        dbHandle?.serialize(() => {
            dbHandle.close((err) => {
                if (err) {
                    console.error(chalk.red("AppError: db disconnection error --> " + err.message));
                }
            });
        });
    }
    static insertRow(dbHandle, log) {
        dbHandle?.serialize(() => {
            dbHandle.run(`INSERT INTO commit_log (username, commit_time, commit_date, commit_no, line_no, line_string, commit_msg)
					VALUES (?, TIME(?), DATE(?), ?, ?, ?, ?)`, SQLite3_DB.objectToArray(log), (err) => {
                err && console.error(chalk.red("AppError: row/entry insertion error --> " + err.message));
            });
        });
    }
    static eventEmitter = class extends EventEmitter {
        constructor() {
            super();
        }
    };
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
    static objectToArray(obj) {
        return Object.keys(obj).map((key) => obj[key]);
    }
}
(async function main() {
    console.log(` ${chalk.bold.underline.green("\nLeetcode Diary")}\n`);
    console.log(chalk.hex("#9C33FF")("h --> help"));
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
    const listener = new SQLite3_DB.eventEmitter();
    listener.on("db event", (a, b) => console.log(`db event fired with args ${a} and ${b}`));
    const da = undefined;
    SQLite3_DB.createTable(da, `
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
    const db = undefined;
    if (db) {
        SQLite3_DB.createTable(db, `
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
        SQLite3_DB.createTempTable(db, `
			CREATE TEMPORARY TABLE temp_file(
				line_no INTEGER,
				line_string TEXT
			)
		`);
        const commit_time = SQLite3_DB.localTime();
        const commit_date = SQLite3_DB.localDate();
        const commitData = f.readJson("./db/commitData.json");
        commitData.commit_no += 1;
        f.writeJson("./db/commitData.json", commitData);
        await SQLite3_DB.fromFileInsertEachRow(db, "../../optimizedsumofprimes.cpp", "Sahil Dutta", commit_time, commit_date, commitData.commit_no, "My first commit");
        await SQLite3_DB.writeFromTableToFile(db, "../../output.txt", "SELECT line_string FROM commit_log");
        SQLite3_DB.disconnect(db);
    }
    while (true) {
        process.stdout.write("\n");
        process.stdout.write(chalk.cyanBright("Leetcode Diary") + chalk.yellow(" --> ") + chalk.yellow(process.cwd()));
        process.stdout.write("\n");
        const child_terminal_input = await user_input();
        const parsed_input = parse_command(child_terminal_input);
        const command = parsed_input.command;
        if (!command) {
            console.error(chalk.red("No command entered | Type h to view the list of all in-app commands"));
            continue;
        }
        else if (command === "fire") {
            const default_args = ["default1", "default2"];
            listener.emit("db event", ...(parsed_input.args.length > 0 ? parsed_input.args : default_args));
            continue;
        }
        else if (command === "exit" || command === "q") {
            listener.removeAllListeners("db event");
            break;
        }
        else if (command === "pwd") {
            console.log(chalk.cyanBright(process.cwd()));
            continue;
        }
        if (command === "h") {
            if (parsed_input.args.length != 0) {
                console.error(chalk.red("Incorrect usage | Type h for help menu"));
                continue;
            }
            console.log(chalk.cyanBright("List of commands: \n"));
            console.log(chalk.cyanBright("  build --> builds the executable for a .cpp file that you can execute later using run command"));
            console.log(chalk.cyanBright("            build filename.cpp "));
            console.log(chalk.cyanBright("  run   --> builds and runs the executable for .cpp file | run filename.cpp"));
            console.log(chalk.redBright("          **Don't run the .exe file directly by typing filename.exe, it won't work as expected"));
            console.log(chalk.redBright("            instead use the run command above"));
            console.log(chalk.cyanBright("  cd    --> change directory | advisable to wrap the path in single-quotes '...'"));
            console.log("----------------------------------------------------------------------------------------------");
            console.log(chalk.cyanBright("  q | exit  --> exits the app | recommended way"));
            console.log(chalk.redBright("     **Basic commands of default terminals valid here too"));
            continue;
        }
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
                }
                else if (targetDirectory == "-") {
                    console.error(chalk.red("Directory quick switch currently unsupported"));
                    continue;
                }
                process.chdir(targetDirectory);
            }
            catch (error) {
                const errorString = error.message;
                try {
                    const [, errorMessage, _fromDirectory, _toDirectory] = errorString.match(/ENOENT: (.*), chdir '(.*?)' -> '(.*?)'/);
                    console.error(chalk.red(errorMessage));
                    console.error(chalk.red("Tip: use single-quotes to wrap the path containing spaces | cd 'path/to/file name.ext'"));
                }
                catch (err) {
                    if (err)
                        console.error(chalk.red(errorString));
                }
            }
        }
        else if (command == "build") {
            if (parsed_input.args.length == 0) {
                console.error(chalk.red("No path provided | To resolve enter the cpp file path --> build path/to/filename.cpp"));
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
        }
        else if (command == "run") {
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
            child3.stdout.on("data", (data) => {
                process.stdout.write(data.toString());
            });
            child3.stderr.on("data", (data) => {
                process.stderr.write(chalk.redBright("\nError: " + data.toString()));
            });
            let term_open = true;
            child3.on("close", (code) => {
                process.stdout.write(`\nProcess exited with code ${code}, press any key to continue`);
                term_open = false;
            });
            while (term_open) {
                const inp = await user_input("", false);
                child3.stdin.write(inp + "\n");
            }
        }
        else {
            const child = spawnSync(command, parsed_input.args, { stdio: "pipe" });
            const stdout = child.stdout ? child.stdout.toString() : "";
            const stderr = child.stderr ? child.stderr.toString() : "";
            process.stdout.write(chalk.cyanBright(stdout) || chalk.red(stderr));
            if (child.error) {
                if (child.error.message.includes("spawnSync") && child.error.message.includes("ENOENT")) {
                    const child_powershell = spawnSync(command, parsed_input.args, { stdio: "pipe", shell: "powershell.exe" });
                    const stdout = child_powershell.stdout ? child_powershell.stdout.toString().trim() : "";
                    const stderr = child_powershell.stderr ? child_powershell.stderr.toString().trim() : "";
                    process.stdout.write("\n");
                    process.stdout.write(chalk.cyanBright(stdout) || chalk.red(stderr));
                    process.stdout.write("\n");
                    stderr != "" && console.error("\n" + chalk.red(`${command}: unrecognised command | Type h for help`));
                }
                else {
                    console.error(chalk.red("Error:", child.error.message));
                }
            }
        }
    }
})();
function user_input(prompt, input_guide = true) {
    return new Promise((resolve) => {
        prompt && process.stdout.write(prompt);
        input_guide && process.stdout.write(">> ");
        const onData = (data) => {
            const userInput = data.toString().trim();
            resolve(userInput);
            cleanup();
        };
        const cleanup = () => {
            process.stdin.removeListener("data", onData);
            process.stdin.pause();
        };
        const resumeAndAddListener = () => {
            process.stdin.resume();
            process.stdin.once("data", onData);
        };
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
async function listItemsInDirectory(directory_path) {
    try {
        const items = await (function (command) {
            return new Promise((resolve, reject) => {
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(stdout.trim().split("\n") || stderr);
                    }
                });
            });
        })(`ls "${directory_path}"`);
        return items.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    }
    catch (error) {
        console.error("Error listing items:", error.message);
        return [];
    }
}
async function changeDirectory(path) {
    try {
        await (function (command) {
            return new Promise((resolve, reject) => {
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(stdout || stderr);
                    }
                });
            });
        })(`cd "${path}"`);
    }
    catch (error) {
        console.error("Error changing directory:", error.message);
    }
}
async function printWorkingDirectory() {
    try {
        const currentDirectory = await (function (command) {
            return new Promise((resolve, reject) => {
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(stdout.trim() || stderr);
                    }
                });
            });
        })("pwd");
        return currentDirectory;
    }
    catch (error) {
        console.error("Error getting current working directory:", error.message);
        return null;
    }
}
function parse_command(str) {
    const arr = [];
    let i = 0;
    while (i < str.length) {
        if (str[i] === '"') {
            i++;
            const endIndex = str.indexOf('"', i);
            if (endIndex !== -1) {
                arr.push(str.substring(i, endIndex));
                i = endIndex + 1;
            }
        }
        else if (str[i] === "'") {
            i++;
            const endIndex = str.indexOf("'", i);
            if (endIndex !== -1) {
                arr.push(str.substring(i, endIndex));
                i = endIndex + 1;
            }
        }
        else if (str[i] !== " ") {
            let puff = "";
            while (i < str.length && str[i] !== " " && str[i] !== '"') {
                puff += str[i];
                i++;
            }
            arr.push(puff);
        }
        else {
            i++;
        }
    }
    const command = arr.shift();
    return {
        command: command,
        args: arr,
    };
}
