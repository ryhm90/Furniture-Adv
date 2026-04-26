import React, { useState } from 'react';
import './EditModal.css'; // Import CSS file for styles

const EditModal = ({ row, onSave, onCancel }) => {
    const [name, setName] = useState(row.name);
    const [email, setEmail] = useState(row.email);
    const [type, setType] = useState(row.type);

    const handleSave = () => {
        onSave({ ...row, name, email, type });
    };

    return (
        <div className="edit-modal-background">
            <div className="edit-modal-container">
                <h2>Edit Record</h2>
                <div className="edit-modal-content">
                    <label>Name:</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} />

                    <label>Email:</label>
                    <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} />

                    <label>Type:</label>
                    <input type="text" value={type} onChange={(e) => setType(e.target.value)} />
                </div>
                <div className="edit-modal-buttons">
                    <button className="save-button" onClick={handleSave}>Save</button>
                    <button className="cancel-button" onClick={onCancel}>Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default EditModal;