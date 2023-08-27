#!/usr/bin/env node
import chalk from "chalk";
import { exec, spawn, spawnSync } from "node:child_process";
import * as f from "./modules/file_n_path_ops.js";
import { SQLite3_DB } from "./modules/SQLite3_DB.js";
import { createWriteStream } from "node:fs";
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
    const commit_event = new SQLite3_DB.eventEmitter();
    listener.on("db event", (a, b) => console.log(`db event fired with args ${a} and ${b}`));
    const commitData = f.readJson("./db/commitData.json");
    const commit_profile = f.readJson("./db/commit_profile.json");
    const connection1 = await SQLite3_DB.connect("./db/test.db");
    const commit_log_cache = await connection1?.TABLE.CREATE_TABLE_IF_NOT_EXISTS("commit_log_cache", {
        commit_no: "INTEGER PRIMARY KEY",
        username: "TEXT NOT NULL",
        max_lines_in_commit: "INTEGER NOT NULL",
    });
    const tracking_file_address = "../../output.txt";
    commit_event.on("commit_event", async (commit_message) => {
        const commit_log = await connection1?.TABLE.CREATE_TABLE_IF_NOT_EXISTS("commit_log", {
            sl_no: "INTEGER PRIMARY KEY",
            commit_time: "TIME NOT NULL",
            commit_date: "DATE NOT NULL",
            commit_no: "INTEGER NOT NULL",
            line_no: "INTEGER NOT NULL",
            line_string: "TEXT NOT NULL",
            commit_msg: "TEXT DEFAULT NULL",
        });
        const pre_stage_comparer = await connection1?.TABLE.CREATE_TEMPORARY_TABLE("pre_stage_comparer", {
            id: "INTEGER PRIMARY KEY",
            line_no: "INTEGER NOT NULL",
            line_string: "TEXT NOT NULL",
        });
        let line_number = 0;
        const local_date = SQLite3_DB.localDate();
        const local_time = SQLite3_DB.localTime();
        await pre_stage_comparer?.fromFileInsertEachRow(tracking_file_address, (line) => {
            line_number += 1;
            pre_stage_comparer.insertRow({
                line_no: line_number,
                line_string: line,
            });
        });
        const prev_commit = await connection1?.TABLE.CREATE_TABLE_IF_NOT_EXISTS("prev_commit", {
            id: "INTEGER PRIMARY KEY",
            line_no: "INTEGER NOT NULL",
            line_string: "TEXT NOT NULL",
        });
        connection1?.dbHandler?.serialize(() => {
            connection1.dbHandler?.run("BEGIN TRANSACTION;", [], (err) => {
                if (!err) {
                    commitData.commit_no += 1;
                }
            });
            connection1.dbHandler?.run(`
				INSERT INTO commit_log_cache (commit_no, username, max_lines_in_commit)
				SELECT ?, ?, COALESCE((SELECT MAX(line_no) FROM pre_stage_comparer), 0);
				`, [commitData.commit_no, commit_profile.username]);
            connection1.dbHandler?.run(`
				INSERT INTO commit_log (commit_time, commit_date, commit_no, line_no, line_string, commit_msg)
				SELECT
					?,
					?,
					?,
					pre_stage_comparer.line_no,
					pre_stage_comparer.line_string,
					?
				FROM pre_stage_comparer
				LEFT JOIN prev_commit ON pre_stage_comparer.line_no = prev_commit.line_no
				WHERE pre_stage_comparer.line_string <> prev_commit.line_string
					OR prev_commit.line_string IS NULL
					OR pre_stage_comparer.line_no > COALESCE((SELECT MAX(line_no) FROM prev_commit), 0);
				`, [local_time, local_date, commitData.commit_no, commit_message]);
            connection1.dbHandler?.run(`
				DELETE FROM prev_commit;
			`);
            connection1.dbHandler?.run(`
				INSERT INTO prev_commit SELECT * FROM pre_stage_comparer;
			`);
            connection1.dbHandler?.run("COMMIT;", [], (err) => {
                if (err) {
                    console.error("Error committing transaction [commit_event error]:", err.message);
                    commitData.commit_no -= 1;
                }
                else {
                    f.writeJson("./db/commitData.json", commitData);
                }
            });
        });
        pre_stage_comparer?.deleteTable();
    });
    const reset_event = new SQLite3_DB.eventEmitter();
    reset_event.on("reset_event", async (commit_no) => {
        connection1?.dbHandler && reset_wrapper(connection1.dbHandler, commit_no);
    });
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
        else if (command == "c") {
            commit_event.emit("commit_event", ...(parsed_input.args.length > 0 ? parsed_input.args : [null]));
            continue;
        }
        else if (command === "reset") {
            if (!parsed_input.args[0]) {
                console.error(chalk.red("reset command takes in one parameter | reset n | where n refers to the nth commit"));
            }
            else if (parseInt(parsed_input.args[0]) > 0 && parseInt(parsed_input.args[0]) < commitData.commit_no) {
                reset_event.emit("reset_event", parsed_input.args[0]);
            }
            else if (!(parseInt(parsed_input.args[0]) > 0 && parseInt(parsed_input.args[0]) < commitData.commit_no)) {
                console.error(chalk.red("reset index out of bounds | type --> reset n | n must refer to some pre-existing nth commit"));
            }
            else {
                console.error(chalk.red("reset: unknown error"));
            }
            continue;
        }
        else if (command === "exit" || command === "q") {
            listener.removeAllListeners("db event");
            commit_event.removeAllListeners("commit_event");
            reset_event.removeAllListeners("reset_event");
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
async function simulate_awaited_promise(time_milliseconds) {
    await (() => {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(chalk.greenBright(`\n${time_milliseconds} milliseconds period over\n`));
                resolve();
            }, 2000);
        });
    })();
}
function reset_wrapper(db, commit_no) {
    if (commit_no <= 0)
        return;
    const original_commit_no = commit_no;
    let max_line_no = 0;
    db.get(`SELECT max_lines_in_commit FROM commit_log_cache WHERE commit_no = ? LIMIT 1`, [commit_no], (err, row) => {
        if (err) {
            console.error("wrapper stage 1 error: ", err.message);
        }
        else if (row) {
            max_line_no = row.max_lines_in_commit;
            performQuery(db, commit_no);
        }
    });
    const writeStream = createWriteStream("../../output.txt");
    let max_depth = 10000;
    function performQuery(db, commit_no, line_no = 1) {
        db.get("SELECT line_string FROM commit_log WHERE line_no = ? AND commit_no = ? LIMIT 1", [line_no, commit_no], (err, row) => {
            if (err) {
                console.error("wrapper stage 2 error: ", err.message);
                return;
            }
            if (max_depth >= 0) {
                if (line_no <= max_line_no) {
                    if (row) {
                        writeStream.write(row.line_string + "\n", (err) => {
                            err && console.error(chalk.redBright("reset error: ", err.message));
                        });
                        line_no++;
                        commit_no = original_commit_no;
                        performQuery(db, commit_no, line_no);
                    }
                    else if (!row) {
                        if (commit_no > 0) {
                            commit_no--;
                            performQuery(db, commit_no, line_no);
                        }
                        else if (commit_no <= 0) {
                            commit_no = original_commit_no;
                            line_no++;
                            performQuery(db, commit_no, line_no);
                        }
                    }
                }
                else {
                    writeStream.end();
                }
            }
            else {
                writeStream.end(() => {
                    console.log("write interrupted by max_depth for security reasons");
                    process.stdout.write(">> ");
                });
            }
            max_depth--;
        });
    }
}
