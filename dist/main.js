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
import inquirer from "inquirer";
import process from "process";
import path from "path";
import os from "os";
// import crypto from "crypto"
console.log(` ${chalk.bold.underline.green("Leetcode version control")}\n`); // Main App Title
// function generateRandomHash(length: number) {
// 	const randomBytes = crypto.randomBytes(length);
// 	const hash = crypto.createHash("sha256").update(randomBytes).digest("hex");
// 	return hash.slice(0, length);
// }
const desktop_path = path.join(os.homedir(), "Desktop");
console.log("Desktop directory is ", desktop_path);
console.log("Temp directory is ", os.tmpdir());
console.log("Operating system type is ", os.type());
console.log("An estimate of the default amount of parallelism a program should use: ", os.availableParallelism());
const node_free_mem = parseFloat(String(os.freemem())); // free memory available to node processes (in bytes)
const node_total_mem = parseFloat(String(os.totalmem())); // free memory available to node processes (in bytes)
console.log("Free memory available to node processes = ", node_free_mem * Math.pow(10, -6), " MB");
console.log("Total memory available to node processes = ", node_total_mem * Math.pow(10, -6), " MB");
console.log(((node_free_mem / node_total_mem) * 100).toFixed(2), "% available");
console.log("\n");
// const questions = [
// 	{
// 		type: "input",
// 		name: "name",
// 		message: "What is your name?",
// 	},
// 	{
// 		type: "confirm",
// 		name: "confirm",
// 		message: "Are you sure?",
// 	},
// ];
function user_input(prompt) {
    return new Promise((resolve) => {
        process.stdout.write(prompt);
        const onData = (data) => {
            const userInput = data.toString().trim();
            resolve(chalk.blue(userInput));
            cleanup();
        };
        const cleanup = () => {
            process.stdin.off("data", onData); // off is used to remove the event listener for "data" once the input has been received, preventing potential memory leaks
            // process.stdin.destroy(); // do not close input stream else it will turn of core input stream including inputs for prompts/MCQs from inquirer.js
        };
        process.stdin.once("data", onData);
    });
}
// main() function below --> async IIFE
(async () => {
    const name = await user_input("What is your name? ");
    console.log(`Hello, ${name}`);
    const name2 = await user_input("What is your name? ");
    console.log(`Hello again gentlemen, ${name2}`);
    try {
        const result = await inquirer.prompt([
            {
                type: "list",
                name: "topping",
                message: chalk.blue("What toppings would you like on your pizza?"),
                choices: ["Pepperoni", "Mushroom", "Onion", "Tomato", "Bacon"],
            },
            {
                type: "list",
                name: "burger",
                message: "What toppings would you like on your hamburger?",
                choices: ["Vinegar", "Potato", "Lemon", "Chicken"],
            },
        ]);
        console.log(chalk.redBright.italic("You selected:", result.topping));
        console.log("You selected:", result.burger);
    }
    catch (error) {
        if (error.isTtyError) {
            console.log("Prompt couldn't be rendered in the current environment");
        }
        else {
            console.log("Error: ", error.message);
        }
    }
    // try {
    // 	const result = await inquirer.prompt(questions);
    // 	console.log(
    // 		result.confirm
    // 			? chalk.green("Name confirmed as " + result.name)
    // 			: chalk.red("Name not confirmed")
    // 	);
    // } catch (error) {
    // 	console.error("Error:", error);
    // }
})();
