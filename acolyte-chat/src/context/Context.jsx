import { createContext, useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid'; // Import UUID library for generating session IDs

export const Context = createContext();

const ContextProvider = (props) => {
    const [chatSessions, setChatSessions] = useState({});
    const [currentModel, setCurrentModel] = useState("pdf_test1"); // Set default model
    const [loading, setLoading] = useState(false);
    const [displayedResponse, setDisplayedResponse] = useState("");
    const [sessionId, setSessionId] = useState(""); // New state for session ID

    useEffect(() => {
        // Initialize the default session when the component mounts
        const newSessionId = uuidv4(); // Generate a new session ID
        setSessionId(newSessionId);
        createNewSession("pdf_test1", newSessionId);
    }, []);

    const createNewSession = (modelId, newSessionId = uuidv4()) => {
        setChatSessions(prev => ({
            ...prev,
            [modelId]: {
                prompts: [],
                responses: [],
                currentInput: "",
                sessionId: newSessionId // Store session ID for each model
            }
        }));
        setCurrentModel(modelId);
        setSessionId(newSessionId); // Update the current session ID
    };

    const updateCurrentInput = (input) => {
        if (currentModel) {
            setChatSessions(prev => ({
                ...prev,
                [currentModel]: {
                    ...prev[currentModel],
                    currentInput: input
                }
            }));
        }
    };

    const delayPara = useCallback((index, nextWord) => {
        setTimeout(() => {
            setDisplayedResponse(prev => prev + nextWord);
        }, 75 * index);
    }, []);

    const processQuery = async (input) => {
        const modelToUse = currentModel || "pdf_test1"; // Use default if no model selected

        setLoading(true);
        setDisplayedResponse("");

        try {
            setChatSessions(prev => ({
                ...prev,
                [modelToUse]: {
                    ...prev[modelToUse],
                    prompts: [...(prev[modelToUse]?.prompts || []), input],
                }
            }));

            console.log("Sending chat request with input:", input, "model:", modelToUse, "and sessionId:", sessionId);
            
            // API call with session ID
            const response = await fetch('https://acolytecompanion.onrender.com/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    modelID: modelToUse,
                    query: input,
                    sessionID: sessionId // Include session ID in the request
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Received response:", data);

            if (typeof data.result !== 'string') {
                throw new Error("Unexpected response type from API");
            }

            // Modified formatting: Move bold text to next line and replace other asterisks with line breaks
            const formattedResponse = data.result.replace(/\*\*(.*?)\*\*/g, '</br><b>$1</b></br>').replace(/\*/g, '</br>');

            setChatSessions(prev => ({
                ...prev,
                [modelToUse]: {
                    ...prev[modelToUse],
                    responses: [...(prev[modelToUse]?.responses || []), formattedResponse]
                }
            }));

            let words = formattedResponse.split(" ");
            for (let i = 0; i < words.length; i++) {
                delayPara(i, words[i] + " ");
            }
        } catch (error) {
            console.error('Error in processQuery:', error);
            setDisplayedResponse(`An error occurred: ${error.message}. Please try again.`);
            setChatSessions(prev => ({
                ...prev,
                [modelToUse]: {
                    ...prev[modelToUse],
                    responses: [...(prev[modelToUse]?.responses || []), `Error: ${error.message}`]
                }
            }));
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = () => {
        const modelToUse = currentModel || "pdf_test1";
        const currentSession = chatSessions[modelToUse];
        const input = currentSession?.currentInput || "";
        if (input.trim() !== '') {
            processQuery(input);
            updateCurrentInput("");
        }
    };

    const sendCardQuery = (query) => {
        processQuery(query);
    };

    const contextValue = {
        chatSessions,
        currentModel,
        createNewSession,
        updateCurrentInput,
        sendMessage,
        sendCardQuery,
        loading,
        displayedResponse,
        sessionId // Expose session ID through context
    };

    return (
        <Context.Provider value={contextValue}>
            {props.children}
        </Context.Provider>
    );
};

export default ContextProvider;
