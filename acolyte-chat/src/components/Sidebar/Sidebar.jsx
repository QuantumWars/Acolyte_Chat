
import React, { useContext, useState } from "react";
import './Sidebar.css';
import { Menu, CircleHelp, Settings, History, Database, Link } from 'lucide-react';
import { Context } from "../../context/Context.jsx";

const Sidebar = ({ extended, setExtended }) => {
    const [activePopup, setActivePopup] = useState(null);
    const { createNewSession } = useContext(Context);

    const ragModels = [
        { 
            name: "Orexin neurons ...", 
            id: "pdf_test1",
            reference: "https://www.nature.com/articles/s41593-024-01696-2#:~:text=Our%20results%20provide%20evidence%20that,control%20of%20eating%20or%20running.",
        },
        { 
            name: "Keratinocytic skin ...", 
            id: "pdf_test2",
            reference: "https://acsjournals.onlinelibrary.wiley.com/doi/full/10.1002/cncr.34635#:~:text=Plain%20Language%20Summary,carcinomas%20and%20squamous%20cell%20carcinomas.",
        },
        { 
            name: "Case study ...", 
            id: "pdf_test3",
            reference: "https://www.econstor.eu/bitstream/10419/232153/1/south-centre-rp-035.pdf",
        },
    ];

    const handleModelSelect = (modelId) => {
        createNewSession(modelId);
        setExtended(false); // Close the sidebar when a model is selected

    };

    const handlePopupToggle = (id) => {
        setActivePopup(activePopup === id ? null : id);
    };

    const handleLinkClick = (e, reference) => {
        e.stopPropagation();
        window.open(reference, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className={`sidebar ${extended ? 'extended' : ''}`}>
            <div className="top">
                <Menu onClick={() => setExtended(prev => !prev)} />
                
                {extended && (
                    <div className="section">
                        <p className="section-title">Samples</p>
                        <div className="section-content">
                            {ragModels.map(model => (
                                <div key={model.id} className="rag-model-entry-container">
                                    <div 
                                        className="rag-model-entry"
                                        onClick={() => handleModelSelect(model.id)}
                                    >
                                    
                                        <Database size={18} />
                                        <p>{model.name}</p>
                                        <div 
                                            className="reference-link-icon"
                                            onClick={(e) => handleLinkClick(e, model.reference)}
                                            onMouseEnter={() => handlePopupToggle(model.id)}
                                            onMouseLeave={() => handlePopupToggle(null)}
                                        >
                                            <Link size={14} />
                                        </div>
                                    </div>
                                    {activePopup === model.id && (
                                        <div className="reference-popup">
                                            <p>Reference:</p>
                                            <a 
                                                href={model.reference} 
                                                onClick={(e) => handleLinkClick(e, model.reference)}
                                                className="reference-link"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {model.reference}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <div className="bottom">
                <div className="bottom-item">
                <a href="https://www.myacolyte.in/contact" className="bottom-item" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>

                    <CircleHelp />
                    {extended && <p>Help</p>}
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
