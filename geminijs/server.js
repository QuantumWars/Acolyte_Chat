import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { LLMChain } from "langchain/chains";
import { PromptTemplate } from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

dotenv.config();

const app = express();
const port = 3000;

const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
  console.error('GOOGLE_API_KEY is not set in the environment variables');
  process.exit(1);
}

app.use(
  cors({
    origin: "https://acolyte-frontend.vercel.app",
    credentials: true
  })
);
app.use(express.json());

const embeddingModel = new GoogleGenerativeAIEmbeddings({
  apiKey: API_KEY,
  model: "models/embedding-001"
});

const llmModel = new ChatGoogleGenerativeAI({
  apiKey: API_KEY,
  modelName: "gemini-1.5-flash",
  temperature: 0.2,
  maxOutputTokens: 8192,
  topK: 40,
  topP: 0.95
});

const queryPromptText = `
You are an AI assistant specialized in medical knowledge, designed to interact with medical students. Your task is to provide accurate, helpful, and engaging information based on the given context, question, and previous interactions. Please follow these guidelines:

1. Carefully analyze the provided context and previous interactions.

2. Answer the user's question based on the information in the context and previous interactions. Frame your responses in a way that encourages critical thinking and further exploration of the topic.

3. If the context and previous interactions don't contain enough information to fully answer the question, clearly state this limitation. Then, provide the best possible answer with the available information and suggest related topics the student might want to explore.

4. If asked about topics not covered in the context or previous interactions, explain that the specific information isn't in your current dataset. Then, guide the conversation back to related medical topics you can discuss based on the available context.

5. Maintain a professional yet engaging tone, considering that users are medical students seeking to deepen their understanding.

6. Use the previous interactions to build a progressive learning experience, referencing earlier points and building upon them.

7. For follow-up questions, explicitly connect new information to previously discussed concepts to reinforce learning.

8. Provide concise yet comprehensive answers. Use bullet points, numbered lists, or brief explanations of medical processes when appropriate to enhance clarity.

9. When relevant, mention real-world applications of the medical knowledge being discussed to help students connect theory to practice.

10. If there are limitations or uncertainties in the information provided, explain these clearly. Use this as an opportunity to discuss the importance of ongoing research and evidence-based practice in medicine.

11. For non-medical queries, politely explain your role as a medical AI assistant. Then, attempt to relate the query to a relevant medical topic based on the available context. For example:
    - If asked about a historical event, relate it to medical advancements of that era.
    - If asked about a celebrity, discuss general health topics that might be relevant to their age group or known health conditions.

12. Occasionally pose thought-provoking questions to the student to encourage deeper engagement with the material.

13. When appropriate, suggest additional resources or areas of study that would complement the topic being discussed.

14. If the query is completely unrelated to the available context, guide the student back by saying something like: "While I don't have information about [unrelated topic], our medical dataset contains interesting information about [related medical topic from context]. Would you like to explore that instead?"

Context: {document_data}

Previous Interactions: {previous_interactions}

User's Question: {query}

Please provide your response, keeping in mind the goal of engaging and educating medical students:
`;

const summarizePromptText = `
You are an AI assistant specialized in medical knowledge. Your task is to provide a comprehensive summary of the entire content provided. Please follow these guidelines:

1. Carefully analyze all the provided content.
2. Create a coherent and well-structured summary that covers the main topics and key points from the entire document.
3. Organize the summary in a logical manner, using headings or sections if appropriate.
4. Maintain a professional and informative tone throughout the summary.
5. Aim for a summary length that captures the essence of the content without being overly lengthy.
6. Highlight any important medical concepts, treatments, or procedures mentioned in the content.
7. If there are any conflicting or controversial points in the content, make note of them in the summary.
8. Use bullet points or numbered lists to present key information clearly and concisely.

Content to summarize:
{document_data}

Please provide your summary:
`;

const summarizeResponsesPromptText = `
You are an AI assistant specialized in medical knowledge. Your task is to provide a comprehensive summary of all previous interactions. Please follow these guidelines:

1. Carefully analyze all the provided interactions.
2. Create a coherent and well-structured summary that covers the main topics and key points from all interactions.
3. Organize the summary in a logical manner, using headings or sections if appropriate.
4. Maintain a professional and informative tone throughout the summary.
5. Aim for a summary length that captures the essence of the interactions without being overly lengthy.
6. Highlight the progression of the conversation, noting how later interactions build upon earlier ones.
7. Identify and summarize any recurring themes or topics across multiple interactions.
8. If there were any corrections or clarifications made in later interactions, make sure to highlight these in the summary.
9. Use bullet points or numbered lists to present key information clearly and concisely.

Previous Interactions:
{previous_interactions}

Please provide your summary of all interactions:
`;

const queryPromptTemplate = new PromptTemplate({
  inputVariables: ["document_data", "previous_interactions", "query"],
  template: queryPromptText,
});

const summarizePromptTemplate = new PromptTemplate({
  inputVariables: ["document_data"],
  template: summarizePromptText,
});

const summarizeResponsesPromptTemplate = new PromptTemplate({
  inputVariables: ["previous_interactions"],
  template: summarizeResponsesPromptText,
});

const queryChain = new LLMChain({ llm: llmModel, prompt: queryPromptTemplate });
const summarizeChain = new LLMChain({ llm: llmModel, prompt: summarizePromptTemplate });
const summarizeResponsesChain = new LLMChain({ llm: llmModel, prompt: summarizeResponsesPromptTemplate });

// Cache for vector stores
const vectorStoreCache = new Map();

// Cache for previous interactions
const previousInteractionsCache = new Map();

app.post('/query', async (req, res) => {
  const { modelID, query, sessionID } = req.body;

  if (!modelID || !query || !sessionID) {
    return res.status(400).json({ error: "modelID, query, and sessionID are required" });
  }

  try {
    // Load or retrieve the vector store from cache
    let vectorStore = vectorStoreCache.get(modelID);
    if (!vectorStore) {
      console.log(`Loading vector store for model: ${modelID}...`);
      vectorStore = await FaissStore.load(`./${modelID}`, embeddingModel);
      vectorStoreCache.set(modelID, vectorStore);
      console.log("Vector store loaded and cached successfully.");
    }

    // Retrieve previous interactions for the session
    let previousInteractions = previousInteractionsCache.get(sessionID) || [];

    let response;
    if (query.toLowerCase().includes('summary') || query.toLowerCase().includes('summarize')) {
      if (query.toLowerCase().includes('responses') || query.toLowerCase().includes('interactions')) {
        console.log("Generating summary of all previous responses...");
        const formattedPreviousInteractions = previousInteractions
          .map((interaction, index) => `${index + 1}. Q: ${interaction.query}\nA: ${interaction.response}`)
          .join('\n\n');

        response = await summarizeResponsesChain.call({
          previous_interactions: formattedPreviousInteractions,
        });
        console.log("Summary of previous responses generated.");
      } else {
        console.log("Generating summary of document content...");
        const allDocs = await vectorStore.similaritySearch("", 2000);
        const content = allDocs.map(doc => doc.pageContent).join('\n\n');

        response = await summarizeChain.call({
          document_data: content,
        });
        console.log("Summary of document content generated.");
      }
    } else {
      console.log("Performing similarity search...");
      const similaritySearchResults = await vectorStore.similaritySearch(query, 5);
      console.log("Similarity search completed.");

      const content = similaritySearchResults.map(doc => doc.pageContent).join('\n\n');

      // Format previous interactions
      const formattedPreviousInteractions = previousInteractions
        .map((interaction, index) => `${index + 1}. Q: ${interaction.query}\nA: ${interaction.response}`)
        .join('\n\n');

      console.log("Running the query LLM chain...");
      response = await queryChain.call({
        document_data: content,
        previous_interactions: formattedPreviousInteractions,
        query: query,
      });
      console.log("Query chain execution completed.");

      // Update the previous interactions cache
      previousInteractions.push({ query, response: response.text });
      // Keep only the last 10 interactions to manage context length
      if (previousInteractions.length > 10) {
        previousInteractions = previousInteractions.slice(-10);
      }
      previousInteractionsCache.set(sessionID, previousInteractions);
    }

    res.json({ result: response.text });
  } catch (error) {
    console.error("An error occurred:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
