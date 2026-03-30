import React from 'react';
import { useSelector } from 'react-redux';
import { selectAuthUser } from '../auth/authSlice';
import CalendarGrid from './CalendarGrid';

const CalendarContainer = () => {
  const user = useSelector(selectAuthUser);
  const userInitials = `${user?.name?.[0] || ''}${user?.lastname?.[0] || ''}`.trim().toUpperCase() || 'U';
  const navItems = ['Home', 'Therapists', 'Sales', 'Clients', 'Transactions', 'Reports'];

  return (
    <div className="calendar-shell">
      <header className="calendar-shell__topbar">
        <div className="calendar-shell__brand">Logo</div>
        <nav className="calendar-shell__nav" aria-label="Primary">
          {navItems.map((item) => (
            <button
              key={item}
              type="button"
              className={`calendar-shell__navItem ${item === 'Home' ? 'is-active' : ''}`}
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="calendar-shell__actions">
          <button type="button" className="calendar-shell__iconButton" aria-label="Notifications">
            N
          </button>
          <div className="calendar-shell__avatar" aria-label={user?.name || 'User'}>
            {userInitials}
          </div>
        </div>
      </header>
      <main className="calendar-shell__content">
        <CalendarGrid />
      </main>
    </div>
  );
};

export default CalendarContainer;
