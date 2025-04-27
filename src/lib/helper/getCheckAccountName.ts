import inquirer from "inquirer";

export default async () => {
  const { checkAccountName } = await inquirer.prompt([
    {
      type: "input",
      name: "checkAccountName",
      message:
        "We will handle all Stripe transactions in a separate clearing account. You need to create the account in your SevDesk dashboard under Bank->Clearing Account (Verrechnungskonto).\nYou need to choose an accounting number. The default 1800 usually is for private withdrawal. We recommend 1360 or 3120.\nEnter the exact name of your Stripe clearing account (e.g. 'Stripe'):",
    },
  ]);

  console.log("You selected:", checkAccountName);

  return checkAccountName.trim();
};
