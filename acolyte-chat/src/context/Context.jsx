import React, { createContext, useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import Dialog from "../components/Dialog";

export const Context = createContext();

const ContextProvider = (props) => {
    const [chatSessions, setChatSessions] = useState({});
    const [currentModel, setCurrentModel] = useState("pdf_test1");
    const [loading, setLoading] = useState(false);
    const [displayedResponse, setDisplayedResponse] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isFirstQuery, setIsFirstQuery] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);

    useEffect(() => {
        const newSessionId = uuidv4();
        setSessionId(newSessionId);
        createNewSession("pdf_test1", newSessionId);
    }, []);

    useEffect(() => {
        let intervalId;
        if (isDialogOpen) {
            intervalId = setInterval(() => {
                setLoadingProgress((prevProgress) => {
                    if (prevProgress >= 100) {
                        clearInterval(intervalId);
                        return 100;
                    }
                    return prevProgress + 10;
                });
            }, 500);
        }
        return () => clearInterval(intervalId);
    }, [isDialogOpen]);

    const createNewSession = (modelId, newSessionId = uuidv4()) => {
        setChatSessions(prev => ({
            ...prev,
            [modelId]: {
                prompts: [],
                responses: [],
                currentInput: "",
                sessionId: newSessionId
            }
        }));
        setCurrentModel(modelId);
        setSessionId(newSessionId);
        setIsFirstQuery(true);
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
        const modelToUse = currentModel || "pdf_test1";

        setLoading(true);
        setDisplayedResponse("");
        
        if (isFirstQuery) {
            setIsDialogOpen(true);
            setLoadingProgress(0);
        }

        try {
            setChatSessions(prev => ({
                ...prev,
                [modelToUse]: {
                    ...prev[modelToUse],
                    prompts: [...(prev[modelToUse]?.prompts || []), input],
                }
            }));

            console.log("Sending chat request with input:", input, "model:", modelToUse, "and sessionId:", sessionId);
            
            const response = await fetch('https://acolytecompanion.onrender.com/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    modelID: modelToUse,
                    query: input,
                    sessionID: sessionId
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
            setIsDialogOpen(false);
            if (isFirstQuery) {
                setIsFirstQuery(false);
            }
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
        sessionId
    };

    return (
        <Context.Provider value={contextValue}>
            {props.children}
            <Dialog 
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                title="Initializing Language Model"
                content={`
                    <div>
                        <p>The large language model is currently being initialized. This process may take a few moments due to the following technical reasons:</p>
                        <ul>
                            <li>Model size: Loading billions of parameters</li>
                            <li>Memory allocation: Optimizing RAM usage</li>
                            <li>GPU initialization: Preparing CUDA cores (if applicable)</li>
                            <li>Cache warming: Populating model's cache</li>
                        </ul>
                        
                        <p><strong>Note:</strong> This is a demo version. <br>
                        In a production environment, interactions would be significantly faster after the initial load.</p>
                    </div>
                `}
            />
        </Context.Provider>
    );
};

export default ContextProvider;
