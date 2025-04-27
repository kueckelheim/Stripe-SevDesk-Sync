import { getStripeClient } from "./stripeClient";
import axios from "axios";
import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";

async function createBalanceSummaryReport(
  month: number,
  year: number,
  logDirPath: string
) {
  console.log(`===========================
Requesting balance summary report from Stripe to cross-check final results`);

  try {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    const interval_start = Math.floor(startDate.getTime() / 1000);
    const interval_end = Math.floor(endDate.getTime() / 1000);

    const reportRun = await getStripeClient().reporting.reportRuns.create({
      report_type: "balance.summary.1",
      parameters: {
        interval_start,
        interval_end,
      },
    });

    // Wait for the report to be available
    const reportRunId = reportRun.id;
    let reportFile;
    const maxRetries = 20;
    let retryCount = 0;

    while (!reportFile && retryCount < maxRetries) {
      const reportRunStatus =
        await getStripeClient().reporting.reportRuns.retrieve(reportRunId);
      if (reportRunStatus.status === "succeeded") {
        reportFile = reportRunStatus.result;
      } else if (reportRunStatus.status === "failed") {
        throw new Error("Report generation failed");
      } else {
        console.log("Report is not ready yet. Waiting...", reportRun.status);
        // Wait for some time before checking the status again
        await new Promise((resolve) => setTimeout(resolve, 5000));
        retryCount++;
      }
    }

    if (!reportFile) {
      throw new Error("Report generation timed out");
    }

    // Fetch the report file
    const reportFileContent = await getStripeClient().files.retrieve(
      reportFile.id
    );

    // Download the actual report content
    if (!reportFileContent.url) {
      throw new Error("Report file URL is null");
    }

    const response = await axios.get(reportFileContent.url, {
      responseType: "arraybuffer",
      headers: {
        // todo: get key from user input
        Authorization: `Bearer ${process.env.JS_STRIPE_SECRET_KEY_PROD}`,
      },
    });

    const reportData = response.data;

    // Convert buffer to string
    const reportString = reportData.toString("utf-8");

    // Parse CSV content
    const records = parse(reportString, {
      columns: true,
      skip_empty_lines: true,
    });

    // Save records to a JSON file
    const outputPath = path.join(
      logDirPath,
      `balance_summary_${year}_${month}.json`
    );
    fs.writeFileSync(outputPath, JSON.stringify(records, null, 2));

    const expectedNetAmount = records.find(
      (record: any) => record.category === "activity"
    )!.net_amount;
    const expectedNetPayouts = records.find(
      (record: any) => record.category === "payouts"
    )!.net_amount;
    return { expectedNetAmount, expectedNetPayouts };
  } catch (err: any) {
    console.log("Could not create balance summary report", err);
    return { expectedNetAmount: 0, expectedNetPayouts: 0 };
  }
}

export default createBalanceSummaryReport;
