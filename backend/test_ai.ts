import { AIService } from "./src/services/ai";

async function run() {
  const ai = new AIService();
  console.log("Generating script...");
  try {
    const result = await ai.generateScript("ai", false);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("AI Generation Error:", err);
  }
}
run();
