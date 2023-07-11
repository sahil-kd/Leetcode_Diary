import chalk from "chalk";
import * as f from "file_n_path_ops";
console.log(` ${chalk.bold.underline.green("Leetcode version control")}\n`);
(async function main() {
    f.getMemoryLog();
    console.log(`> pwd is ${f.currentDir()}`);
    const programFilesPath = process.env.PROGRAMFILES;
    if (programFilesPath) {
        console.log("Program Files Path:", programFilesPath);
    }
    else {
        console.log("env variable couldn't be set up, trying alternative setups");
    }
    const appDataPath = process.env.APPDATA || f.joinPath(f.getUserHomeDirPath(), "AppData", "Roaming");
    const cachePath = process.env.LOCALAPPDATA || f.joinPath(f.getUserHomeDirPath(), "AppData", "Local");
    console.log("AppData Path:", appDataPath);
    console.log("Cache Path:", cachePath);
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
