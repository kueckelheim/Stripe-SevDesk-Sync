import path from "path";
import getFilesFromDirectory from "./getFilesFromDirectory";
import inquirer from "inquirer";
import PDFParser from "pdf2json";
import confirmChoices from "./confirmChoices";

const parsePdfFile = async (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(this, true);

    pdfParser.on("pdfParser_dataError", (errData) => {
      console.error(errData.parserError);
      reject(errData.parserError);
    });

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      const rawTextContent = pdfParser.getRawTextContent();
      resolve(rawTextContent);
    });

    pdfParser.loadPDF(filePath);
  });
};

export default async () => {
  const { confirmAction } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmAction",
      message:
        "Download monthly Stripe tax report and put it in the '/input' folder.\nEnter 'Yes' when done.\n",
      default: true, // Default answer (true for "Yes", false for "No")
    },
  ]);
  if (!confirmAction) {
    console.log("Restart programm when you are ready.");
    process.exit(1);
  }

  const directoryPath = path.join(__dirname, "..", "..", "..", "input");
  const files = await getFilesFromDirectory(directoryPath);

  if (files.length === 0) {
    console.log("No files found in the directory.");
    process.exit(1);
  }

  const { taxFile } = await inquirer.prompt([
    {
      type: "list",
      name: "taxFile",
      message: "Select a Stripe tax report:",
      choices: files,
    },
  ]);

  const parsedData = await parsePdfFile(path.join(directoryPath, taxFile));
  const serviceMonthMatch = parsedData.match(/Service Month(\w+)\s(\d{4})/);
  const totalAmountMatch = parsedData.match(/Total€(\d+\.\d{2})/);
  const invoiceNumberMatch = parsedData.match(
    /Invoice Number\s*([A-Z0-9]+-\d{4}-\d{2})/
  );

  if (!serviceMonthMatch || !totalAmountMatch || !invoiceNumberMatch) {
    console.error("Failed to extract required data from the PDF.");
    process.exit(1);
  }

  const serviceMonth =
    new Date(`${serviceMonthMatch[1]} 1, ${serviceMonthMatch[2]}`).getMonth() +
    1;
  const serviceYear = parseInt(serviceMonthMatch[2] || "0", 10);
  const totalAmount = parseFloat(totalAmountMatch[1] || "0");
  const invoiceNumber = invoiceNumberMatch[1];

  await confirmChoices(
    taxFile,
    invoiceNumber!,
    totalAmount,
    serviceYear,
    serviceMonth
  );

  return {
    month: serviceMonth,
    year: serviceYear,
    sumFees: totalAmount,
    invoiceNumber,
    taxFile,
  };
};
