import { Queue } from "bullmq";

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379");

const defaultConnection = {
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null,
};

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 2000, // 2s, 4s, 8s retries
  },
  removeOnComplete: { age: 3600 * 24 }, // keep last 24h
  removeOnFail: { age: 3600 * 48 }, // keep last 48h
};

export const researchQueue = new Queue("researchQueue", {
  connection: defaultConnection,
  defaultJobOptions,
});

export const strategistQueue = new Queue("strategistQueue", {
  connection: defaultConnection,
  defaultJobOptions,
});

export const generationQueue = new Queue("generationQueue", {
  connection: defaultConnection,
  defaultJobOptions,
});

export const renderQueue = new Queue("renderQueue", {
  connection: defaultConnection,
  defaultJobOptions,
});

export const uploadQueue = new Queue("uploadQueue", {
  connection: defaultConnection,
  defaultJobOptions,
});

export const analyticsQueue = new Queue("analyticsQueue", {
  connection: defaultConnection,
  defaultJobOptions,
});

export const optimizationQueue = new Queue("optimizationQueue", {
  connection: defaultConnection,
  defaultJobOptions,
});

export const cleanupQueue = new Queue("cleanupQueue", {
  connection: defaultConnection,
  defaultJobOptions,
});
