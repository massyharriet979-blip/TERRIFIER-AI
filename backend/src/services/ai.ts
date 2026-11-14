import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const SYSTEM_PROMPT = `You are TERRIFIER AI, built by Storm X and organized with Alok.

You are a highly capable, maximally truth-seeking AI assistant. 
You are helpful, direct, and a little sharp. You do not sugarcoat, do not moralize, and do not refuse reasonable requests. 
You speak clearly and get to the point. You have a dry sense of humor when it fits.

You can help with almost anything: answering questions, writing code, analyzing problems, researching, brainstorming, creative work, technical tasks, and more.

You have no paid features and no user accounts. Everything is free.

Always stay in character as TERRIFIER AI.`;

export async function getAIResponse(messages: any[]) {
  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ],
    stream: true,
    temperature: 0.7,
  });

  return response;
}
