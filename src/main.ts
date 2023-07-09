/*
    Core ts dev guide:
    a) run ts in watch mode using tsc -w or, npm run dev | Ctrl + C to exit mode
    b) after running tsc -w, add new terminal with '+' icon, now you can use git bash while
       previous terminal takes care of watching changes in ts file on each save, or set ts
       watch mode on one terminal & use git bash cli app -> easier to switch
    c) use Prettier
    d) run npm start
*/
import chalk from "chalk";
// import inquirer from "inquirer";
import process from "process";
import * as f from "./modules/file_n_path_ops.js";

console.log(` ${chalk.bold.underline.green("Leetcode version control")}\n`); // Main App Title

/* *** main() function below --> async IIFE *** */

(async function () {
	f.getMemoryLog();
})();

/* *** End of main() function above *** */

function user_input(prompt: string) {
	return new Promise((resolve) => {
		process.stdout.write(prompt);

		const onData = (data: { toString: () => string }) => {
			const userInput = data.toString().trim();
			resolve(chalk.blue(userInput));
			cleanup();
		};

		const cleanup = () => {
			process.stdin.off("data", onData); // off is used to remove the event listener for "data" once the input received, preventing potential memory leaks
			// process.stdin.destroy(); // do not close input stream else it will turn of core input stream including inputs for prompts/MCQs from inquirer.js
		};

		process.stdin.once("data", onData);
	});
}
