import React, { useContext, useState } from "react";
import './Sidebar.css';
import { Menu, Plus, CircleHelp, Settings, History, Database } from 'lucide-react';
import { Context } from "../../context/Context.jsx";

const Sidebar = () => {
    const [extended, setExtended] = useState(false);
    const [expandedSection, setExpandedSection] = useState(null);
    const { createNewSession } = useContext(Context);

    const ragModels = [
        { name: "Orexin neurons ...", id: "pdf_test1" },
        { name: " Keratinocytic skin ...", id: "pdf_test2" },
        { name: "Case of recent ...", id: "pdf_test3" },
    ];

    const toggleSection = (section) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const handleModelSelect = (modelId) => {
        createNewSession(modelId);
    };

    return (
        <div className={`sidebar ${extended ? 'extended' : ''}`}>
            <div className="top">
                <Menu onClick={() => setExtended(prev => !prev)} />
                
                {extended && (
                    <div className="section">
                        <p className="section-title" onClick={() => toggleSection('rag')}>Samples</p>
                        {expandedSection === 'rag' && (
                            <div className="section-content">
                                {ragModels.map(model => (
                                    <div key={model.id} className="rag-model-entry" onClick={() => handleModelSelect(model.id)}>
                                        <Database size={18} />
                                        <p>{model.name}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className="bottom">
                <div className="bottom-item">
                    <CircleHelp />
                    {extended && <p>Help</p>}
                </div>
                <div className="bottom-item">
                    <History />
                    {extended && <p>Activity</p>}
                </div>
                <div className="bottom-item">
                    <Settings />
                    {extended && <p>Settings</p>}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
