import { withUserHeaders } from '@/lib/client-user';

const API_URL = '/api/data';

async function requestData(path: string, options: RequestInit = {}) {
  const res = await fetch(path, {
    ...options,
    headers: withUserHeaders(options.headers),
  });
  const json = await res.json();
  return json;
}

export const dataApi = {
  async getIdeas() {
    const json = await requestData(`${API_URL}?type=ideas`);
    return json.data || [];
  },

  async createIdea(content: string, topics: string[] = []) {
    const json = await requestData(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'ideas', action: 'create', data: { content, topics } }),
    });
    return json.data;
  },

  async deleteIdea(id: string) {
    await requestData(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'ideas', action: 'delete', data: { id } }),
    });
  },

  async getHooks() {
    const json = await requestData(`${API_URL}?type=hooks`);
    return json.data || [];
  },

  async createHook(text: string, hookType: string) {
    const json = await requestData(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'hooks', action: 'create', data: { text, hookType } }),
    });
    return json.data;
  },

  async deleteHook(id: string) {
    await requestData(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'hooks', action: 'delete', data: { id } }),
    });
  },

  async getTopics() {
    const json = await requestData(`${API_URL}?type=topics`);
    return json.data || [];
  },

  async createTopic(name: string, color: string) {
    const json = await requestData(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'topics', action: 'create', data: { name, color } }),
    });
    return json.data;
  },

  async deleteTopic(id: string) {
    await requestData(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'topics', action: 'delete', data: { id } }),
    });
  },

  async getDrafts() {
    const json = await requestData(`${API_URL}?type=drafts`);
    return json.data || [];
  },

  async createDraft(content: string) {
    const json = await requestData(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'drafts', action: 'create', data: { content } }),
    });
    return json.data;
  },

  async updateDraft(id: string, content: string, score?: number) {
    const json = await requestData(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'drafts',
        action: 'update',
        data: { id, content, score, status: score ? 'scored' : 'draft' },
      }),
    });
    return json.data;
  },

  async deleteDraft(id: string) {
    await requestData(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'drafts', action: 'delete', data: { id } }),
    });
  },

  async getSchedule() {
    const json = await requestData(`${API_URL}?type=schedule`);
    return json.data || [];
  },

  async createSchedule(content: string, scheduledTime: string) {
    const json = await requestData(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'schedule', action: 'create', data: { content, scheduledTime } }),
    });
    return json.data;
  },

  async deleteSchedule(id: string) {
    await requestData(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'schedule', action: 'delete', data: { id } }),
    });
  },
};
