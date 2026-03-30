import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addMinutes, format, parse } from 'date-fns';
import { createBooking } from './bookingCrudThunks';
import { listCustomers, createCustomer } from './customerApi';
import { fetchServiceCategories } from '../service/serviceSlice';
import { fetchRooms } from '../room/roomSlice';
import { fetchTherapists, selectAllTherapists } from '../therapist/therapistSlice';
import { fetchBookings } from './bookingThunk';
import './BookingFormModal.css';

const DEFAULT_CLIENT_FORM = {
  name: '',
  lastname: '',
  email: '',
  contact_number: '',
  gender: 'male',
};

const getErrorMessage = (error) => {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return error?.message || error?.data?.message || 'Something went wrong.';
};

const buildDateTime = (date, time) => parse(`${date} ${time}`, 'yyyy-MM-dd HH:mm', new Date());

const BookingFormModal = ({ initialData, onClose }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const therapists = useSelector(selectAllTherapists).filter((therapist) => therapist.id !== 'unassigned');
  const serviceCategories = useSelector((state) => state.service.categories);
  const rooms = useSelector((state) => state.room.list);

  const clientSearchRef = useRef(null);
  const [formData, setFormData] = useState({
    customerId: '',
    serviceId: '',
    therapistId: initialData?.therapistId || '',
    roomId: '',
    time: initialData?.time || '09:00',
    date: initialData?.date || format(new Date(), 'yyyy-MM-dd'),
    duration: 60,
    note: '',
  });
  const [customers, setCustomers] = useState([]);
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
  const [newClientData, setNewClientData] = useState(DEFAULT_CLIENT_FORM);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [customerError, setCustomerError] = useState('');
  const [formError, setFormError] = useState('');

  const selectedDateTime = buildDateTime(formData.date, formData.time);
  const apiDate = format(selectedDateTime, 'dd-MM-yyyy');
  const serviceAtApi = format(selectedDateTime, 'dd-MM-yyyy HH:mm:ss');
  const serviceAtPayload = format(selectedDateTime, 'yyyy-MM-dd HH:mm:ss');
  const endTimePayload = format(addMinutes(selectedDateTime, Number(formData.duration) || 60), 'yyyy-MM-dd HH:mm:ss');
  const serviceOptions = serviceCategories.flatMap((category) =>
    (category.services || []).map((service) => ({
      ...service,
      categoryName: category.name,
    }))
  );
  const selectedService = serviceOptions.find((service) => String(service.id) === String(formData.serviceId));
  const filteredCustomers = customers
    .filter((customer) => {
      const query = customerQuery.trim().toLowerCase();
      if (!query) return true;

      const haystack = `${customer.name} ${customer.phone} ${customer.email}`.toLowerCase();
      return haystack.includes(query);
    })
    .slice(0, 40);
  const isFormValid = Boolean(
    formData.customerId &&
    formData.serviceId &&
    formData.therapistId &&
    formData.roomId &&
    formData.date &&
    formData.time
  );

  useEffect(() => {
    let isMounted = true;

    const loadCustomers = async () => {
      setIsLoadingCustomers(true);
      setCustomerError('');

      try {
        const data = await listCustomers();
        if (isMounted) {
          setCustomers(data);
        }
      } catch (error) {
        if (isMounted) {
          setCustomerError(getErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoadingCustomers(false);
        }
      }
    };

    loadCustomers();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user?.outlet_id) return;

    dispatch(fetchServiceCategories({
      outletId: user.outlet_id,
      outletTypeId: user.outlet_type_id,
      serviceAt: serviceAtApi,
      therapistId: formData.therapistId || undefined,
    }));
    dispatch(fetchTherapists({
      outletId: user.outlet_id,
      outletTypeId: user.outlet_type_id,
      serviceAt: serviceAtApi,
      serviceId: formData.serviceId || undefined,
    }));
    dispatch(fetchRooms({
      outletId: user.outlet_id,
      date: apiDate,
      duration: Number(formData.duration) || 60,
      serviceAt: serviceAtApi,
      userId: formData.therapistId || undefined,
      serviceId: formData.serviceId || undefined,
    }));
  }, [
    apiDate,
    dispatch,
    formData.duration,
    formData.serviceId,
    formData.therapistId,
    serviceAtApi,
    user?.outlet_id,
    user?.outlet_type_id,
  ]);

  useEffect(() => {
    if (!formData.therapistId && therapists.length) {
      setFormData((current) => ({
        ...current,
        therapistId: String(initialData?.therapistId || therapists[0].id),
      }));
    }
  }, [formData.therapistId, initialData?.therapistId, therapists]);

  useEffect(() => {
    if (formData.roomId) return;
    if (!rooms.length) return;

    setFormData((current) => ({
      ...current,
      roomId: String(rooms[0].id),
    }));
  }, [formData.roomId, rooms]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!clientSearchRef.current?.contains(event.target)) {
        setIsCustomerDropdownOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setCustomerQuery(customer.name);
    setFormData((current) => ({
      ...current,
      customerId: String(customer.id),
    }));
    setIsCustomerDropdownOpen(false);
    setIsCreateClientOpen(false);
    setFormError('');
  };

  const handleCreateClient = async (event) => {
    event.preventDefault();
    setCustomerError('');
    setIsCreatingClient(true);

    try {
      const createdCustomer = await createCustomer({
        ...newClientData,
        status: 1,
        membership: 0,
      });

      setCustomers((current) => [createdCustomer, ...current.filter((customer) => customer.id !== createdCustomer.id)]);
      handleCustomerSelect(createdCustomer);
      setNewClientData(DEFAULT_CLIENT_FORM);
    } catch (error) {
      setCustomerError(getErrorMessage(error));
    } finally {
      setIsCreatingClient(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isFormValid) return;

    setFormError('');
    setIsSaving(true);

    const payload = {
      company: user?.company_id || 1,
      outlet: user?.outlet_id || 1,
      outlet_type: user?.outlet_type_id || 1,
      booking_type: 1,
      customer: formData.customerId,
      items: [
        {
          service: formData.serviceId,
          start_time: serviceAtPayload,
          end_time: endTimePayload,
          duration: Number(formData.duration) || 60,
          therapist: formData.therapistId,
          price: selectedService?.price || selectedService?.selling_price,
          room_segments: [
            {
              room_id: formData.roomId,
              start_time: serviceAtPayload,
              end_time: endTimePayload,
              duration: Number(formData.duration) || 60,
            },
          ],
        },
      ],
      service_at: serviceAtPayload,
      panel: 'outlet',
      source: 'Walk-in',
      payment_type: 'payatstore',
      currency: 'SGD',
      membership: 0,
      note: formData.note,
      type: 'manual',
      created_by: user?.id,
    };

    try {
      await dispatch(createBooking(payload)).unwrap();
      await dispatch(fetchBookings({
        startDate: apiDate,
        endDate: apiDate,
        outletId: user?.outlet_id,
      })).unwrap();
      onClose();
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <aside className="booking-create-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="booking-create-drawer__header">
          <h2>New Booking</h2>
          <button type="button" className="booking-create-drawer__cancel" onClick={onClose}>
            Cancel
          </button>
        </div>

        <div className="booking-create-drawer__summary">
          <div className="booking-create-drawer__summaryItem">
            <span className="booking-create-drawer__summaryLabel">Outlet</span>
            <strong>{user?.outlet_name || 'Outlet'}</strong>
          </div>
          <div className="booking-create-drawer__summaryItem">
            <span className="booking-create-drawer__summaryLabel">On</span>
            <strong>{format(selectedDateTime, 'EEE, MMM d')}</strong>
          </div>
          <div className="booking-create-drawer__summaryItem">
            <span className="booking-create-drawer__summaryLabel">At</span>
            <strong>{format(selectedDateTime, 'hh:mm a')}</strong>
          </div>
        </div>

        <form className="booking-create-drawer__body" onSubmit={handleSubmit}>
          <div className="booking-create-drawer__section" ref={clientSearchRef}>
            <div className="booking-create-drawer__fieldLabel">Client</div>
            <div className="booking-create-drawer__clientSearch">
              <input
                type="search"
                value={customerQuery}
                onChange={(event) => {
                  setCustomerQuery(event.target.value);
                  setSelectedCustomer(null);
                  setFormData((current) => ({ ...current, customerId: '' }));
                  setIsCustomerDropdownOpen(true);
                }}
                onFocus={() => setIsCustomerDropdownOpen(true)}
                placeholder="Search or create client"
              />
              <button
                type="button"
                className="booking-create-drawer__clientSearchAdd"
                onClick={() => setIsCreateClientOpen((current) => !current)}
              >
                +
              </button>
            </div>

            {selectedCustomer && (
              <div className="booking-create-drawer__selectedClient">
                <strong>{selectedCustomer.name}</strong>
                <span>{selectedCustomer.phone || selectedCustomer.email}</span>
              </div>
            )}

            {isCustomerDropdownOpen && (
              <div className="booking-create-drawer__clientDropdown">
                <div className="booking-create-drawer__clientDropdownSearch">
                  <input
                    type="search"
                    value={customerQuery}
                    onChange={(event) => setCustomerQuery(event.target.value)}
                    placeholder="Search..."
                  />
                </div>

                <div className="booking-create-drawer__clientDropdownList">
                  {isLoadingCustomers ? (
                    <div className="booking-create-drawer__emptyState">Loading clients...</div>
                  ) : filteredCustomers.length ? (
                    filteredCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        className={`booking-create-drawer__clientOption ${selectedCustomer?.id === customer.id ? 'is-selected' : ''}`}
                        onClick={() => handleCustomerSelect(customer)}
                      >
                        <strong>{customer.name}</strong>
                        <span>{customer.phone || customer.email}</span>
                      </button>
                    ))
                  ) : (
                    <div className="booking-create-drawer__emptyState">No clients found. Use + to create one.</div>
                  )}
                </div>
              </div>
            )}

            {isCreateClientOpen && (
              <div className="booking-create-drawer__createClient">
                <div className="booking-create-drawer__createClientRow">
                  <input
                    type="text"
                    value={newClientData.name}
                    onChange={(event) => setNewClientData((current) => ({ ...current, name: event.target.value }))}
                    placeholder="First name"
                  />
                  <input
                    type="text"
                    value={newClientData.lastname}
                    onChange={(event) => setNewClientData((current) => ({ ...current, lastname: event.target.value }))}
                    placeholder="Last name"
                  />
                </div>
                <div className="booking-create-drawer__createClientRow">
                  <input
                    type="email"
                    value={newClientData.email}
                    onChange={(event) => setNewClientData((current) => ({ ...current, email: event.target.value }))}
                    placeholder="Email"
                  />
                  <input
                    type="text"
                    value={newClientData.contact_number}
                    onChange={(event) => setNewClientData((current) => ({ ...current, contact_number: event.target.value }))}
                    placeholder="Phone"
                  />
                </div>
                <div className="booking-create-drawer__createClientFooter">
                  <select
                    value={newClientData.gender}
                    onChange={(event) => setNewClientData((current) => ({ ...current, gender: event.target.value }))}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                  <button type="button" onClick={handleCreateClient} disabled={isCreatingClient}>
                    {isCreatingClient ? 'Creating...' : 'Create Client'}
                  </button>
                </div>
              </div>
            )}

            {customerError && <div className="booking-create-drawer__error">{customerError}</div>}
          </div>

          <div className="booking-create-drawer__grid">
            <label className="booking-create-drawer__field">
              <span>Service</span>
              <select
                value={formData.serviceId}
                onChange={(event) => setFormData((current) => ({ ...current, serviceId: event.target.value, roomId: '' }))}
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

            <label className="booking-create-drawer__field">
              <span>Therapist</span>
              <select
                value={formData.therapistId}
                onChange={(event) => setFormData((current) => ({ ...current, therapistId: event.target.value, roomId: '' }))}
              >
                <option value="">Select therapist</option>
                {therapists.map((therapist) => (
                  <option key={therapist.id} value={therapist.id}>
                    {therapist.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="booking-create-drawer__field">
              <span>Room</span>
              <select
                value={formData.roomId}
                onChange={(event) => setFormData((current) => ({ ...current, roomId: event.target.value }))}
              >
                <option value="">Select room</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.room_name || room.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="booking-create-drawer__field">
              <span>Duration</span>
              <input
                type="number"
                min="15"
                step="15"
                value={formData.duration}
                onChange={(event) => setFormData((current) => ({ ...current, duration: event.target.value }))}
              />
            </label>

            <label className="booking-create-drawer__field">
              <span>Date</span>
              <input
                type="date"
                value={formData.date}
                onChange={(event) => setFormData((current) => ({ ...current, date: event.target.value }))}
              />
            </label>

            <label className="booking-create-drawer__field">
              <span>Time</span>
              <input
                type="time"
                value={formData.time}
                onChange={(event) => setFormData((current) => ({ ...current, time: event.target.value }))}
              />
            </label>
          </div>

          <label className="booking-create-drawer__field booking-create-drawer__field--full">
            <span>Notes</span>
            <textarea
              value={formData.note}
              onChange={(event) => setFormData((current) => ({ ...current, note: event.target.value }))}
              placeholder="Add internal note"
            />
          </label>

          {formError && <div className="booking-create-drawer__error">{formError}</div>}

          <div className="booking-create-drawer__footer">
            <button type="submit" className="booking-create-drawer__submit" disabled={!isFormValid || isSaving}>
              {isSaving ? 'Saving...' : 'Save Booking'}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
};

export default BookingFormModal;
