import React, { useState } from 'react';
import './StarRating.css';

function StarRating({ rating, onRate, readonly = false }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className={`star-rating ${readonly ? 'readonly' : ''}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star ${star <= (hovered || rating || 0) ? 'filled' : ''}`}
          onClick={() => !readonly && onRate && onRate(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default StarRating;
