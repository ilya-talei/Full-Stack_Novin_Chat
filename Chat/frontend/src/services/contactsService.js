import api from '@services/api';
import { API_ENDPOINTS } from '@constants/apiEndpoints';

function avatarUrl(name, fileName) {
  if (fileName && (String(fileName).startsWith('http://') || String(fileName).startsWith('https://'))) {
    return fileName;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=6A9BB8&color=fff&size=128`;
}

function mapContact(contact) {
  const name = contact.name || contact.username || contact.login_id || 'کاربر';
  return {
    id: String(contact.id),
    name,
    phone: contact.phone || '',
    email: contact.email,
    username: contact.username || contact.login_id,
    online: Boolean(contact.online),
    blocked: Boolean(contact.blocked),
    avatar: avatarUrl(name, contact.avatar),
    isContact: contact.isContact,
  };
}

export const contactsService = {
  async getContacts() {
    const { data } = await api.get(API_ENDPOINTS.CONTACTS.LIST);
    return (data.contacts ?? data.data ?? []).map(mapContact).filter((c) => !c.blocked);
  },

  async addContact(payload) {
    const body = payload.username || payload.login_id
      ? { username: payload.username || payload.login_id, login_id: payload.username || payload.login_id }
      : payload.contactId || payload.id
        ? { contactId: Number(payload.contactId || payload.id) }
        : payload;

    const { data } = await api.post(API_ENDPOINTS.CONTACTS.ADD, body);
    return mapContact(data);
  },

  async removeContact(id) {
    const { data } = await api.delete(API_ENDPOINTS.CONTACTS.REMOVE(id));
    return data;
  },

  async blockContact(id) {
    const { data } = await api.post(API_ENDPOINTS.CONTACTS.BLOCK(id));
    return data;
  },

  async searchContacts(query) {
    const { data } = await api.get(API_ENDPOINTS.CONTACTS.SEARCH, { params: { q: query } });
    return (data.contacts ?? data.data ?? []).map(mapContact);
  },

  async getAllContacts() {
    return this.getContacts();
  },
};
