import React, { useContext, useEffect, useRef } from "react";
import { Compass, SendHorizontal, Book, Microscope, Stethoscope } from 'lucide-react'
import Notebook from '../../assets/notebook-tabs.png'
import './Main.css'
import { Context } from "../../context/Context.jsx";

const Main = () => {
    const { 
        chatSessions, 
        currentModel, 
        updateCurrentInput, 
        sendMessage,
        loading,
        displayedResponse,
        sendCardQuery
    } = useContext(Context);

    const currentSession = currentModel ? chatSessions[currentModel] : null;
    const resultRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (resultRef.current) {
            resultRef.current.scrollTop = resultRef.current.scrollHeight;
        }
    }, [currentSession]);

    const handleInputChange = (e) => {
        updateCurrentInput(e.target.value);
    };

    const handleSend = () => {
        if (currentSession && currentSession.currentInput.trim() !== '') {
            sendMessage();
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleCardClick = (query) => {
        sendCardQuery(query);
    };

    const showResults = currentSession && currentSession.prompts.length > 0;

    const modelCards = {
        pdf_test1: [
            { text: "What is temptation-resistant voluntary exercise (TRVE) and how was it observed in mice?", icon: Stethoscope },
            { text: "How did orexin receptor antagonism affect mice's preference for wheel running versus high-palatable food?", icon: Microscope },
            { text: "What role do hypocretin/orexin neurons (HONs) play in arbitrating between eating and exercise behaviors?", icon: Stethoscope },
            { text: "How did HON stimulation affect food vs. wheel choice?", icon: Microscope }
        ],pdf_test2: [
            { text: "What are the main types of keratinocytic skin cancers and how common are they?", icon: Stethoscope },
            { text: "What are some key genetic alterations found in basal cell carcinomas?", icon: Microscope },
            { text: "How Hedgehog signaling pathway led to new targeted therapies for basal cell carcinoma?", icon: Stethoscope },
            { text: "What role does UV radiation play in the development of cutaneous squamous cell carcinomas?", icon: Microscope }
        ],
        pdf_test3: [
            { text: "What was the purpose of establishing the Intergovernmental Working Group?", icon: Stethoscope },
            { text: "What are some of the key elements included in the global strategy and plan of action?", icon: Microscope },
            { text: "Why promote research and development was promoted for diseases that disproportionately affect developing countries?", icon: Stethoscope },
            { text: "What recommendations does the strategy make regarding intellectual property rights and access to medicines?", icon: Microscope }
        ]
        // ... other model cards
    };

    const currentCards = modelCards[currentModel] || modelCards.pdf_test1;

    return (
        <div className="main">
            <div className="nav">
                <p>Acolyte</p>
            </div>
            <div className="main-container">
                {!showResults ? (
                    <>
                        <div className="greet">
                            <p><span>Hello, to be Doctor.</span></p>
                            <p>How can I be your companion?</p>
                        </div>
                        <div className="cards">
                            {currentCards.map((card, index) => (
                                <div key={index} className="card" onClick={() => handleCardClick(card.text)}>
                                    <p>{card.text}</p>
                                    <div className="img">{React.createElement(card.icon)}</div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="result" ref={resultRef}>
                        {currentSession.prompts.map((prompt, index) => (
                            <div key={index}>
                                <div className="result-title">
                                    <p>{prompt}</p>
                                </div>
                                <div className="result-data">
                                    {index === currentSession.prompts.length - 1 && loading ? (
                                        <div className="loader">
                                            <hr /><hr /><hr />
                                        </div>
                                    ) : (
                                        <p dangerouslySetInnerHTML={{ __html: currentSession.responses[index] || '' }}></p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                
            </div>
            <div className="main-bottom">
                    <div className="search-box">
                        <input 
                            ref={inputRef}
                            onChange={handleInputChange} 
                            onKeyPress={handleKeyPress}
                            value={currentSession ? currentSession.currentInput : ''} 
                            type="text" 
                            placeholder="Enter your question" 
                        />
                        <button onClick={handleSend} className="send-button">
                            <SendHorizontal />
                        </button>
                    </div>
                </div>
           
        </div>
    )
}

export default Main;
