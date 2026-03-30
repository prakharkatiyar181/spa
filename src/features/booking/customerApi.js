import apiClient from '../../api/apiClient';

const extractUserList = (payload) => {
  const candidates = [
    payload?.data?.data?.list?.data,
    payload?.data?.data?.users,
    payload?.data?.data?.list,
    payload?.data?.users,
    payload?.data?.list?.data,
    payload?.data?.list,
    payload?.data,
    payload?.users,
    payload?.list?.data,
    payload?.list,
    payload,
  ];

  return candidates.find(Array.isArray) || [];
};

const extractCreatedUser = (payload) =>
  payload?.data?.data?.user ||
  payload?.data?.data ||
  payload?.data?.user ||
  payload?.data ||
  payload;

export const normalizeCustomer = (customer) => {
  const firstName = customer?.name || customer?.first_name || '';
  const lastName = customer?.lastname || customer?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || customer?.full_name || customer?.email || 'Unnamed Client';

  return {
    id: customer?.id,
    name: fullName,
    firstName,
    lastName,
    phone: customer?.contact_number || customer?.phone || '',
    email: customer?.email || '',
    gender: customer?.gender || 'male',
  };
};

export const listCustomers = async () => {
  const response = await apiClient.get('/api/v1/users', {
    params: {
      pagination: 0,
    },
  });

  return extractUserList(response.data).map(normalizeCustomer).filter((customer) => customer.id);
};

export const createCustomer = async (payload) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      formData.append(key, value);
    }
  });

  const response = await apiClient.post('/api/v1/users/create', formData);
  return normalizeCustomer(extractCreatedUser(response.data));
};
