import os 
import re
from dotenv import load_dotenv
import google.generativeai as genai
from langchain_google_genai import ChatGoogleGenerativeAI,GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
import markdown
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from bs4 import BeautifulSoup
import re
import pandas as pd 
import uuid
from langchain.schema.document import Document
from langchain_community.vectorstores import FAISS
from langchain_ollama import ChatOllama

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.pydantic_v1 import BaseModel, Field
from langchain_core.output_parsers import JsonOutputParser
from langchain.retrievers.multi_query import MultiQueryRetriever
from langchain_core.runnables import RunnableParallel, RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser


#https://github.com/pinecone-io/examples/blob/master/learn/generation/langchain/handbook/10-langchain-multi-query.ipynb
class RAG:
    def __init__(self, llm_model='llama3.1', embedding_model="models/embedding-001"):
        self._load_environment()
        self._configure_models(llm_model, embedding_model)
        self._initialize_data_structures()
        

    def _load_environment(self):
        load_dotenv()
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("Google API key not found in environment variables.")
        genai.configure(api_key=self.api_key)
        print("Environment loaded and Google API configured successfully.")
        self.generation_config = {
        "temperature": 0,
        "top_p": 0.95,
        "top_k": 64,
        "max_output_tokens": 8192,
        "response_mime_type": "text/plain",
        }

    def _configure_models(self, llm_model, embedding_model):
        self.embedding_model = GoogleGenerativeAIEmbeddings(model=embedding_model)
        if llm_model == 'llama3.1':
            self.llm_model = ChatOllama(model=llm_model)
        elif llm_model == 'ChatGoogleGenerativeAI':
            self.llm_model = ChatGoogleGenerativeAI(model="gemini-pro", temperature=0.1)
        else:
            self.llm_model = model = ChatGoogleGenerativeAI(model="gemini-1.5-flash",termperature=0,max_output_tokens=8192,top_k=64,top_p=0.95)

    def _initialize_data_structures(self):
        self.text_elements = []
        self.text_summary = []
        self.table_elements = []
        self.table_summary = []
        self.documents = []
        self.retrieve_contents = []
        self.vectorstore = None

    def load_data(self, text):
        sections = re.split(r'\n##?', text)
        for section in sections:
            self.text_elements.append(section)
            self.text_summary.append(self._get_summary(section, element_type='text'))
        
        # Automatically process the data after loading
        self._process_data()
        
        return self.text_elements, self.text_summary

    def _get_summary(self, element, element_type):
        summary_prompt = f"""
        Summarize the following {element_type}:
        {{element}}
        """
        summary_chain = LLMChain(
            llm=self.llm_model,
            prompt=PromptTemplate.from_template(summary_prompt)
        )
        summary = summary_chain.invoke({'element': element})
        return summary['text']  # Assuming the output is in a 'text' key

    def _process_data(self):
        self._ingest_data()
        self._create_vectordb()
        print("Data processed and vector database created. Ready for queries.")

    def _ingest_data(self):
        for element, summary in zip(self.text_elements, self.text_summary):
            doc_id = str(uuid.uuid4())
            doc = Document(
                page_content=summary,
                metadata={
                    'id': doc_id,
                    'type': 'text',
                    'original_content': element
                }
            )
            self.retrieve_contents.append((doc_id, element))
            self.documents.append(doc)

    def _create_vectordb(self,index_path = "faiss_index"):
        if os.path.exists(index_path):
            print("FAISS index exists. Loading the index.")
            self.vectorstore = FAISS.load_local(index_path, self.embedding_model,allow_dangerous_deserialization=True)

        else:
            print("FAISS index does not exist. Creating a new index.")
            self.vectorstore = FAISS.from_documents(documents=self.documents, embedding=self.embedding_model)
            self.vectorstore.save_local(index_path)

    def _multi_query_retriever(self,query):
        retriever = MultiQueryRetriever.from_llm(
            retriever=self.vectorstore.as_retriever(), llm=self.llm_model
        )
        return retriever.get_relevant_documents(query=query)
    
    def _create_llm_chain(self,query,context):

        QA_PROMPT = PromptTemplate(
            input_variables=["query", "contexts"],
            template = """
            You are a helpful assistant who answers user queries using the contexts provided. If the question cannot be answered using the information provided say "I don't know".

            Assess the complexity and scope of the query to determine whether a concise or detailed response is more appropriate:
            - For simple, straightforward questions, provide a brief, to-the-point answer.
            - For complex or open-ended questions, offer a more comprehensive response.

            Format your answer based on the nature of the information:
            - Use bullet points for lists or step-by-step instructions.
            - Use numbered lists for sequential information or ranked items.
            - Use code blocks for any code snippets or technical commands.
            - Use italics or bold for emphasis on key points when appropriate.

            If your answer is detailed, consider structuring it with clear headings or sections for better readability.

            Contexts:
            {contexts}

            Question: {query}

            Based on the above guidelines, provide your response below:
            """,
        )

        # Chain
        chain = LLMChain(llm=self.llm_model, prompt=QA_PROMPT)
        return chain(inputs={
        "query": query,
        "contexts": context
            }
        )
        # QUERY_PROMPT = PromptTemplate(
        #     input_variables=["question"],
        #     template="""You are an AI language model assistant. Your task is to generate five
        #     different versions of the given user question to retrieve relevant documents from
        #     a vector database. By generating multiple perspectives on the user question, your
        #     goal is to help the user overcome some of the limitations of the distance-based
        #     similarity search. Provide these alternative questions separated by newlines.
        #     Original question: {question}""",
        # )


        # # Run
        # retriever = MultiQueryRetriever.from_llm(
        #     self.vectorstore.as_retriever(), self.llm_model, prompt=QUERY_PROMPT
        # )  # "lines" is the key (attribute name) of the parsed output

        # # RAG prompt
        # template = """Answer the question based only on the following context:
        # {context}
        # Question: {question}
        # """
        # prompt = ChatPromptTemplate.from_template(template)

        # # RAG
        # chain = (
        #     RunnableParallel({"context": retriever, "question": RunnablePassthrough()})
        #     | prompt
        #     | self.llm_model
        #     | StrOutputParser()
        # )
        # return chain.invoke(input_type=query)

        # prompt_template = """
        # You are an expert in Hardware related products and related product guides that contains specification, features, etc.
        # Answer the question based only on the following context, which can include text, images and tables:
        # {context}
        # Question: {question}
        # If you are not sure, respond with "Sorry, I don't have enough information to answer that question."
        # Provide a detailed and helpful answer based on the given context.
        # Answer:
        # """
        # return LLMChain(llm=self.llm_model, prompt=PromptTemplate.from_template(prompt_template))

    def generate_response(self, query):
        if not self.vectorstore:
            raise ValueError("Data has not been loaded and processed. Please call load_data() first.")
        
        relevant_docs = self.vectorstore.similarity_search(query=query)
        #one document retrieval
        context_from_metadata = "\n".join(f'[text]{doc.metadata["original_content"]}' for doc in relevant_docs)
        # print(context)
        docs = self._multi_query_retriever(query)
        context_from_mq = "\n---\n".join([d.page_content for d in docs])
        # result = self._create_llm_chain().invoke({'context': context, 'question': query})
        result = self._create_llm_chain(query,context=context_from_mq)
        # return result['text']  # Assuming the output is in a 'text' key
        return result['text']



rag = RAG(llm_model='ChatGoogleGenerativeAI')
# def read_markdown(md_path):
#     with open(md_path,'r',encoding='utf-8') as f:
#         return f.read()
# md_text = read_markdown('./pdf_test1/pdf_test1/pdf_test1.md')

# rag.load_data(md_text)
# response = rag.generate_response("Your query here")

rag._create_vectordb(index_path="./pdf_test1")
results = rag.generate_response('WHAT ARE ALMO?')
print(results)              