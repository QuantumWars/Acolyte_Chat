import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import path from 'path';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

const model = new ChatGoogleGenerativeAI({
  apiKey: GOOGLE_API_KEY,
  model: "gemini-1.5-flash",
  temperature: 0.1,
  maxRetries: 2,
});

// Placeholder for FAISS functionality
class BrowserFaissStore {
  constructor(embeddings) {
    this.embeddings = embeddings;
  }

  static async load(modelId, embeddings) {
    console.log(`Loading FAISS index for model ${modelId}`);
    // In a real implementation, you would load the index from a server or IndexedDB
    return new BrowserFaissStore(embeddings);
  }

  async similaritySearch(query, k = 4) {
    console.log(`Performing similarity search for: ${query}`);
    // In a real implementation, you would perform the search here
    // For now, we'll return mock data
    return [
      { metadata: { original_content: "Mock content 1 for " + query } },
      { metadata: { original_content: "Mock content 2 for " + query } },
    ];
  }
}

const promptTemplate = `You are an expert in Hardware related products and related product guides that contains specification, features, etc. Answer the question based only on the following context, which can include text, images and tables: {context}

Question: {question}

Don't answer if you are not sure and decline to answer and say "Sorry, I don't have much information about it." Just return the helpful answer in as much as detailed possible.

Answer:`;

const qaPrompt = new PromptTemplate({
  template: promptTemplate,
  inputVariables: ["context", "question"],
});
async function loadFaissIndex(modelId) {
  
}


async function runChat(question, modelId) {
  try {
    const embeddings = new GoogleGenerativeAIEmbeddings({
      model: "models/embedding-001",
      apiKey: GOOGLE_API_KEY
    });
    const faissIndex=  await FaissStore.load(path.join('','/pdf_test2'), embeddings);
    console.log("this is demo",faissIndex)
    const similarDocs = await faissIndex.similaritySearch(question);
    
    let context = "";
    for (const doc of similarDocs) {
      context += '[text]' + doc.metadata['original_content'];
    }
    
    const promptInput = await qaPrompt.format({ context: context, question: question });
    const res = await model.invoke(promptInput);
    console.log(res.content);
    return res.content;
  } catch (error) {
    console.error("Error in runChat:", error);
    throw error;
  }
}

export default runChat;