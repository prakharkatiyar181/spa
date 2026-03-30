import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBookings, buildBookingListParams, extractBookingsList } from '../booking/bookingThunk';
import { selectBookingsByTherapist } from '../booking/bookingSelectors';
import { fetchTherapists, selectAllTherapists } from '../therapist/therapistSlice';
import { rescheduleBooking, rollback, mergeBookingsIncremental } from '../booking/bookingSlice';
import { updateBooking } from '../booking/bookingCrudThunks';
import { openPanel, selectIsPanelOpen, selectSelectedBookingId } from '../ui/uiSlice';
import TimeColumn from './TimeColumn';
import TherapistHeader from './TherapistHeader';
import BookingBlock from './BookingBlock';
import BookingFormModal from '../booking/BookingFormModal';
import BookingSidePanel from '../booking/BookingSidePanel';
import { parseISO, format, addMinutes } from 'date-fns';
import apiClient from '../../api/apiClient';
import './CalendarGrid.css';

const COLUMN_WIDTH = 200;
const SNAP_INTERVAL = 15;
const POLLING_INTERVAL = 15000;

const TherapistColumn = React.memo(({ therapistId, style, onEditBooking, onCreateBooking, onDragStart, draggingId }) => {
  const bookings = useSelector(state => selectBookingsByTherapist(state, therapistId));
  
  const handleColumnClick = useCallback((e) => {
    if (e.target.className.includes('therapist-column')) {
      const rect = e.currentTarget.getBoundingClientRect();
      const minutes = Math.floor(e.clientY - rect.top);
      const hours = Math.floor(minutes / 60);
      const snappedMins = Math.round((minutes % 60) / SNAP_INTERVAL) * SNAP_INTERVAL;
      onCreateBooking(therapistId, `${hours.toString().padStart(2, '0')}:${snappedMins.toString().padStart(2, '0')}`);
    }
  }, [therapistId, onCreateBooking]);

  return (
    <div 
      className="therapist-column" 
      onClick={handleColumnClick}
      style={{ ...style, height: '1440px', borderRight: '1px solid #F3F4F6', background: 'linear-gradient(to bottom, #F3F4F6 1px, transparent 1px)', backgroundSize: '100% 15px', cursor: 'crosshair' }}
    >
      {bookings.map(booking => (
        <BookingBlock key={booking.id} booking={booking} onClick={onEditBooking} onDragStart={onDragStart} isDragging={draggingId === booking.id} />
      ))}
    </div>
  );
});

const CalendarGrid = () => {
  const dispatch = useDispatch();
  const therapists = useSelector(selectAllTherapists);
  const user = useSelector(state => state.auth.user);
  const isPanelOpen = useSelector(selectIsPanelOpen);
  const selectedBookingId = useSelector(selectSelectedBookingId);
  
  const headerRef = useRef(null);
  const gridScrollRef = useRef(null);
  const timeColumnRef = useRef(null);

  const [createData, setCreateData] = useState(null);
  const [dragState, setDragState] = useState(null);

  useEffect(() => {
    if (!user?.outlet_id) return;

    dispatch(fetchBookings());
    dispatch(fetchTherapists());

    const pollInterval = setInterval(async () => {
      try {
        const response = await apiClient.get('/api/v1/bookings/outlet/booking/list', {
          params: buildBookingListParams(user),
        });
        const bookings = extractBookingsList(response.data);
        dispatch(mergeBookingsIncremental({ bookings, editingId: selectedBookingId }));
      } catch (e) {}
    }, POLLING_INTERVAL);

    return () => clearInterval(pollInterval);
  }, [dispatch, selectedBookingId, user?.outlet_id]);

  const handleEditBooking = useCallback((id) => dispatch(openPanel(id)), [dispatch]);
  const handleCreateBooking = useCallback((tid, time) => setCreateData({ therapistId: tid, time }), []);
  
  const handleDragStart = useCallback((e, booking) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDragState({ booking, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top, currentX: e.clientX, currentY: e.clientY });
  }, []);

  const handlePointerUp = useCallback((e) => {
    if (!dragState) return;
    const { booking, currentX, currentY } = dragState;
    const gridRect = containerRef.current.getBoundingClientRect();
    const scrollLeft = gridScrollRef.current?.scrollLeft ?? 0;
    const scrollTop = gridScrollRef.current?.scrollTop ?? 0;

    const xInGrid = currentX - gridRect.left - 80 + scrollLeft;
    const yInGrid = currentY - gridRect.top - 60 + scrollTop;

    const therapistIndex = Math.max(0, Math.min(therapists.length - 1, Math.floor(xInGrid / COLUMN_WIDTH)));
    const newTherapistId = therapists[therapistIndex].id;
    const snappedMins = Math.round(Math.max(0, Math.min(1440 - booking.duration, yInGrid)) / SNAP_INTERVAL) * SNAP_INTERVAL;
    
    const datePart = format(parseISO(booking.startTime), 'yyyy-MM-dd');
    const startTime = `${datePart}T${Math.floor(snappedMins/60).toString().padStart(2,'0')}:${(snappedMins%60).toString().padStart(2,'0')}:00`;
    const endTime = addMinutes(parseISO(startTime), booking.duration).toISOString();

    if (startTime !== booking.startTime || newTherapistId !== booking.therapistId) {
      dispatch(rescheduleBooking({ id: booking.id, newStartTime: startTime, newTherapistId, newEndTime: endTime }));
      const payload = {
        company: user?.company_id || 1, outlet: user?.outlet_id || 1,
        items: [{ service: booking.serviceId || 1, start_time: startTime.replace('T', ' '), end_time: endTime.replace('T', ' '), duration: booking.duration, therapist: newTherapistId, room_segments: [{ room_id: booking.roomId || 1, duration: booking.duration }] }],
        service_at: startTime.replace('T', ' ')
      };
      dispatch(updateBooking({ id: booking.bookingId, data: payload })).unwrap().catch(() => dispatch(rollback()));
    }
    setDragState(null);
  }, [dragState, therapists, dispatch, user]);

  const containerRef = useRef(null);
  const handleGridScroll = useCallback((e) => {
    const { scrollLeft, scrollTop } = e.currentTarget;

    if (headerRef.current) {
      headerRef.current.scrollLeft = scrollLeft;
    }

    if (timeColumnRef.current) {
      timeColumnRef.current.scrollTop = scrollTop;
    }
  }, []);

  return (
    <div className="calendar-grid-wrapper" ref={containerRef} onPointerMove={e => dragState && setDragState(p => ({...p, currentX: e.clientX, currentY: e.clientY}))} onPointerUp={handlePointerUp} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative' }}>
      {createData && <BookingFormModal initialData={createData} onClose={() => setCreateData(null)} />}
      {isPanelOpen && <BookingSidePanel />}
      {dragState && (
        <div style={{ position: 'fixed', left: dragState.currentX - dragState.offsetX, top: dragState.currentY - dragState.offsetY, width: COLUMN_WIDTH - 20, height: dragState.booking.height, backgroundColor: '#DBEAFE', borderLeft: '4px solid #3B82F6', opacity: 0.6, zIndex: 9999, pointerEvents: 'none', borderRadius: '4px', padding: '8px', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
          <strong>{dragState.booking.customer}</strong>
          <div>{dragState.booking.service}</div>
        </div>
      )}
      <div className="calendar-header-scroll" ref={headerRef} style={{ display: 'flex', overflow: 'hidden', marginLeft: '80px' }}>
        {therapists.map(t => <div key={t.id} style={{ width: COLUMN_WIDTH, flexShrink: 0 }}><TherapistHeader therapist={t} /></div>) || "Loading..."}
      </div>
      <div className="calendar-body-scroll" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div className="time-column-scroll" ref={timeColumnRef} style={{ overflow: 'hidden' }}><TimeColumn /></div>
        <div
          ref={gridScrollRef}
          className="grid-viewport"
          onScroll={handleGridScroll}
          style={{ flex: 1, overflow: 'auto' }}
        >
          <div style={{ display: 'flex', minHeight: '1440px', width: Math.max(therapists.length * COLUMN_WIDTH, 0) }}>
            {therapists.map(therapist => (
              <TherapistColumn
                key={therapist.id}
                therapistId={therapist.id}
                style={{ width: COLUMN_WIDTH, flexShrink: 0 }}
                onEditBooking={handleEditBooking}
                onCreateBooking={handleCreateBooking}
                onDragStart={handleDragStart}
                draggingId={dragState?.booking?.id}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarGrid;
