import { useState } from "react";
import { Button } from "./Button";
import Modal from 'react-bootstrap/Modal';
import { performAction, deleteEyeball } from "../api";

const GenericActionPopup = ({ action, onConfirm, onCancel }: { action: string, onConfirm: (action: string) => void, onCancel: () => void }) => {
    return (
        <Modal show={true} onHide={onCancel} data-bs-theme='dark' className="text-light">
            <Modal.Header closeButton>
                <h5 className="modal-title">Confirm {action}</h5>
            </Modal.Header>
            <Modal.Body className="text-start">
                <p>Are you sure you want to {action.toLowerCase()}?</p>
            </Modal.Body>
            <Modal.Footer className="d-flex flex-row gap-2">
                <Button onClick={onCancel}>Cancel</Button>
                <Button className="btn-outline-danger" onClick={() => onConfirm(action)}>{action[0].toUpperCase() + action.slice(1)} Process</Button>
            </Modal.Footer>
        </Modal>
    );
}

const Actions = ({ direction, uuid, exited, onAction }: { direction: 'row' | 'column', uuid: string, exited: boolean, onAction: (deleted: boolean) => void }) => {
    const [showPopup, setShowPopup] = useState(false);
    const [action, setAction] = useState('');

    const handleAction = async (action: string) => {
        console.log("Handling action", action);
        if (action === 'delete') {
            await deleteEyeball(uuid);
        } else {
            await performAction(uuid, action);
        }
        onAction(action === 'delete');
    }

    const buttonClassName = direction === 'row' ? 'w-25' : 'w-100';

    return <div className={`col gy-3 me-1 align-items-center h-100 align-content-center`}>
        {!exited && <Button className={buttonClassName} onClick={() => { setAction('restart'); setShowPopup(true); }}>Restart</Button>}
        {!exited && <Button className={buttonClassName} onClick={() => { setAction('exit'); setShowPopup(true); }}>Exit</Button>}
        {exited && <Button className={buttonClassName} onClick={() => { setAction('delete'); setShowPopup(true); }}>Delete</Button>}
        {showPopup && <GenericActionPopup action={action} onConfirm={(action) => { setShowPopup(false); handleAction(action); }} onCancel={() => { setShowPopup(false); }} />}
    </div>;
}

export default Actions;