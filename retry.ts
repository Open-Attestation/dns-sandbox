const wait = (timeout: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, timeout));
export const retry = async <T>(
  fn: () => Promise<T>,
  { times = 3, timeout = 300 }: { times?: number; timeout?: number }
): Promise<T> => {
  while (times > 0) {
    times--;
    try {
      return await fn();
    } catch (e) {
      console.error(e);
      await wait(timeout);
    }
  }
  throw new Error("Can't retry to run this function");
};
