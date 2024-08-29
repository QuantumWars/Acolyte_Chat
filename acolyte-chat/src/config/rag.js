import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { createRetrievalChain } from "langchain/chains/retrieval";
// import { createRetrievalChain, loadQAStuffChain } from "langchain/chains";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";

const GOOGLE_API_KEY = "AIzaSyBZosMjiDkJ-30INznm9clVWhLtYGgmlzU";


const embeddings =new GoogleGenerativeAIEmbeddings({
    model: "models/embedding-001",
    apiKey: GOOGLE_API_KEY
  });
new_vector_store = FAISS.load_local(
    "faiss_index", embeddings, allow_dangerous_deserialization=True
)

// const model = new OpenAI({ temperature: 0 });

// const chain = new createRetrievalChain({
//   combineDocumentsChain: loadQAStuffChain(model),
//   retriever: vectorStore.asRetriever(),
//   returnSourceDocuments: true,
// });

// const res = await chain.call({
//   query: "When does the restaurant open on friday?",
// });
// console.log(res.text);