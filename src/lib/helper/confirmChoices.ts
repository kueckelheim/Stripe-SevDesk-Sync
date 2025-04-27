import inquirer from "inquirer";

export default async (
  file: string,
  receiptNumber: string,
  sum: number,
  year: number,
  month: number
) => {
  const { confirmed } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmed",
      message: `Confirm the data before proceeding:
${JSON.stringify({ file, receiptNumber, sum, year, month }, null, 2)}`,
    },
  ]);

  if (!confirmed) {
    process.exit(1);
  }
};
