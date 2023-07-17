import { join, extname, dirname } from "node:path";
import {
	realpathSync,
	access,
	constants,
	readdir,
	stat,
	writeFile,
	mkdir,
	createReadStream,
	writeFileSync,
	readFileSync,
} from "node:fs";
import { freemem, totalmem, homedir, tmpdir } from "node:os";
import { createInterface } from "node:readline";

// fs.opendir();
// path.dirname("C:\\Users\\dell\\Desktop\\CSS experiments\\Ignored file.txt") --> Parent dir path = C:\\Users\\dell\\Desktop\\CSS experiments
// path.basename("C:\\Users\\dell\\Desktop\\CSS experiments\\Ignored file.txt") --> Ignored fileURLToPath.txt
// Operating system type --> os.type() returns Linux - Linux | MacOS - Darwin | Windows - Windows_NT
// console.log(
// 	"An estimate of the default amount of parallelism a program should use: ",
// 	os.availableParallelism()
// ); // outputs 4

/* Section: Memory stats section */

export function getMemoryLog(getLog: boolean = true) {
	const node_free_mem = parseFloat(String(freemem())); // free memory available to node processes (in bytes)
	const node_total_mem = parseFloat(String(totalmem())); // free memory available to node processes (in bytes)

	if (getLog) {
		console.log(
			"Free memory available for node processes: ",
			`${(node_free_mem * Math.pow(10, -3)).toLocaleString("en-US", {
				maximumFractionDigits: 2,
			})} KB`,
			`(${((node_free_mem / node_total_mem) * 100).toFixed(2)}% available)`
		);
	}

	return {
		free_memory_bytes: node_free_mem,
		free_memory_percent: (node_free_mem / node_total_mem) * 100,
	};
} // Free memory varies with time even when static --> from "os"

/* Section: Major directory paths section */

export function getUserHomeDirPath(): string {
	return homedir();
} // --> from "os" & "path"

export function getDesktopDirPath(): string {
	return join(homedir(), "Desktop");
} // --> from "os" & "path"

export function getTempDirPath(): string {
	return tmpdir();
} // %temp% dir path --> from "os"

export function currentDir(): string {
	return realpathSync(".");
} // current directory path --> from "fs"

export function getFileExtension(filePath: string): string {
	return extname(filePath);
} // --> from "path"

/* Section: Path existence & file/folder search operations */

export function pathExists(path: string): Promise<boolean> {
	return new Promise((resolve) => {
		access(path, constants.F_OK, (err) => {
			if (err) {
				resolve(false); // Path does not exist
			} else {
				resolve(true); // Path exists
			}
		});
	});
} // --> from "fs"

export function searchFileExists(targetFileName: string, directoryPath: string): Promise<boolean> {
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
} // --> from "fs"

export function searchDirExists(targetDirectoryName: string, parentDirectoryPath: string): Promise<boolean> {
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
} // --> from "fs"

/* Section: File or folder identification */

export function isTargetFileOrDir(path: string): Promise<string> {
	return new Promise((resolve, reject) => {
		stat(path, (err, stats) => {
			if (err) {
				reject("isTargetFileOrDir --> " + err.message);
				return;
			}
			if (stats.isDirectory()) {
				resolve("dir");
			} else if (stats.isFile()) {
				resolve("file");
			} else {
				resolve("none");
			}
		});
	});
} // --> from "fs"

/* Section: File or folder creation process */

export function createFile(path: string): Promise<boolean> {
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
				resolve(true); // file successfully created
			});
		});
	});
} // path = path/to/new/file.txt --> from "fs"

export function createDir(path: string): Promise<boolean> {
	return new Promise((resolve, reject) => {
		mkdir(path, { recursive: true }, (err) => {
			if (err) {
				reject("createDir --> " + err.message);
				return;
			}
			resolve(true);
		});
	});
} // path = path/to/new/directory --> from "fs"

/* Section: Path operations */

export function joinPath(parentpath: string, ...childpath: string[]) {
	return join(parentpath, ...childpath);
}

export function readFileLineByLine(filePath: string, processEachLineCallback: (line: string) => void) {
	// Create a readable stream to read the file
	const fileStream = createReadStream(filePath, "utf-8");

	// Create a readline interface
	const rl = createInterface({
		input: fileStream,
		crlfDelay: Infinity, // To handle both Unix and Windows line endings
	});

	// Read the file line by line
	rl.on("line", processEachLineCallback);

	// Close the readline interface and the file stream after reading
	rl.on("close", () => {
		// console.log("File reading completed.");
	});
}

/* Section: JSON file read-write operations */

// Read JSON data from file.json
export function readJson(filename: string): any {
	const data = readFileSync(filename, "utf8");
	return JSON.parse(data);
}

// Write JSON data to file.json
export function writeJson(filename: string, data: any): void {
	const jsonData = JSON.stringify(data, null, 2);
	writeFileSync(filename, jsonData, "utf8");
}
