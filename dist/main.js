import chalk from "chalk";
import process from "process";
import * as f from "./modules/file_n_path_ops.js";
console.log(` ${chalk.bold.underline.green("Leetcode version control")}\n`);
(async function () {
    f.getMemoryLog();
})();
function user_input(prompt) {
    return new Promise((resolve) => {
        process.stdout.write(prompt);
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
