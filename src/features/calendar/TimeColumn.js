import React from 'react';

const TimeColumn = React.memo(() => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className="time-column" style={{ width: '80px', flexShrink: 0, backgroundColor: '#F9FAFB', borderRight: '1px solid #E5E7EB' }}>
      {hours.map(h => (
        <div key={h} style={{ height: '60px', borderBottom: '1px solid #F3F4F6', fontSize: '11px', color: '#6B7280', display: 'flex', justifyContent: 'center', paddingTop: '10px' }}>
          {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h-12} PM`}
        </div>
      ))}
    </div>
  );
});

export default TimeColumn;
