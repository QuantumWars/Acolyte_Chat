import React from 'react';

const Dialog = ({ isOpen, onClose, title, content }) => {
  if (!isOpen) return null;

  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <div className="dialog-content" dangerouslySetInnerHTML={{ __html: content }} />
        <button onClick={onClose} className="dialog-close-button">I Understand</button>
      </div>
    </div>
  );
};

export default Dialog;