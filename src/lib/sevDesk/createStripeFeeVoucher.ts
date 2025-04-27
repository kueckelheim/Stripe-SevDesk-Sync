import sevDeskClient from "./sevDeskClient";
import type { components } from "../../types/schema";
import * as path from "path";
import { readFileSync } from "fs";
import FormData from "form-data";
import createStripeAsSevDeskContact from "./createStripeAsSevDeskContact";

const uploadFile = async (fileName: string) => {
  try {
    // Construct the file path
    const filePath = path.resolve(
      __dirname,
      "..",
      "..",
      "..",
      "input",
      fileName
    );

    // Read the file as a Buffer
    const fileBuffer = readFileSync(filePath);

    // Create a new FormData instance
    const form = new FormData();
    form.append("file", fileBuffer, "invoice.pdf");

    // upload invoice file to sevdesk
    const res = await sevDeskClient.post(
      "/Voucher/Factory/uploadTempFile",
      form
    );
    return res.data.objects.filename;
  } catch (err: any) {
    console.error("Could not upload Stripe Tax report file");
    console.error(err.response?.status);
    console.error(err.response?.data?.error);
    throw new Error();
  }
};

const getNextMonthFirstDay = (month: number, year: number): string => {
  // Calculate the next month and year
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  // Create a Date object for the first day of the next month
  const nextMonthFirstDay = new Date(nextYear, nextMonth - 1, 1);

  // Format the date as "dd.mm.yyyy"
  const day = String(nextMonthFirstDay.getDate()).padStart(2, "0");
  const formattedMonth = String(nextMonthFirstDay.getMonth() + 1).padStart(
    2,
    "0"
  );
  const formattedYear = nextMonthFirstDay.getFullYear();

  return `${day}.${formattedMonth}.${formattedYear}`;
};

export default async (
  receiptNumber: string,
  taxFile: string,
  sumFees: number,
  month: number,
  year: number
) => {
  const filename = await uploadFile(taxFile);
  try {
    // check if the voucher already exists
    const res = await sevDeskClient.get(
      `/Voucher?descriptionLike=${receiptNumber}`
    );
    if (res.data.objects.length) {
      console.log(
        `Stripe Fee Voucher has already been created ${receiptNumber}`
      );
      return res.data.objects[0].id;
    }
    const sevDeskContactId = await createStripeAsSevDeskContact();

    const data: components["schemas"]["saveVoucher"] = {
      voucher: {
        objectName: "Voucher",
        mapAll: true,
        // date on the pdf
        voucherDate: getNextMonthFirstDay(month, year),
        supplier: {
          id: Number(sevDeskContactId),
          objectName: "Contact",
        },
        supplierName: null,
        // invoice number on the pdf
        description: receiptNumber,
        // date on the pdf
        // payDate: "01.12.2024",
        status: 100,
        taxRule: {
          // Reverse Charge
          id: "14" as any,
          objectName: "TaxRule",
        },
        taxType: undefined as unknown as any,
        creditDebit: "C",
        voucherType: "VOU",
        currency: "EUR",
        propertyForeignCurrencyDeadline: null,
        propertyExchangeRate: 1,
        taxSet: null,
      },
      voucherPosSave: [
        {
          objectName: "VoucherPos",
          mapAll: true,
          accountDatev: {
            // Nebenkosten des Geldverkehrs
            id: 4285,
            objectName: "AccountDatev",
          },
          accountingType: undefined as unknown as any,
          taxRate: 0,
          net: false,
          sumNet: 0,
          // as written in pdf
          sumGross: sumFees,
          comment: null,
          voucher: undefined as unknown as any,
        },
      ],
      voucherPosDelete: undefined as unknown as any,
      filename,
    };
    const response = await sevDeskClient.post(
      "/Voucher/Factory/saveVoucher",
      data
    );

    return response.data.objects.voucher.id;
  } catch (err: any) {
    console.error("could not create Stripe Fee voucher");
    console.error(err.response?.status);
    console.error(err.response?.data?.error);
  }
};
