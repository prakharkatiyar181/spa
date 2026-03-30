import React from 'react';

const TimeColumn = React.memo(() => {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="time-column">
      {hours.map(h => (
        <div key={h} className="time-slot-label">
          <span className="time-slot-label__hour">
            {`${String(h).padStart(2, '0')}.00`}
          </span>
          <span className="time-slot-label__period">
            {h < 12 ? 'AM' : 'PM'}
          </span>
        </div>
      ))}
    </div>
  );
});

export default TimeColumn;
