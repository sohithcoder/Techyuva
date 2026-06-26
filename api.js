// Shared frontend API helpers for TechYuva
const API_BASE = (!window.location.hostname || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3001/api'
  : window.location.origin + '/api';

export async function api(path, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };
  const res = await fetch(`${API_BASE}${path}`, config);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
}

export async function getCourses() {
  return api('/courses');
}

export async function getBatches(courseId) {
  const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : '';
  return api('/batches' + query);
}

export async function getStudyZoneItems(type) {
  const query = type ? `?type=${encodeURIComponent(type)}` : '';
  return api('/studyzone' + query);
}

export function formatCurrency(n) {
  return '₹' + (parseFloat(n) || 0).toLocaleString('en-IN');
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
