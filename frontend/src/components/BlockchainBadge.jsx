import { useState } from 'react';
import api from '../api/axios';
import './BlockchainBadge.css';

/**
 * BlockchainBadge — Shows blockchain verification status for a record.
 * 
 * Props:
 *   - type: 'marks' | 'achievement' | 'attendance'
 *   - recordId: MongoDB _id of the record
 *   - showButton: whether to show a "Verify" button (default: true)
 *   - compact: use a small inline badge (default: false)
 */
const BlockchainBadge = ({ type, recordId, showButton = true, compact = false }) => {
    const [status, setStatus] = useState(null); // null | 'loading' | 'verified' | 'unverified' | 'not_found' | 'error'
    const [details, setDetails] = useState(null);

    const verify = async () => {
        setStatus('loading');
        try {
            const res = await api.get(`/blockchain/verify/${type}/${recordId}`);
            const data = res.data.data;

            if (data.verified) {
                setStatus('verified');
            } else if (data.error === 'Record not found on blockchain') {
                setStatus('not_found');
            } else {
                setStatus('unverified');
            }
            setDetails(data);
        } catch (err) {
            setStatus('error');
            setDetails({ error: err.response?.data?.error || err.message });
        }
    };

    const getIcon = () => {
        switch (status) {
            case 'verified': return '🔗✅';
            case 'unverified': return '🔗⚠️';
            case 'not_found': return '🔗❌';
            case 'loading': return '⏳';
            case 'error': return '🔗❌';
            default: return '🔗';
        }
    };

    const getLabel = () => {
        switch (status) {
            case 'verified': return 'Blockchain Verified';
            case 'unverified': return 'Tamper Detected!';
            case 'not_found': return 'Not on Blockchain';
            case 'loading': return 'Verifying...';
            case 'error': return 'Verification Failed';
            default: return 'Verify on Blockchain';
        }
    };

    const getStatusClass = () => {
        switch (status) {
            case 'verified': return 'bc-badge--verified';
            case 'unverified': return 'bc-badge--tampered';
            case 'not_found': return 'bc-badge--notfound';
            case 'loading': return 'bc-badge--loading';
            case 'error': return 'bc-badge--error';
            default: return 'bc-badge--neutral';
        }
    };

    if (compact) {
        return (
            <span
                className={`bc-badge bc-badge--compact ${getStatusClass()}`}
                onClick={verify}
                title={details?.storedAt ? `Stored: ${new Date(details.storedAt).toLocaleString()}` : 'Click to verify'}
            >
                {getIcon()} {status ? getLabel() : '🔗'}
            </span>
        );
    }

    return (
        <div className={`bc-badge ${getStatusClass()}`}>
            <div className="bc-badge__content">
                <span className="bc-badge__icon">{getIcon()}</span>
                <span className="bc-badge__label">{getLabel()}</span>
            </div>

            {showButton && !status && (
                <button className="bc-badge__btn" onClick={verify}>
                    Verify
                </button>
            )}

            {status === 'loading' && (
                <div className="bc-badge__spinner"></div>
            )}

            {status && status !== 'loading' && details && (
                <div className="bc-badge__details">
                    {details.storedAt && (
                        <span className="bc-badge__detail">
                            📅 {new Date(details.storedAt).toLocaleString()}
                        </span>
                    )}
                    {details.warning && (
                        <span className="bc-badge__detail bc-badge__detail--warning">
                            ⚠️ {details.warning}
                        </span>
                    )}
                </div>
            )}

            {showButton && status && status !== 'loading' && (
                <button className="bc-badge__btn bc-badge__btn--retry" onClick={verify}>
                    Re-verify
                </button>
            )}
        </div>
    );
};

export default BlockchainBadge;
