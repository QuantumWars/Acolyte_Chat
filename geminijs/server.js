import express, { text } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { LLMChain, loadSummarizationChain } from "langchain/chains";
import { PromptTemplate } from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import fs from 'fs/promises';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
  console.error('GOOGLE_API_KEY is not set in the environment variables');
  process.exit(1);
}

app.use(cors());
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
11. For non-medical queries, politely explain your role as a medical AI assistant. Then, attempt to relate the query to a relevant medical topic based on the available context.
12. Occasionally pose thought-provoking questions to the student to encourage deeper engagement with the material.
13. When appropriate, suggest additional resources or areas of study that would complement the topic being discussed.
14. If the query is completely unrelated to the available context, guide the student back by saying something like: "While I don't have information about [unrelated topic], our medical dataset contains interesting information about [related medical topic from context]. Would you like to explore that instead?"

Context:
---
{document_data}
---

Previous Interactions:
---
{previous_interactions}
---

User's Question: {query}

Please provide your response, keeping in mind the goal of engaging and educating medical students:
`;

const queryPromptTemplate = new PromptTemplate({
  inputVariables: ["document_data", "previous_interactions", "query"],
  template: queryPromptText,
});

const queryChain = new LLMChain({ llm: llmModel, prompt: queryPromptTemplate });

const vectorStoreCache = new Map();
const previousInteractionsCache = new Map();
const fullContentCache = new Map();

async function loadFullContent(modelID) {
  if (!fullContentCache.has(modelID)) {
    try {
      const content = await fs.readFile(`./${modelID}/source.txt`, 'utf-8');
      fullContentCache.set(modelID, content);
    } catch (error) {
      console.error(`Error loading full content for ${modelID}:`, error);
      throw error;
    }
  }
  return fullContentCache.get(modelID);
}

const queryAnalysisPrompt = `
Analyze the given query and determine if it requires full document context or if a partial context would suffice. 
Consider the following factors:
1. Does the query ask for overall summary or general understanding of the entire document?
2. Does the query require comparing or connecting information from different parts of the document?
3. Is the query about a specific detail that's likely to be found in a small section of the document?
4. Does the query ask about trends, patterns, or themes throughout the document?

Query: {query}

Based on your analysis, respond with either "FULL" for full document context or "PARTIAL" for partial context. Explain your reasoning briefly.

Response format:
DECISION: [FULL/PARTIAL]
REASONING: [Your explanation here]
`;

const queryAnalysisTemplate = new PromptTemplate({
  inputVariables: ["query"],
  template: queryAnalysisPrompt,
});

const queryAnalysisChain = new LLMChain({ llm: llmModel, prompt: queryAnalysisTemplate });

async function determineQueryScope(query) {
  const analysis = await queryAnalysisChain.call({ query });
  const lines = analysis.text.split('\n').map(line => line.trim());
  
  let decision = 'PARTIAL'; // Default to PARTIAL if we can't determine
  let reasoning = '';

  for (const line of lines) {
    if (line.toLowerCase().includes('decision:')) {
      const cleanedLine = line.replace(/[*]/g, '').trim(); // Remove asterisks
      const parts = cleanedLine.split(':');
      if (parts.length > 1) {
        const decisionPart = parts[1].trim().toUpperCase();
        if (decisionPart.includes('FULL')) {
          decision = 'FULL';
        } else if (decisionPart.includes('PARTIAL')) {
          decision = 'PARTIAL';
        }
      }
    } else if (line.toLowerCase().includes('reasoning:')) {
      reasoning = line.substring(line.toLowerCase().indexOf('reasoning:') + 'reasoning:'.length).trim();
    }
  }

  console.log(`Query scope determination: ${decision}`);
  console.log(`Reasoning: ${reasoning}`);

  return decision === 'FULL';
}
app.post('/query', async (req, res) => {
  const { modelID, query, sessionID } = req.body;

  if (!modelID || !query || !sessionID) {
    return res.status(400).json({ error: "modelID, query, and sessionID are required" });
  }

  try {
    let vectorStore = vectorStoreCache.get(modelID);
    if (!vectorStore) {
      console.log(`Loading vector store for model: ${modelID}...`);
      vectorStore = await FaissStore.load(`./${modelID}`, embeddingModel);
      vectorStoreCache.set(modelID, vectorStore);      

      console.log("Vector store loaded and cached successfully.");
    }

    let previousInteractions = previousInteractionsCache.get(sessionID) || [];

    let response;
    let content;

    const requiresFullContent = await determineQueryScope(query);

    if (requiresFullContent) {
      console.log("Query requires full content. Retrieving full content for processing...");
      const similaritySearchResults = await vectorStore.similaritySearch("", 2000);
      content = similaritySearchResults.map(doc => doc.pageContent).join('\n\n');
      console.log(content)
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize:10000,
        chunkOverlap:20
      });
      const docs = await textSplitter.createDocuments([content]);
      const chain = loadSummarizationChain(llmModel, { type: "map_reduce" });
      response = await chain.invoke({
        input_documents: docs,
      });
    } else {
      console.log("Query can be answered with partial content. Performing similarity search...");
      const similaritySearchResults = await vectorStore.similaritySearch(query, 5);
      content = similaritySearchResults.map(doc => doc.pageContent).join('\n\n');
      const formattedPreviousInteractions = previousInteractions
      .map((interaction, index) => `${index + 1}. Q: ${interaction.query}\nA: ${interaction.response}`)
      .join('\n\n');

    console.log("Running the query LLM chain...");
    response = await queryChain.call({
      document_data: content,
      previous_interactions: formattedPreviousInteractions,
      query: query,
    });
    }

    console.log("Content retrieved. Length:", content.length);

    
    console.log("Query chain execution completed.");

    previousInteractions.push({ query, response: response.text });
    if (previousInteractions.length > 10) {
      previousInteractions = previousInteractions.slice(-10);
    }
    previousInteractionsCache.set(sessionID, previousInteractions);

    res.json({ result: response.text });
  } catch (error) {
    console.error("An error occurred:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
