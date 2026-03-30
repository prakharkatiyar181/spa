import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createBooking, updateBooking, cancelBooking, deleteBooking } from './bookingCrudThunks';
import { fetchServiceCategories } from '../service/serviceSlice';
import { fetchRooms } from '../room/roomSlice';
import { selectAllTherapists } from '../therapist/therapistSlice';
import './BookingFormModal.css';

const BookingFormModal = ({ booking, initialData, onClose }) => {
  const dispatch = useDispatch();
  const therapists = useSelector(selectAllTherapists);
  const serviceCategories = useSelector(state => state.service.categories);
  const rooms = useSelector(state => state.room.list);
  const user = useSelector(state => state.auth.user);

  const [formData, setFormData] = useState({
    customer: booking?.customer || '',
    service: booking?.serviceId || '',
    therapist: booking?.therapistId || initialData?.therapistId || '',
    room: booking?.roomId || '',
    startTime: booking?.startTime?.split('T')[1]?.substring(0, 5) || initialData?.time || '09:00',
    date: booking?.startTime?.split('T')[0] || initialData?.date || new Date().toISOString().split('T')[0],
    duration: booking?.duration || 60,
    note: booking?.note || ''
  });

  useEffect(() => {
    dispatch(fetchServiceCategories());
    if (user?.outlet_id) {
      dispatch(fetchRooms(user.outlet_id));
    }
  }, [dispatch, user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Transform to API format
    const startTime = `${formData.date} ${formData.startTime}:00`;
    // Dummy end time calculation for payload
    const endTime = `${formData.date} ${formData.startTime}:00`; 

    const items = [{
      service: formData.service,
      start_time: startTime,
      end_time: endTime,
      duration: formData.duration,
      therapist: formData.therapist,
      room_segments: [{
        room_id: formData.room,
        start_time: startTime,
        end_time: endTime,
        duration: formData.duration
      }]
    }];

    const payload = {
      company: user?.company_id || 1,
      outlet: user?.outlet_id || 1,
      outlet_type: 1,
      booking_type: 1,
      customer: formData.customer,
      items: items,
      service_at: startTime,
      note: formData.note,
      payment_type: 1,
      source: 1
    };

    if (booking) {
      dispatch(updateBooking({ id: booking.bookingId, data: payload }));
    } else {
      dispatch(createBooking(payload));
    }
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content side-panel">
        <div className="modal-header">
          <h2>{booking ? 'Edit Booking' : 'New Appointment'}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="booking-form">
          <div className="form-section">
            <label>Customer Name</label>
            <input 
              type="text" 
              value={formData.customer} 
              onChange={e => setFormData({...formData, customer: e.target.value})} 
              required 
            />
          </div>

          <div className="form-grid">
            <div className="form-section">
              <label>Service</label>
              <select value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})} required>
                <option value="">Select Service</option>
                {serviceCategories.map(cat => (
                  <optgroup key={cat.id} label={cat.name}>
                    {cat.services?.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="form-section">
              <label>Therapist</label>
              <select value={formData.therapist} onChange={e => setFormData({...formData, therapist: e.target.value})} required>
                {therapists.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-section">
              <label>Room</label>
              <select value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} required>
                <option value="">Select Room</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.room_name}</option>
                ))}
              </select>
            </div>
            <div className="form-section">
              <label>Duration (mins)</label>
              <input 
                type="number" 
                value={formData.duration} 
                onChange={e => setFormData({...formData, duration: e.target.value})} 
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-section">
              <label>Date</label>
              <input 
                type="date" 
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})} 
              />
            </div>
            <div className="form-section">
              <label>Time</label>
              <input 
                type="time" 
                value={formData.startTime} 
                onChange={e => setFormData({...formData, startTime: e.target.value})} 
              />
            </div>
          </div>

          <div className="form-section">
            <label>Notes</label>
            <textarea 
              value={formData.note} 
              onChange={e => setFormData({...formData, note: e.target.value})} 
            />
          </div>

          <div className="form-actions">
            {booking && (
              <>
                <button type="button" className="btn-cancel" onClick={() => dispatch(cancelBooking(booking.id))}>Cancel Booking</button>
                <button type="button" className="btn-delete" onClick={() => dispatch(deleteBooking(booking.bookingId))}>Delete</button>
              </>
            )}
            <button type="submit" className="btn-save">Save Booking</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingFormModal;
