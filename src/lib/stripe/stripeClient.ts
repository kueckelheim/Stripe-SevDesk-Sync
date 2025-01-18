import Stripe from "stripe";
import inquirer from "inquirer";

let stripeClient: Stripe | null = null;

export const initializeStripeClient = async (): Promise<void> => {
  if (!stripeClient) {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "secretKey",
        message: "Please enter your Stripe secret key:",
      },
    ]);
    stripeClient = new Stripe(answers.secretKey);
    console.log("Stripe client initialized.");
  }
};

// Export a function to get the stripeClient
export const getStripeClient = (): Stripe => stripeClient!;
