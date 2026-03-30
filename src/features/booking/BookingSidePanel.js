import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addMinutes, format, parse, parseISO } from 'date-fns';
import { closePanel, selectSelectedBookingId } from '../ui/uiSlice';
import {
  cancelBooking,
  deleteBooking,
  fetchBookingDetails,
  updateBooking,
  updateBookingStatus,
} from './bookingCrudThunks';
import { fetchBookings } from './bookingThunk';
import { fetchServiceCategories } from '../service/serviceSlice';
import { fetchRooms } from '../room/roomSlice';
import { fetchTherapists, selectAllTherapists } from '../therapist/therapistSlice';
import './BookingSidePanel.css';

const getErrorMessage = (error) => {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return error?.message || error?.data?.message || 'Something went wrong.';
};

const normalizeStatus = (status) => {
  const value = String(status || '').trim().toLowerCase();

  if (value === 'confirmed') return 'confirmed';
  if (value === 'completed') return 'completed';
  if (value === 'cancelled' || value === 'canceled') return 'cancelled';
  if (value === 'no-show' || value === 'no show') return 'no-show';
  if (value === 'check-in (in progress)' || value === 'check-in' || value === 'check in') {
    return 'in-progress';
  }

  return 'confirmed';
};

const extractBookingDetailPayload = (payload) =>
  payload?.data?.data?.data ||
  payload?.data?.data?.booking ||
  payload?.data?.data ||
  payload?.data?.booking ||
  payload?.data ||
  payload;

const buildBookingDetail = (payload, fallback) => {
  const raw = extractBookingDetailPayload(payload) || {};
  const rawBooking = raw.booking || raw;
  const bookingItems = rawBooking.booking_item || raw.booking_item || raw.items || {};
  const firstItem = Array.isArray(bookingItems)
    ? bookingItems[0]
    : Object.values(bookingItems).find((item) => item && typeof item === 'object') || {};
  const roomItem = firstItem.room_items?.[0] || {};
  const customer = rawBooking.customer || raw.customer || {};

  return {
    bookingId: rawBooking.id || fallback?.bookingId,
    itemId: firstItem.id || fallback?.id,
    customerId: customer.id || firstItem.customer_id || fallback?.customerId || '',
    customerName: customer.name || firstItem.customer_name || fallback?.customer || 'Unknown Client',
    phone: customer.contact_number || firstItem.customer_phone || fallback?.customerPhone || '',
    serviceId: firstItem.service_id || fallback?.serviceId || '',
    serviceName: firstItem.service || fallback?.service || 'Service',
    therapistId: firstItem.therapist_id || fallback?.therapistId || '',
    therapistName: firstItem.therapist || fallback?.therapistName || 'Therapist',
    roomId: roomItem.room_id || fallback?.roomId || '',
    roomName: roomItem.room_name || fallback?.room || '',
    duration: Number(firstItem.duration || fallback?.duration || 60),
    startTime: firstItem.service_at || fallback?.startTime,
    status: rawBooking.status || fallback?.status || 'Confirmed',
    note: rawBooking.note || firstItem.note || fallback?.note || '',
    source: rawBooking.source || fallback?.source || 'Walk-in',
    createdAt: rawBooking.created_at,
    createdBy: rawBooking.created_by_text,
    updatedAt: rawBooking.updated_at,
    updatedBy: rawBooking.updated_by_text,
    cancelledAt: rawBooking.cancelled_at,
    cancelledBy: rawBooking.cancelled_by_text,
  };
};

const BookingSidePanel = () => {
  const dispatch = useDispatch();
  const selectedId = useSelector(selectSelectedBookingId);
  const selectedBooking = useSelector((state) => state.booking.byId[selectedId]);
  const therapists = useSelector(selectAllTherapists).filter((therapist) => therapist.id !== 'unassigned');
  const serviceCategories = useSelector((state) => state.service.categories);
  const rooms = useSelector((state) => state.room.list);
  const user = useSelector((state) => state.auth.user);

  const [detail, setDetail] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelMode, setCancelMode] = useState('cancel-normal');
  const [error, setError] = useState('');
  const [editForm, setEditForm] = useState({
    serviceId: '',
    therapistId: '',
    roomId: '',
    duration: 60,
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    note: '',
  });

  useEffect(() => {
    if (!selectedBooking) {
      setDetail(null);
      return;
    }

    setDetail(buildBookingDetail(undefined, selectedBooking));
  }, [selectedBooking]);

  useEffect(() => {
    if (!selectedBooking?.bookingId) return;

    let isMounted = true;
    setIsLoading(true);
    setError('');

    dispatch(fetchBookingDetails(selectedBooking.bookingId))
      .unwrap()
      .then((payload) => {
        if (isMounted) {
          setDetail(buildBookingDetail(payload, selectedBooking));
        }
      })
      .catch((fetchError) => {
        if (isMounted) {
          setError(getErrorMessage(fetchError));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [dispatch, selectedBooking]);

  useEffect(() => {
    if (!detail?.startTime) return;

    const parsedTime = parseISO(detail.startTime);
    setEditForm({
      serviceId: String(detail.serviceId || ''),
      therapistId: String(detail.therapistId || ''),
      roomId: String(detail.roomId || ''),
      duration: detail.duration || 60,
      date: format(parsedTime, 'yyyy-MM-dd'),
      time: format(parsedTime, 'HH:mm'),
      note: detail.note || '',
    });
  }, [detail]);

  useEffect(() => {
    if (!isEditing || !user?.outlet_id) return;

    const selectedDateTime = parse(`${editForm.date} ${editForm.time}`, 'yyyy-MM-dd HH:mm', new Date());
    const serviceAtApi = format(selectedDateTime, 'dd-MM-yyyy HH:mm:ss');
    const apiDate = format(selectedDateTime, 'dd-MM-yyyy');

    dispatch(fetchServiceCategories({
      outletId: user.outlet_id,
      outletTypeId: user.outlet_type_id,
      serviceAt: serviceAtApi,
      therapistId: editForm.therapistId || undefined,
    }));
    dispatch(fetchTherapists({
      outletId: user.outlet_id,
      outletTypeId: user.outlet_type_id,
      serviceAt: serviceAtApi,
      serviceId: editForm.serviceId || undefined,
    }));
    dispatch(fetchRooms({
      outletId: user.outlet_id,
      date: apiDate,
      duration: Number(editForm.duration) || 60,
      serviceAt: serviceAtApi,
      userId: editForm.therapistId || undefined,
      serviceId: editForm.serviceId || undefined,
    }));
  }, [
    dispatch,
    editForm.date,
    editForm.duration,
    editForm.roomId,
    editForm.serviceId,
    editForm.therapistId,
    editForm.time,
    isEditing,
    user?.outlet_id,
    user?.outlet_type_id,
  ]);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        if (cancelDialogOpen) {
          setCancelDialogOpen(false);
        } else {
          dispatch(closePanel());
        }
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [cancelDialogOpen, dispatch]);

  if (!selectedBooking && !detail) return null;

  const bookingDetail = detail || buildBookingDetail(undefined, selectedBooking);
  const normalizedStatus = normalizeStatus(bookingDetail.status);
  const primaryActionLabel =
    normalizedStatus === 'confirmed'
      ? 'Check-in'
      : normalizedStatus === 'in-progress'
        ? 'Check-out'
        : normalizedStatus === 'completed'
          ? 'View Sale'
          : '';

  const refreshCalendar = async () => {
    if (!bookingDetail.startTime) return;

    const bookingDate = format(parseISO(bookingDetail.startTime), 'dd-MM-yyyy');
    await dispatch(fetchBookings({
      startDate: bookingDate,
      endDate: bookingDate,
      outletId: user?.outlet_id,
    })).unwrap();
  };

  const handleStatusChange = async () => {
    if (normalizedStatus === 'completed') return;

    const nextStatus = normalizedStatus === 'confirmed' ? 'Check-in (In Progress)' : 'Completed';
    setIsActionLoading(true);
    setError('');

    try {
      await dispatch(updateBookingStatus({
        bookingId: bookingDetail.bookingId,
        companyId: user?.company_id,
        status: nextStatus,
        outletTypeId: user?.outlet_type_id,
      })).unwrap();
      await refreshCalendar();
      setDetail((current) => ({ ...current, status: nextStatus }));
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSave = async () => {
    setIsActionLoading(true);
    setError('');

    try {
      const selectedDateTime = parse(`${editForm.date} ${editForm.time}`, 'yyyy-MM-dd HH:mm', new Date());
      const startTime = format(selectedDateTime, 'yyyy-MM-dd HH:mm:ss');
      const endTime = format(addMinutes(selectedDateTime, Number(editForm.duration) || 60), 'yyyy-MM-dd HH:mm:ss');

      await dispatch(updateBooking({
        id: bookingDetail.bookingId,
        data: {
          company: user?.company_id || 1,
          outlet: user?.outlet_id || 1,
          outlet_type: user?.outlet_type_id || 1,
          customer: bookingDetail.customerId,
          items: [
            {
              id: bookingDetail.itemId,
              service: editForm.serviceId,
              start_time: startTime,
              end_time: endTime,
              duration: Number(editForm.duration) || 60,
              therapist: editForm.therapistId,
              room_segments: [
                {
                  room_id: editForm.roomId,
                  start_time: startTime,
                  end_time: endTime,
                  duration: Number(editForm.duration) || 60,
                },
              ],
            },
          ],
          service_at: startTime,
          panel: 'outlet',
          source: bookingDetail.source || 'By Phone',
          booking_type: 1,
          membership: 0,
          note: editForm.note,
          updated_by: user?.id,
          currency: 'SGD',
        },
      })).unwrap();

      await refreshCalendar();
      setDetail((current) => ({
        ...current,
        serviceId: editForm.serviceId,
        therapistId: editForm.therapistId,
        roomId: editForm.roomId,
        duration: Number(editForm.duration) || 60,
        startTime,
        note: editForm.note,
      }));
      setIsEditing(false);
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelOrDelete = async () => {
    setIsActionLoading(true);
    setError('');

    try {
      if (cancelMode === 'delete') {
        await dispatch(deleteBooking(bookingDetail.bookingId)).unwrap();
      } else {
        await dispatch(cancelBooking({
          bookingId: bookingDetail.itemId || selectedId,
          companyId: user?.company_id,
          type: cancelMode === 'cancel-noshow' ? 'no-show' : 'normal',
        })).unwrap();
      }

      await refreshCalendar();
      setCancelDialogOpen(false);

      if (cancelMode === 'delete') {
        dispatch(closePanel());
      } else {
        setDetail((current) => ({ ...current, status: cancelMode === 'cancel-noshow' ? 'No-show' : 'Cancelled' }));
      }
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="side-panel-overlay" onClick={() => dispatch(closePanel())}>
      <div className="booking-side-panel" onClick={(event) => event.stopPropagation()}>
        <div className="booking-side-panel__header">
          <h2>{isEditing ? 'Update Booking' : 'Appointment'}</h2>

          <div className="booking-side-panel__actions">
            {!isEditing && (
              <>
                <div className="booking-side-panel__menuWrap">
                  <button type="button" className="booking-side-panel__icon" onClick={() => setMenuOpen((current) => !current)}>
                    ...
                  </button>
                  {menuOpen && (
                    <button
                      type="button"
                      className="booking-side-panel__menuItem"
                      onClick={() => {
                        setMenuOpen(false);
                        setCancelDialogOpen(true);
                      }}
                    >
                      Cancel / Delete
                    </button>
                  )}
                </div>
                <button type="button" className="booking-side-panel__icon" onClick={() => setIsEditing(true)}>
                  E
                </button>
              </>
            )}
            {isEditing && (
              <button type="button" className="booking-side-panel__cancelHeader" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="booking-side-panel__statusRow">
          <div className={`booking-side-panel__status booking-side-panel__status--${normalizedStatus}`}>
            <span className="booking-side-panel__statusDot" />
            <span>{bookingDetail.status}</span>
          </div>

          {primaryActionLabel ? (
            <button
              type="button"
              className="booking-side-panel__primaryAction"
              onClick={handleStatusChange}
              disabled={isActionLoading || normalizedStatus === 'completed'}
            >
              {primaryActionLabel}
            </button>
          ) : null}
        </div>

        <div className="booking-side-panel__summary">
          <div className="booking-side-panel__summaryItem">
            <span>On</span>
            <strong>{bookingDetail.startTime ? format(parseISO(bookingDetail.startTime), 'EEE, MMM d') : '-'}</strong>
          </div>
          <div className="booking-side-panel__summaryItem">
            <span>At</span>
            <strong>{bookingDetail.startTime ? format(parseISO(bookingDetail.startTime), 'hh:mm a') : '-'}</strong>
          </div>
        </div>

        <div className="booking-side-panel__customer">
          <div className="booking-side-panel__avatar">
            {(bookingDetail.customerName || 'C').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <strong>{bookingDetail.customerName}</strong>
            <div>{bookingDetail.phone || 'No phone on record'}</div>
          </div>
        </div>

        {error && <div className="booking-side-panel__error">{error}</div>}
        {isLoading && <div className="booking-side-panel__loading">Loading booking details...</div>}

        {!isEditing ? (
          <div className="booking-side-panel__body">
            <div className="booking-side-panel__serviceCard">
              <h3>{`${bookingDetail.duration} Mins ${bookingDetail.serviceName}`}</h3>
              <dl>
                <div>
                  <dt>With</dt>
                  <dd>{bookingDetail.therapistName}</dd>
                </div>
                <div>
                  <dt>For</dt>
                  <dd>{`${bookingDetail.duration} min`}</dd>
                </div>
                <div>
                  <dt>At</dt>
                  <dd>{bookingDetail.startTime ? format(parseISO(bookingDetail.startTime), 'hh:mm a') : '-'}</dd>
                </div>
                <div>
                  <dt>Using</dt>
                  <dd>{bookingDetail.roomName || 'No room assigned'}</dd>
                </div>
              </dl>
            </div>

            {bookingDetail.note && (
              <div className="booking-side-panel__note">
                {bookingDetail.note}
              </div>
            )}

            <div className="booking-side-panel__details">
              <h4>Booking details</h4>
              <dl>
                <div>
                  <dt>Booked on</dt>
                  <dd>{bookingDetail.createdAt || '-'}</dd>
                </div>
                <div>
                  <dt>Booked by</dt>
                  <dd>{bookingDetail.createdBy || '-'}</dd>
                </div>
                <div>
                  <dt>Updated on</dt>
                  <dd>{bookingDetail.updatedAt || '-'}</dd>
                </div>
                <div>
                  <dt>Updated by</dt>
                  <dd>{bookingDetail.updatedBy || '-'}</dd>
                </div>
                <div>
                  <dt>Cancelled on</dt>
                  <dd>{bookingDetail.cancelledAt || '-'}</dd>
                </div>
                <div>
                  <dt>Cancelled by</dt>
                  <dd>{bookingDetail.cancelledBy || '-'}</dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>{bookingDetail.source || '-'}</dd>
                </div>
              </dl>
            </div>
          </div>
        ) : (
          <div className="booking-side-panel__body booking-side-panel__body--edit">
            <label className="booking-side-panel__field">
              <span>Service</span>
              <select
                value={editForm.serviceId}
                onChange={(event) => setEditForm((current) => ({ ...current, serviceId: event.target.value }))}
              >
                <option value="">Select service</option>
                {serviceCategories.map((category) => (
                  <optgroup key={category.id || category.name} label={category.name}>
                    {(category.services || []).map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <label className="booking-side-panel__field">
              <span>Therapist</span>
              <select
                value={editForm.therapistId}
                onChange={(event) => setEditForm((current) => ({ ...current, therapistId: event.target.value }))}
              >
                {therapists.map((therapist) => (
                  <option key={therapist.id} value={therapist.id}>
                    {therapist.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="booking-side-panel__field">
              <span>Room</span>
              <select
                value={editForm.roomId}
                onChange={(event) => setEditForm((current) => ({ ...current, roomId: event.target.value }))}
              >
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.room_name || room.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="booking-side-panel__fieldRow">
              <label className="booking-side-panel__field">
                <span>Duration</span>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={editForm.duration}
                  onChange={(event) => setEditForm((current) => ({ ...current, duration: event.target.value }))}
                />
              </label>
              <label className="booking-side-panel__field">
                <span>Time</span>
                <input
                  type="time"
                  value={editForm.time}
                  onChange={(event) => setEditForm((current) => ({ ...current, time: event.target.value }))}
                />
              </label>
            </div>

            <label className="booking-side-panel__field">
              <span>Date</span>
              <input
                type="date"
                value={editForm.date}
                onChange={(event) => setEditForm((current) => ({ ...current, date: event.target.value }))}
              />
            </label>

            <label className="booking-side-panel__field">
              <span>Notes</span>
              <textarea
                value={editForm.note}
                onChange={(event) => setEditForm((current) => ({ ...current, note: event.target.value }))}
              />
            </label>
          </div>
        )}

        {isEditing && (
          <div className="booking-side-panel__footer">
            <button type="button" className="booking-side-panel__save" onClick={handleSave} disabled={isActionLoading}>
              {isActionLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {cancelDialogOpen && (
          <div className="booking-side-panel__dialogOverlay" onClick={() => setCancelDialogOpen(false)}>
            <div className="booking-side-panel__dialog" onClick={(event) => event.stopPropagation()}>
              <h3>Cancel / Delete Booking</h3>
              <p>Please select the cancellation type.</p>

              <label className="booking-side-panel__dialogOption">
                <input
                  type="radio"
                  name="cancelMode"
                  checked={cancelMode === 'cancel-normal'}
                  onChange={() => setCancelMode('cancel-normal')}
                />
                <span>Normal Cancellation</span>
              </label>
              <label className="booking-side-panel__dialogOption">
                <input
                  type="radio"
                  name="cancelMode"
                  checked={cancelMode === 'cancel-noshow'}
                  onChange={() => setCancelMode('cancel-noshow')}
                />
                <span>No Show</span>
              </label>
              <label className="booking-side-panel__dialogOption">
                <input
                  type="radio"
                  name="cancelMode"
                  checked={cancelMode === 'delete'}
                  onChange={() => setCancelMode('delete')}
                />
                <span>Just Delete It</span>
              </label>

              <div className="booking-side-panel__dialogActions">
                <button type="button" onClick={() => setCancelDialogOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="is-primary" onClick={handleCancelOrDelete} disabled={isActionLoading}>
                  {isActionLoading ? 'Working...' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingSidePanel;
