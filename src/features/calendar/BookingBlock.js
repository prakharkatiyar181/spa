import React from 'react';

const STATUS_CLASSES = {
  confirmed: 'booking-card--confirmed',
  unconfirmed: 'booking-card--unconfirmed',
  'checked-in': 'booking-card--checked-in',
  completed: 'booking-card--completed',
  cancelled: 'booking-card--cancelled',
  'no-show': 'booking-card--no-show',
  holding: 'booking-card--holding',
  'in-progress': 'booking-card--in-progress',
};

const normalizeStatus = (status) => {
  const value = String(status || '').trim().toLowerCase();

  if (value === 'confirmed') return 'confirmed';
  if (value === 'unconfirmed') return 'unconfirmed';
  if (value === 'checked in') return 'checked-in';
  if (value === 'completed') return 'completed';
  if (value === 'cancelled' || value === 'canceled') return 'cancelled';
  if (value === 'no-show' || value === 'no show') return 'no-show';
  if (value === 'holding') return 'holding';
  if (value === 'check-in' || value === 'check in' || value === 'check-in (in progress)') {
    return 'in-progress';
  }

  return 'confirmed';
};

const BookingBlock = React.memo(({ booking, onClick, onDragStart, isDragging }) => {
  const statusClass = STATUS_CLASSES[normalizeStatus(booking.status)] || STATUS_CLASSES.confirmed;

  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    onDragStart(e, booking);
  };

  const metaTokens = [
    booking.status ? booking.status.slice(0, 1).toUpperCase() : 'S',
    booking.room ? 'R' : 'N',
    booking.duration ? `${booking.duration}` : '0',
  ];

  return (
    <div 
      className={`booking-card ${statusClass} ${isDragging ? 'is-dragging' : ''}`}
      onPointerDown={handlePointerDown}
      onClick={(e) => {
        if (e.defaultPrevented) return;
        onClick(booking.id);
      }}
      style={{
        position: 'absolute',
        top: `${booking.top}px`,
        height: `${booking.height}px`,
        left: booking.left,
        width: booking.width,
        zIndex: isDragging ? 1000 : 10,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        userSelect: 'none',
        touchAction: 'none',
        transition: isDragging ? 'none' : 'transform 0.1s, box-shadow 0.1s',
      }}
    >
      <div className="booking-card__duration">{booking.duration} Min</div>
      <div className="booking-card__service">{booking.service}</div>
      <div className="booking-card__reference">{booking.bookingId || booking.id}</div>
      <div className="booking-card__customer">{booking.customer}</div>
      <div className="booking-card__meta">
        {metaTokens.map((token) => (
          <span key={`${booking.id}-${token}`} className="booking-card__metaBadge">
            {token}
          </span>
        ))}
      </div>
    </div>
  );
});

export default BookingBlock;
