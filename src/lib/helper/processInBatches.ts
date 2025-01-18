const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default async (arr: any[], func: any, batchSize: number) => {
  for (let i = 0; i < arr.length; i += batchSize) {
    const batch = arr.slice(i, i + batchSize);
    await Promise.all(batch.map(func));
    await delay(300); // Pause for 0.1 seconds between batches
  }
};
