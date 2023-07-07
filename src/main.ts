/*
    Core ts dev guide:
    a) run ts in watch mode using tsc -w or, npm run dev | Ctrl + C to exit mode
    b) after running tsc -w, add new terminal with '+' icon, now you can use git bash while
       previous terminal takes care of watching changes in ts file on each save, or set ts
       watch mode on one terminal & use git bash cli app -> easier to switch
    c) use Prettier
    d) run npm start
*/
import chalk from "chalk"
import inquirer from "inquirer"

console.log(chalk.bold.underline.green(" Leetcode version control "))

inquirer
	.prompt([
		{
			type: "list",
			name: "topping",
			message: "What toppings would you like on your pizza?",
			choices: ["Pepperoni", "Mushroom", "Onion", "Tomato", "Bacon"],
		},
	])
	.then((answers) => {
		console.log("You selected:", answers.topping)
	})
	.catch((error) => {
		if (error.isTtyError) {
			console.log("Prompt couldn't be rendered in the current environment")
		} else {
			console.log("Something else went wrong")
		}
	})
