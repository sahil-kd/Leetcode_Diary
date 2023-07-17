import { join, extname, dirname } from "node:path";
import { realpathSync, access, constants, readdir, stat, writeFile, mkdir, createReadStream, writeFileSync, readFileSync, } from "node:fs";
import { freemem, totalmem, homedir, tmpdir } from "node:os";
import { createInterface } from "node:readline";
export function getMemoryLog(getLog = true) {
    const node_free_mem = parseFloat(String(freemem()));
    const node_total_mem = parseFloat(String(totalmem()));
    if (getLog) {
        console.log("Free memory available for node processes: ", `${(node_free_mem * Math.pow(10, -3)).toLocaleString("en-US", {
            maximumFractionDigits: 2,
        })} KB`, `(${((node_free_mem / node_total_mem) * 100).toFixed(2)}% available)`);
    }
    return {
        free_memory_bytes: node_free_mem,
        free_memory_percent: (node_free_mem / node_total_mem) * 100,
    };
}
export function getUserHomeDirPath() {
    return homedir();
}
export function getDesktopDirPath() {
    return join(homedir(), "Desktop");
}
export function getTempDirPath() {
    return tmpdir();
}
export function currentDir() {
    return realpathSync(".");
}
export function getFileExtension(filePath) {
    return extname(filePath);
}
export function pathExists(path) {
    return new Promise((resolve) => {
        access(path, constants.F_OK, (err) => {
            if (err) {
                resolve(false);
            }
            else {
                resolve(true);
            }
        });
    });
}
export function searchFileExists(targetFileName, directoryPath) {
    return new Promise((resolve, reject) => {
        readdir(directoryPath, (err, files) => {
            if (err) {
                reject("searchFileExists error --> " + err.message);
                return;
            }
            const filePath = files.find((file) => file === targetFileName);
            const result = filePath !== undefined;
            resolve(result);
        });
    });
}
export function searchDirExists(targetDirectoryName, parentDirectoryPath) {
    return new Promise((resolve, reject) => {
        readdir(parentDirectoryPath, (err, files) => {
            if (err) {
                reject("searchDirExists error --> " + err.message);
                return;
            }
            const exists = files.some((file) => file === targetDirectoryName);
            resolve(exists);
        });
    });
}
export function isTargetFileOrDir(path) {
    return new Promise((resolve, reject) => {
        stat(path, (err, stats) => {
            if (err) {
                reject("isTargetFileOrDir --> " + err.message);
                return;
            }
            if (stats.isDirectory()) {
                resolve("dir");
            }
            else if (stats.isFile()) {
                resolve("file");
            }
            else {
                resolve("none");
            }
        });
    });
}
export function createFile(path) {
    return new Promise((resolve, reject) => {
        mkdir(dirname(path), { recursive: true }, (err) => {
            if (err) {
                reject("mkdir error --> " + err.message);
                return;
            }
            writeFile(path, "", (err) => {
                if (err) {
                    reject("createFile --> " + err.message);
                    return;
                }
                resolve(true);
            });
        });
    });
}
export function createDir(path) {
    return new Promise((resolve, reject) => {
        mkdir(path, { recursive: true }, (err) => {
            if (err) {
                reject("createDir --> " + err.message);
                return;
            }
            resolve(true);
        });
    });
}
export function joinPath(parentpath, ...childpath) {
    return join(parentpath, ...childpath);
}
export function readFileLineByLine(filePath, processEachLineCallback) {
    const fileStream = createReadStream(filePath, "utf-8");
    const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });
    rl.on("line", processEachLineCallback);
    rl.on("close", () => {
    });
}
export function readJson(filename) {
    const data = readFileSync(filename, "utf8");
    return JSON.parse(data);
}
export function writeJson(filename, data) {
    const jsonData = JSON.stringify(data, null, 2);
    writeFileSync(filename, jsonData, "utf8");
}
