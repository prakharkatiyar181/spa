import React, { useRef, useEffect, useState, useCallback, useDeferredValue } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addDays, addMinutes, format, parseISO, subDays } from 'date-fns';
import { fetchBookings, buildBookingListParams, extractBookingsList } from '../booking/bookingThunk';
import { selectBookingsByTherapist } from '../booking/bookingSelectors';
import { fetchTherapists, selectAllTherapists } from '../therapist/therapistSlice';
import { fetchRooms } from '../room/roomSlice';
import { rescheduleBooking, rollback, mergeBookingsIncremental } from '../booking/bookingSlice';
import { updateBooking } from '../booking/bookingCrudThunks';
import { openPanel, selectIsPanelOpen, selectSelectedBookingId } from '../ui/uiSlice';
import TimeColumn from './TimeColumn';
import TherapistHeader from './TherapistHeader';
import BookingBlock from './BookingBlock';
import BookingFormModal from '../booking/BookingFormModal';
import BookingSidePanel from '../booking/BookingSidePanel';
import CalendarFilterDropdown from './CalendarFilterDropdown';
import apiClient from '../../api/apiClient';
import './CalendarGrid.css';

const COLUMN_WIDTH = 180;
const SNAP_INTERVAL = 15;
const POLLING_INTERVAL = 15000;
const STATUS_OPTIONS = [
  { key: 'confirmed', label: 'Confirmed', color: '#9cd4e3' },
  { key: 'unconfirmed', label: 'Unconfirmed', color: '#ecd9cc' },
  { key: 'checked-in', label: 'Checked In', color: '#f7d5df' },
  { key: 'completed', label: 'Completed', color: '#d9dbe0' },
  { key: 'cancelled', label: 'Cancelled', color: '#b7d9e5' },
  { key: 'no-show', label: 'No Show', color: '#a5dbef' },
  { key: 'holding', label: 'Holding', color: '#eadfce' },
  { key: 'in-progress', label: 'Check-in (In Progress)', color: '#f4dfe8' },
];
const DEFAULT_STATUS_FILTERS = STATUS_OPTIONS.reduce((filters, option) => {
  filters[option.key] = true;
  return filters;
}, {});

const normalizeStatusKey = (status) => {
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

const getErrorMessage = (error) => {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return error.message || error.data?.message || 'Something went wrong while loading the calendar.';
};

const formatApiDate = (date) => format(date, 'dd-MM-yyyy');
const formatToolbarDate = (date) => format(date, 'EEE, MMM d');
const formatCreateDate = (date) => format(date, 'yyyy-MM-dd');

const matchesBookingSearch = (booking, query) => {
  if (!query) return true;

  const haystack = [
    booking.customer,
    booking.customerPhone,
    booking.service,
    booking.bookingId,
    booking.id,
    booking.room,
    booking.therapistName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
};

const TherapistColumn = React.memo(({
  therapist,
  style,
  onEditBooking,
  onCreateBooking,
  onDragStart,
  draggingId,
  filterBooking,
}) => {
  const bookings = useSelector((state) => selectBookingsByTherapist(state, therapist.id));
  const filteredBookings = bookings.filter(filterBooking);

  const handleColumnClick = useCallback((event) => {
    if (event.target !== event.currentTarget) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const minutes = Math.floor(event.clientY - rect.top);
    const hours = Math.floor(minutes / 60);
    const snappedMins = Math.round((minutes % 60) / SNAP_INTERVAL) * SNAP_INTERVAL;
    onCreateBooking(
      therapist.id,
      `${hours.toString().padStart(2, '0')}:${snappedMins.toString().padStart(2, '0')}`
    );
  }, [onCreateBooking, therapist.id]);

  return (
    <div
      className={`therapist-column ${therapist.isAvailable === false ? 'is-unavailable' : ''}`}
      onClick={handleColumnClick}
      style={style}
    >
      {filteredBookings.map((booking) => (
        <BookingBlock
          key={booking.id}
          booking={booking}
          onClick={onEditBooking}
          onDragStart={onDragStart}
          isDragging={draggingId === booking.id}
        />
      ))}
    </div>
  );
});

const CalendarGrid = () => {
  const dispatch = useDispatch();
  const therapists = useSelector(selectAllTherapists);
  const rooms = useSelector((state) => state.room.list);
  const user = useSelector((state) => state.auth.user);
  const isPanelOpen = useSelector(selectIsPanelOpen);
  const selectedBookingId = useSelector(selectSelectedBookingId);
  const bookingStatus = useSelector((state) => state.booking.status);
  const bookingError = useSelector((state) => state.booking.error);
  const therapistStatus = useSelector((state) => state.therapist.status);
  const therapistError = useSelector((state) => state.therapist.error);
  const outletId = user?.outlet_id;
  const outletTypeId = user?.outlet_type_id;
  const companyId = user?.company_id;

  const headerRef = useRef(null);
  const gridScrollRef = useRef(null);
  const timeColumnRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const filterButtonRef = useRef(null);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [createData, setCreateData] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [therapistSearch, setTherapistSearch] = useState('');
  const [showOnDutyOnly, setShowOnDutyOnly] = useState(false);
  const [genderFilter, setGenderFilter] = useState('all');
  const [selectedStatuses, setSelectedStatuses] = useState(DEFAULT_STATUS_FILTERS);
  const [selectedRoomIds, setSelectedRoomIds] = useState(null);
  const [selectedTherapistIds, setSelectedTherapistIds] = useState(null);

  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());
  const allTherapists = therapists.filter((therapist) => therapist && therapist.id !== 'unassigned');
  const allTherapistsSelected =
    selectedTherapistIds === null ||
    allTherapists.every((therapist) => selectedTherapistIds.includes(therapist.id));
  const visibleTherapists = allTherapists.filter((therapist) => {
    if (selectedTherapistIds !== null && !selectedTherapistIds.includes(therapist.id)) {
      return false;
    }
    if (genderFilter !== 'all' && therapist.gender.toLowerCase() !== genderFilter) {
      return false;
    }
    if (showOnDutyOnly && therapist.isAvailable === false) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    if (!isFilterOpen) return undefined;

    const handlePointerDown = (event) => {
      if (filterDropdownRef.current?.contains(event.target) || filterButtonRef.current?.contains(event.target)) {
        return;
      }
      setIsFilterOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isFilterOpen]);

  useEffect(() => {
    if (!outletId) return undefined;

    const apiDate = formatApiDate(selectedDate);
    const bookingParams = {
      startDate: apiDate,
      endDate: apiDate,
      outletId,
    };
    const therapistParams = { outletId, outletTypeId };

    dispatch(fetchBookings(bookingParams));
    dispatch(fetchTherapists(therapistParams));

    const pollInterval = setInterval(async () => {
      try {
        const response = await apiClient.get('/api/v1/bookings/outlet/booking/list', {
          params: buildBookingListParams({ outlet_id: outletId }, bookingParams),
        });
        const bookings = extractBookingsList(response.data);
        dispatch(mergeBookingsIncremental({ bookings, editingId: selectedBookingId }));
      } catch (error) {}
    }, POLLING_INTERVAL);

    return () => clearInterval(pollInterval);
  }, [dispatch, outletId, outletTypeId, selectedBookingId, selectedDate]);

  useEffect(() => {
    if (outletId) {
      dispatch(fetchRooms({ outletId }));
    }
  }, [dispatch, outletId]);

  const handleEditBooking = useCallback((bookingId) => {
    dispatch(openPanel(bookingId));
  }, [dispatch]);

  const handleCreateBooking = useCallback((therapistId, time) => {
    setCreateData({
      therapistId,
      time,
      date: formatCreateDate(selectedDate),
    });
  }, [selectedDate]);

  const handleDragStart = useCallback((event, booking) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setDragState({
      booking,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      currentX: event.clientX,
      currentY: event.clientY,
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!dragState || !gridScrollRef.current || !visibleTherapists.length) return;

    const { booking, currentX, currentY } = dragState;
    const gridRect = gridScrollRef.current.getBoundingClientRect();
    const scrollLeft = gridScrollRef.current.scrollLeft;
    const scrollTop = gridScrollRef.current.scrollTop;

    const xInGrid = currentX - gridRect.left + scrollLeft;
    const yInGrid = currentY - gridRect.top + scrollTop;

    const therapistIndex = Math.max(
      0,
      Math.min(visibleTherapists.length - 1, Math.floor(xInGrid / COLUMN_WIDTH))
    );
    const newTherapistId = visibleTherapists[therapistIndex]?.id || booking.therapistId;
    const snappedMins = Math.round(
      Math.max(0, Math.min(1440 - booking.duration, yInGrid)) / SNAP_INTERVAL
    ) * SNAP_INTERVAL;

    const datePart = format(parseISO(booking.startTime), 'yyyy-MM-dd');
    const startTime = `${datePart}T${Math.floor(snappedMins / 60).toString().padStart(2, '0')}:${(snappedMins % 60)
      .toString()
      .padStart(2, '0')}:00`;
    const endTime = addMinutes(parseISO(startTime), booking.duration).toISOString();

    if (startTime !== booking.startTime || newTherapistId !== booking.therapistId) {
      dispatch(rescheduleBooking({
        id: booking.id,
        newStartTime: startTime,
        newTherapistId,
        newEndTime: endTime,
      }));
      const payload = {
        company: companyId || 1,
        outlet: outletId || 1,
        items: [{
          service: booking.serviceId || 1,
          start_time: startTime.replace('T', ' '),
          end_time: endTime.replace('T', ' '),
          duration: booking.duration,
          therapist: newTherapistId,
          room_segments: [{ room_id: booking.roomId || 1, duration: booking.duration }],
        }],
        service_at: startTime.replace('T', ' '),
      };

      dispatch(updateBooking({ id: booking.bookingId, data: payload }))
        .unwrap()
        .catch(() => dispatch(rollback()));
    }

    setDragState(null);
  }, [companyId, dispatch, dragState, outletId, visibleTherapists]);

  const handleGridScroll = useCallback((event) => {
    const { scrollLeft, scrollTop } = event.currentTarget;

    if (headerRef.current) {
      headerRef.current.scrollLeft = scrollLeft;
    }

    if (timeColumnRef.current) {
      timeColumnRef.current.scrollTop = scrollTop;
    }
  }, []);

  const handleToggleStatus = useCallback((statusKey) => {
    setSelectedStatuses((current) => ({
      ...current,
      [statusKey]: !current[statusKey],
    }));
  }, []);

  const handleToggleRoom = useCallback((roomId) => {
    const roomIds = rooms.map((room) => String(room.id));

    setSelectedRoomIds((current) => {
      if (!roomIds.length) return null;
      if (current === null) {
        return roomIds.filter((id) => id !== roomId);
      }
      if (current.includes(roomId)) {
        return current.filter((id) => id !== roomId);
      }

      const next = [...current, roomId];
      return next.length === roomIds.length ? null : next;
    });
  }, [rooms]);

  const handleToggleTherapist = useCallback((therapistId) => {
    const therapistIds = allTherapists.map((therapist) => therapist.id);

    setSelectedTherapistIds((current) => {
      if (current === null) {
        return therapistIds.filter((id) => id !== therapistId);
      }
      if (current.includes(therapistId)) {
        return current.filter((id) => id !== therapistId);
      }

      const next = [...current, therapistId];
      return next.length === therapistIds.length ? null : next;
    });
  }, [allTherapists]);

  const handleToggleAllTherapists = useCallback(() => {
    if (!allTherapistsSelected) {
      setSelectedTherapistIds(null);
    }
  }, [allTherapistsSelected]);

  const handleClearFilters = useCallback(() => {
    setShowOnDutyOnly(false);
    setGenderFilter('all');
    setSelectedStatuses(DEFAULT_STATUS_FILTERS);
    setSelectedRoomIds(null);
    setSelectedTherapistIds(null);
    setTherapistSearch('');
    setSearchQuery('');
  }, []);

  const filterBooking = useCallback((booking) => {
    const statusKey = normalizeStatusKey(booking.status);
    const bookingRoomId = booking.roomId !== undefined && booking.roomId !== null ? String(booking.roomId) : '';

    if (!selectedStatuses[statusKey]) {
      return false;
    }
    if (selectedRoomIds !== null && !selectedRoomIds.includes(bookingRoomId)) {
      return false;
    }

    return matchesBookingSearch(booking, deferredSearchQuery);
  }, [deferredSearchQuery, selectedRoomIds, selectedStatuses]);

  const calendarError = getErrorMessage(bookingError) || getErrorMessage(therapistError);
  const isLoading = bookingStatus === 'loading' || therapistStatus === 'loading';

  return (
    <div
      className="calendar-page"
      onPointerMove={(event) => {
        if (dragState) {
          setDragState((current) => ({
            ...current,
            currentX: event.clientX,
            currentY: event.clientY,
          }));
        }
      }}
      onPointerUp={handlePointerUp}
    >
      {createData && (
        <BookingFormModal initialData={createData} onClose={() => setCreateData(null)} />
      )}
      {isPanelOpen && <BookingSidePanel />}

      <div className="calendar-toolbar">
        <button type="button" className="calendar-toolbar__outletButton">
          <span className="calendar-toolbar__outletName">{user?.outlet_name || 'Outlet'}</span>
          <span className="calendar-toolbar__outletMeta">Display : 15 Min</span>
        </button>

        <div className="calendar-toolbar__controls">
          <label className="calendar-toolbar__search">
            <span className="calendar-toolbar__searchIcon">Q</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search Sales by phone/name"
            />
          </label>

          <div className="calendar-toolbar__filterWrap" ref={filterDropdownRef}>
            <button
              ref={filterButtonRef}
              type="button"
              className={`calendar-toolbar__filterButton ${isFilterOpen ? 'is-active' : ''}`}
              onClick={() => setIsFilterOpen((current) => !current)}
            >
              Filter
            </button>

            {isFilterOpen && (
              <CalendarFilterDropdown
                rooms={rooms}
                statusOptions={STATUS_OPTIONS}
                therapists={allTherapists}
                therapistSearch={therapistSearch}
                filters={{
                  showOnDutyOnly,
                  genderFilter,
                  selectedStatuses,
                  selectedRoomIds,
                  selectedTherapistIds,
                }}
                onTherapistSearchChange={setTherapistSearch}
                onToggleOnDuty={() => setShowOnDutyOnly((current) => !current)}
                onSetGenderFilter={setGenderFilter}
                onToggleRoom={handleToggleRoom}
                onToggleStatus={handleToggleStatus}
                onToggleTherapist={handleToggleTherapist}
                onToggleAllTherapists={handleToggleAllTherapists}
                allTherapistsSelected={allTherapistsSelected}
                onClear={handleClearFilters}
              />
            )}
          </div>

          <div className="calendar-toolbar__dateControls">
            <button type="button" className="calendar-toolbar__pill" onClick={() => setSelectedDate(new Date())}>
              Today
            </button>
            <button type="button" className="calendar-toolbar__navButton" onClick={() => setSelectedDate((current) => subDays(current, 1))}>
              {'<'}
            </button>
            <div className="calendar-toolbar__dateLabel">{formatToolbarDate(selectedDate)}</div>
            <button type="button" className="calendar-toolbar__navButton" onClick={() => setSelectedDate((current) => addDays(current, 1))}>
              {'>'}
            </button>
          </div>
        </div>
      </div>

      {calendarError && (
        <div className="calendar-page__alert">{calendarError}</div>
      )}

      <div className="calendar-page__headerRail">
        <div className="calendar-page__timeRailLabel">Time</div>
        <div className="calendar-page__therapistRail" ref={headerRef}>
          {visibleTherapists.map((therapist, index) => (
            <div
              key={therapist.id}
              className="calendar-page__therapistHeaderSlot"
              style={{ width: `${COLUMN_WIDTH}px` }}
            >
              <TherapistHeader therapist={therapist} index={index} />
            </div>
          ))}
        </div>
      </div>

      <div className="calendar-page__gridFrame">
        <div className="time-column-scroll" ref={timeColumnRef}>
          <TimeColumn />
        </div>

        <div className="grid-viewport" ref={gridScrollRef} onScroll={handleGridScroll}>
          {visibleTherapists.length ? (
            <div
              className="calendar-page__gridCanvas"
              style={{ width: `${visibleTherapists.length * COLUMN_WIDTH}px` }}
            >
              {visibleTherapists.map((therapist) => (
                <TherapistColumn
                  key={therapist.id}
                  therapist={therapist}
                  style={{ width: `${COLUMN_WIDTH}px`, flexShrink: 0 }}
                  onEditBooking={handleEditBooking}
                  onCreateBooking={handleCreateBooking}
                  onDragStart={handleDragStart}
                  draggingId={dragState?.booking?.id}
                  filterBooking={filterBooking}
                />
              ))}
            </div>
          ) : (
            <div className="calendar-page__emptyState">
              {isLoading ? 'Loading schedule...' : 'No therapists match the current filters.'}
            </div>
          )}
        </div>
      </div>

      {dragState && (
        <div
          className="calendar-page__dragPreview"
          style={{
            left: dragState.currentX - dragState.offsetX,
            top: dragState.currentY - dragState.offsetY,
            width: `${COLUMN_WIDTH - 20}px`,
            height: `${dragState.booking.height}px`,
          }}
        >
          <strong>{dragState.booking.customer}</strong>
          <div>{dragState.booking.service}</div>
        </div>
      )}
    </div>
  );
};

export default CalendarGrid;
