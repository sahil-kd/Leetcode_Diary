import { join, extname } from "path";
import {
	realpathSync,
	access,
	constants,
	readdir,
	stat,
	writeFile,
	mkdir,
} from "fs";
import { freemem, totalmem, homedir, tmpdir } from "os";

// opendir();
// path.extname("C:\\Users\\dell\\Desktop\\CSS experiments\\Ignored file.txt") --> .txt
// path.dirname("C:\\Users\\dell\\Desktop\\CSS experiments\\Ignored file.txt") --> Parent dir path = C:\\Users\\dell\\Desktop\\CSS experiments
// path.basename("C:\\Users\\dell\\Desktop\\CSS experiments\\Ignored file.txt") --> Ignored fileURLToPath.txt
// Operating system type --> os.type() returns Linux - Linux | MacOS - Darwin | Windows - Windows_NT
// console.log(
// 	"An estimate of the default amount of parallelism a program should use: ",
// 	os.availableParallelism()
// ); // outputs 4

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
} // Free memory varies with time even when static

export function getDesktopDirPath(): string {
	return join(homedir(), "Desktop");
}

export function getTempDirPath(): string {
	return tmpdir();
} // %temp% dir path

export function currentDir(): string {
	return realpathSync(".");
} // current directory path

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
}

export function searchFileExists(
	targetFileName: string,
	directoryPath: string
): Promise<boolean> {
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

export function searchDirExists(
	targetDirectoryName: string,
	parentDirectoryPath: string
): Promise<boolean> {
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

export function getFileExtension(filePath: string) {
	const extension = extname(filePath);
	return extension;
}

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
}

export function createFile(path: string): Promise<boolean> {
	return new Promise((resolve, reject) => {
		writeFile(path, "", (err) => {
			if (err) {
				reject("createFile --> " + err.message);
				return;
			}
			resolve(true); // file successfully created
		});
	});
} // path = path/to/new/file.txt

export function createDir(path: string): Promise<boolean> {
	return new Promise((resolve, reject) => {
		mkdir(path, { recursive: true }, (err) => {
			if (err) {
				reject("createDir --> " + err.message);
				return;
			}
			resolve(true);
			console.log("Directory created successfully!");
		});
	});
} // path = path/to/new/directory
