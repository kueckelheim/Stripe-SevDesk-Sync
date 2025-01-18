const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export default async <T>(fn: () => Promise<T>): Promise<T> => {
  let attempts = 0;
  let lastError: any = null;

  while (attempts < MAX_RETRIES) {
    try {
      const response = await fn();
      return response;
    } catch (err: any) {
      lastError = err;
      if (
        err.response &&
        (err.response.status === 400 || err.response.status === 404)
      ) {
        throw err;
      }
      attempts++;

      console.log(
        `Attempt ${attempts} failed. Retrying in ${RETRY_DELAY}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
  }

  throw new Error(`Max retries reached: ${lastError.message}`);
};
