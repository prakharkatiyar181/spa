import React from 'react';

const STATUS_COLORS = {
  'Confirmed': { bg: '#DBEAFE', border: '#3B82F6' },
  'Check-in': { bg: '#FCE7F3', border: '#EC4899' },
  'Cancelled': { bg: '#F3F4F6', border: '#9CA3AF' }
};

const BookingBlock = React.memo(({ booking, onClick, onDragStart, isDragging }) => {
  const colors = STATUS_COLORS[booking.status] || STATUS_COLORS['Confirmed'];

  const handlePointerDown = (e) => {
    // Only start drag on left click and not on the "edit" action if it were a separate button
    if (e.button !== 0) return;
    onDragStart(e, booking);
  };

  return (
    <div 
      className={`booking-block ${isDragging ? 'is-dragging' : ''}`}
      onPointerDown={handlePointerDown}
      onClick={(e) => {
        // Prevent click if we just dragged
        if (e.defaultPrevented) return;
        onClick(booking);
      }}
      style={{
        position: 'absolute',
        top: `${booking.top}px`,
        height: `${booking.height}px`,
        left: booking.left,
        width: booking.width,
        backgroundColor: colors.bg,
        borderLeft: `4px solid ${colors.border}`,
        padding: '8px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: isDragging ? 1000 : 10,
        opacity: isDragging ? 0.5 : 1,
        boxShadow: isDragging ? '0 8px 16px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
        cursor: 'move',
        userSelect: 'none',
        touchAction: 'none', // Critical for pointer events
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        transition: isDragging ? 'none' : 'transform 0.1s, box-shadow 0.1s'
      }}
    >
      <div style={{ fontWeight: 700, color: '#111827', pointerEvents: 'none' }}>
        {booking.customer}
      </div>
      <div style={{ color: '#374151', pointerEvents: 'none' }}>
        {booking.service}
      </div>
    </div>
  );
});

export default BookingBlock;
