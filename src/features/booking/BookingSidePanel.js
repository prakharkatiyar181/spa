import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { closePanel, selectSelectedBookingId } from '../ui/uiSlice';
import { updateBooking, cancelBooking, deleteBooking } from './bookingCrudThunks';
import { fetchServiceCategories } from '../service/serviceSlice';
import { fetchRooms } from '../room/roomSlice';
import { selectAllTherapists } from '../therapist/therapistSlice';
import { format, parseISO } from 'date-fns';
import './BookingSidePanel.css';

const BookingSidePanel = () => {
  const dispatch = useDispatch();
  const selectedId = useSelector(selectSelectedBookingId);
  const booking = useSelector(state => state.booking.byId[selectedId]);
  const therapists = useSelector(selectAllTherapists);
  const serviceCategories = useSelector(state => state.service.categories);
  const rooms = useSelector(state => state.room.list);
  const user = useSelector(state => state.auth.user);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    if (booking) {
      setFormData({
        customer: booking.customer,
        therapistId: booking.therapistId,
        serviceId: booking.serviceId || '',
        roomId: booking.roomId || '',
        note: booking.note || '',
        startTime: format(parseISO(booking.startTime), "HH:mm"),
        date: format(parseISO(booking.startTime), "yyyy-MM-dd")
      });
    }
  }, [booking]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') dispatch(closePanel());
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [dispatch]);

  if (!booking) return null;

  const handleSave = () => {
    const startTime = `${formData.date} ${formData.startTime}:00`;
    const payload = {
      company: user?.company_id || 1,
      outlet: user?.outlet_id || 1,
      customer: formData.customer,
      items: [{
        service: formData.serviceId,
        start_time: startTime,
        duration: booking.duration,
        therapist: formData.therapistId,
        room_segments: [{ room_id: formData.roomId, duration: booking.duration }]
      }],
      service_at: startTime,
      note: formData.note
    };

    dispatch(updateBooking({ id: booking.bookingId, data: payload }));
    setIsEditing(false);
  };

  return (
    <div className="side-panel-overlay" onClick={() => dispatch(closePanel())}>
      <div className="booking-side-panel" onClick={e => e.stopPropagation()}>
        <div className="panel-header">
          <h2>Booking Details</h2>
          <button className="close-panel-btn" onClick={() => dispatch(closePanel())}>&times;</button>
        </div>

        <div className="panel-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '24px' }}>{booking.customer}</h3>
              <span className={`status-badge status-${booking.status.toLowerCase().replace(' ', '-')}`}>
                {booking.status}
              </span>
            </div>
            <button className="edit-toggle-btn" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {isEditing ? (
            <div className="booking-edit-form">
              <div className="detail-group">
                <label className="detail-label">Service</label>
                <select 
                  value={formData?.serviceId} 
                  onChange={e => setFormData({...formData, serviceId: e.target.value})}
                  style={{ width: '100%', padding: '10px' }}
                >
                  <option value="">Select Service</option>
                  {serviceCategories.map(cat => (
                    <optgroup key={cat.id} label={cat.name}>
                      {cat.services?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="detail-group">
                <label className="detail-label">Therapist</label>
                <select 
                  value={formData?.therapistId} 
                  onChange={e => setFormData({...formData, therapistId: e.target.value})}
                  style={{ width: '100%', padding: '10px' }}
                >
                  {therapists.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div className="detail-group">
                <label className="detail-label">Room</label>
                <select 
                  value={formData?.roomId} 
                  onChange={e => setFormData({...formData, roomId: e.target.value})}
                  style={{ width: '100%', padding: '10px' }}
                >
                  <option value="">Select Room</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.room_name}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <>
              <div className="detail-group">
                <label className="detail-label">Service</label>
                <div className="detail-value">{booking.service}</div>
              </div>

              <div className="detail-group">
                <label className="detail-label">Therapist</label>
                <div className="detail-value">{booking.therapistName}</div>
              </div>

              <div className="detail-group">
                <label className="detail-label">Room</label>
                <div className="detail-value">{booking.room || 'Not assigned'}</div>
              </div>

              <div className="detail-group">
                <label className="detail-label">Scheduled Time</label>
                <div className="detail-value">
                  {format(parseISO(booking.startTime), "do MMM yyyy, h:mm a")}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="panel-footer">
          {isEditing ? (
            <button className="btn-primary" onClick={handleSave}>Save Changes</button>
          ) : (
            <>
              <button className="btn-primary" onClick={() => {/* status update logic */}}>Check-in Customer</button>
              <button className="btn-outline-danger" onClick={() => dispatch(cancelBooking(booking.id))}>Cancel Booking</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingSidePanel;
