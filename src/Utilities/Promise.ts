import pLimit from "p-limit";

export const promise = {
  limiter,
};

function limiter(concurrency: number) {
  const limit = pLimit(concurrency);
  const input: Promise<void>[] = [];
  return {
    push: (fn: () => Promise<void>) => {
      input.push(limit(fn));
    },
    run: async () => {
      await Promise.all(input);
    },
  };
}
