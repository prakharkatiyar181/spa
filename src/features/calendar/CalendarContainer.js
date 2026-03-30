import React from 'react';
import CalendarGrid from './CalendarGrid';

const CalendarContainer = () => {
  return (
    <div className="calendar-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <header style={{ height: '60px', padding: '0 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', backgroundColor: '#FFF' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>SPA Booking System</h1>
      </header>
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <CalendarGrid />
      </main>
    </div>
  );
};

export default CalendarContainer;
