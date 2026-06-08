const { Queue } = require("bullmq");

async function promote() {
  const uploadQueue = new Queue("uploadQueue", { connection: { host: "localhost", port: 6379 } });
  
  const delayedJobs = await uploadQueue.getDelayed();
  console.log(`Found ${delayedJobs.length} delayed upload jobs.`);
  
  for (const job of delayedJobs) {
    console.log(`Promoting job ${job.id} to immediate execution...`);
    await job.promote();
  }
  
  console.log("All jobs promoted.");
  process.exit(0);
}

promote().catch(console.error);
