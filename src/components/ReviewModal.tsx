import { useState, useEffect } from 'react';
import { Star, X } from 'lucide-react';
import { createReview, getReviewByContractAndReviewer } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

import toast from 'react-hot-toast';
import type { ReviewInsert } from '../types/database';

interface Props {
  contractId: string;
  revieweeId: string;
  revieweeName: string;
  role: 'client_to_freelancer' | 'freelancer_to_client';
  onClose: () => void;
}

export default function ReviewModal({ contractId, revieweeId, revieweeName, role, onClose }: Props) {
  const { profile } = useAuth();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  useEffect(() => {
    if (profile) {
      getReviewByContractAndReviewer(contractId, profile.id).then(({ data }) => {
        if (data) setAlreadyReviewed(true);
      });
    }
  }, [contractId, profile]);

  if (alreadyReviewed) {
    return (
      <div className="gen-modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
        <div className="gen-modal-card gen-card" style={{ maxWidth: 400, width: '90%', padding: 28, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
          <p style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>You have already reviewed this contract.</p>
          <button onClick={onClose} className="gen-btn-ghost" style={{ marginTop: 16, padding: '8px 20px', fontSize: 13 }}>Close</button>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (rating === 0 || !profile) return;
    setLoading(true);
    const review: ReviewInsert = {
      contract_id: contractId,
      reviewer_id: profile.id,
      reviewee_id: revieweeId,
      rating,
      comment: comment.trim() || null,
      role,
    };
    const { error } = await createReview(review);
    if (error) {
      toast.error('Failed to submit review');
    } else {
      toast.success('Review submitted!');
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="gen-modal-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div className="gen-modal-card gen-card" style={{ maxWidth: 440, width: '90%', padding: 28 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Rate {revieweeName}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        {/* Stars */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} onClick={() => setRating(s)} onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, transition: 'transform 0.15s', transform: (hovered >= s || rating >= s) ? 'scale(1.15)' : 'scale(1)' }}>
              <Star size={28} fill={(hovered >= s || rating >= s) ? '#f59e0b' : 'none'} color={(hovered >= s || rating >= s) ? '#f59e0b' : 'var(--text-muted)'} />
            </button>
          ))}
        </div>

        {rating > 0 && (
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Very Good' : 'Excellent'}
          </p>
        )}

        <textarea
          value={comment} onChange={(e) => setComment(e.target.value)}
          placeholder="Write your review (optional)..."
          className="gen-input"
          style={{ width: '100%', minHeight: 100, resize: 'vertical', marginBottom: 16, fontSize: 13 }}
        />

        <button onClick={handleSubmit} disabled={rating === 0 || loading} className="gen-btn-primary"
          style={{ width: '100%', padding: '10px 0', fontSize: 13, opacity: rating === 0 ? 0.5 : 1 }}>
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </div>
  );
}
