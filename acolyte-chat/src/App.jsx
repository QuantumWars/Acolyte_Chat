import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar/Sidebar';
import Main from './components/Main/Main';
import Dialog from './components/Dialog';

function App() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSidebarExtended, setIsSidebarExtended] = useState(true);

  useEffect(() => {
    setIsDialogOpen(true);
  }, []);
  const dialogContent = `
    <h2>🏥 Important Notice for Medical Students 🏥</h2>

    <p>⚠️ Please be aware that this AI study companion is an educational tool, not a substitute for professional medical advice, diagnosis, or treatment.</p>

    <p><strong>📚 Disclaimer:</strong> This AI has been trained on information from three primary sources:</p>

    <ol>
      <li>🧠 Orexin neurons mediate temptation-resistant voluntary exercise</li>
      <li>🦠 Keratinocytic skin cancers—Update on the molecular biology</li>
      <li>🌍 The Case of recent negotiations on the global strategy on public health, innovation and intellectual property</li>
    </ol>

    <p>You can view these references here:</p>

    <ul>
      <li>🔬 Orexin neurons: <a href="https://www.nature.com/articles/s41593-024-01696-2#:~:text=Our%20results%20provide%20evidence%20that,control%20of%20eating%20or%20running." target="_blank" rel="noopener noreferrer">View Reference</a></li>
      <li>🔬 Keratinocytic skin cancers: <a href="https://acsjournals.onlinelibrary.wiley.com/doi/full/10.1002/cncr.34635#:~:text=Plain%20Language%20Summary,carcinomas%20and%20squamous%20cell%20carcinomas." target="_blank" rel="noopener noreferrer">View Reference</a></li>
      <li>🔬 Case study: <a href="https://www.econstor.eu/bitstream/10419/232153/1/south-centre-rp-035.pdf" target="_blank" rel="noopener noreferrer">View Reference</a></li>
    </ul>

    <p>⚠️ This AI companion is still in the testing phase. While it can assist with your studies, always verify information with your instructors and current medical literature.</p>

    <p>❓ You may ask questions based on these sources, but remember to use this tool as a supplement to your medical education, not a replacement for comprehensive study or clinical judgment.</p>
  `
  const handleMainClick = () => {
    setIsSidebarExtended(false);
  };

  return (
    <div className="app-container">
      <Sidebar extended={isSidebarExtended} setExtended={setIsSidebarExtended} />
      <div className="main-content">
        <Main onMainClick={handleMainClick} />
        
      </div>
{/*       <div className='bottom-info'>
          <p>
            <strong>Waitlist Demo:</strong> Experience the future of medical education. Join our waitlist to be notified when full access becomes available!
          </p>
        </div> */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Medical AI Study Companion - Disclaimer"
        content={dialogContent}
      />
    </div>
  );
}

export default App;

