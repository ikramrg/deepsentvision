import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'deepvision_chats';

export const ChatContext = createContext({
  chats: [],
  activeId: null,
  createChat: () => {},
  setActiveId: () => {},
  addMessage: () => {},
  renameChat: () => {},
  deleteChat: () => {},
  duplicateChat: () => {},
  exportChatPdf: () => {},
  refreshChats: () => {},
  updateMessage: () => {}
});

function titleFromText(text) {
  const words = (text || '').trim().split(/\s+/).slice(0, 8);
  const joined = words.join(' ');
  return joined.replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
}

export const ChatProvider = ({ children }) => {
  const [chats, setChats] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [activeId, setActiveId] = useState(() => (chats[0]?.id ?? null));

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(chats)); } catch {}
  }, [chats]);

  const apiBase = "http://localhost:4001";
  const withAuth = (opts = {}) => {
    const token = localStorage.getItem("authToken") || "";
    const headers = { ...(opts.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    return { ...opts, headers };
  };

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/chats`, withAuth());
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data.chats) ? data.chats.map(c => ({ ...c, messages: Array.isArray(c.messages) ? c.messages : [] })) : [];
        setChats(list);
        setActiveId((prev) => prev ?? (list[0]?.id ?? null));
      } catch {}
    })();
  }, []);

  const refreshChats = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/chats`, withAuth());
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data.chats) ? data.chats.map(c => ({ ...c, messages: Array.isArray(c.messages) ? c.messages : [] })) : [];
      setChats(list);
      setActiveId((prev) => prev ?? (list[0]?.id ?? null));
    } catch {}
  }, []);

  const createChat = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/chats`, withAuth({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }));
      if (!res.ok) {
        const id = crypto.randomUUID();
        const chat = { id, title: 'New Chat', messages: [], customTitle: false, createdAt: Date.now(), updatedAt: Date.now() };
        setChats((prev) => [chat, ...prev]);
        setActiveId(id);
        return id;
      }
      const data = await res.json();
      const chat = { id: data.chat.id, title: data.chat.title, messages: [], customTitle: !!data.chat.customTitle, createdAt: Date.now(), updatedAt: Date.now() };
      setChats((prev) => [chat, ...prev]);
      setActiveId(chat.id);
      return chat.id;
    } catch {
      const id = crypto.randomUUID();
      const chat = { id, title: 'New Chat', messages: [], customTitle: false, createdAt: Date.now(), updatedAt: Date.now() };
      setChats((prev) => [chat, ...prev]);
      setActiveId(id);
      return id;
    }
  }, []);

  const addMessage = useCallback(async (chatId, message) => {
    const cur = chats.find((c) => c.id === chatId);
    const first = !!cur && (cur.messages || []).length === 0 && !cur.customTitle && message.role === 'user';
    const rawText = (message.content || '').trim();
    const autoTitle = rawText ? titleFromText(rawText) : (Array.isArray(message.images) && message.images.length > 0 ? 'Images' : ((cur && cur.title) || 'New Chat'));
    try {
      const res = await fetch(`${apiBase}/api/chats/${chatId}/messages`, withAuth({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: message.role, content: message.content, images: message.images || [] }) }));
      const ok = res.ok;
      const saved = ok ? (await res.json()).message : null;
      if (first) {
        try { await fetch(`${apiBase}/api/chats/${chatId}`, withAuth({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: autoTitle }) })); } catch {}
      }
      setChats((prev) => prev.map((c) => {
        if (c.id !== chatId) return c;
        const msg = saved ? { ...message, id: saved.id } : { ...message };
        const updatedMessages = [...c.messages, msg];
        let newTitle = c.title;
        let customTitle = c.customTitle;
        if (updatedMessages.length === 1 && message.role === 'user') {
          newTitle = autoTitle;
          customTitle = first ? true : customTitle;
        }
        return { ...c, messages: updatedMessages, title: newTitle, customTitle, updatedAt: Date.now() };
      }));
      return saved?.id || null;
    } catch {
      if (first) {
        try { await fetch(`${apiBase}/api/chats/${chatId}`, withAuth({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: autoTitle }) })); } catch {}
      }
      setChats((prev) => prev.map((c) => {
        if (c.id !== chatId) return c;
        const updatedMessages = [...c.messages, { ...message }];
        let newTitle = c.title;
        let customTitle = c.customTitle;
        if (updatedMessages.length === 1 && message.role === 'user') {
          newTitle = autoTitle;
          customTitle = first ? true : customTitle;
        }
        return { ...c, messages: updatedMessages, title: newTitle, customTitle, updatedAt: Date.now() };
      }));
      return null;
    }
  }, []);

  const renameChat = useCallback(async (chatId, title) => {
    try {
      await fetch(`${apiBase}/api/chats/${chatId}`, withAuth({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) }));
    } catch {}
    setChats((prev) => prev.map((c) => c.id === chatId ? { ...c, title, customTitle: true, updatedAt: Date.now() } : c));
  }, []);

  const deleteChat = useCallback(async (chatId) => {
    try { await fetch(`${apiBase}/api/chats/${chatId}`, withAuth({ method: 'DELETE' })); } catch {}
    setChats((prev) => prev.filter((c) => c.id !== chatId));
    setActiveId((cur) => (cur === chatId ? null : cur));
  }, []);

  const duplicateChat = useCallback(async (chatId) => {
    try {
      const res = await fetch(`${apiBase}/api/chats/${chatId}/duplicate`, withAuth({ method: 'POST' }));
      if (!res.ok) return null;
      const data = await res.json();
      const nid = data.chat.id;
      const det = await fetch(`${apiBase}/api/chats/${nid}`, withAuth());
      if (det.ok) {
        const d = await det.json();
        const chat = { id: d.chat.id, title: d.chat.title, messages: d.chat.messages || [], customTitle: !!d.chat.customTitle, createdAt: d.chat.createdAt, updatedAt: d.chat.updatedAt };
        setChats((prev) => [chat, ...prev]);
        return nid;
      }
      setChats((prev) => [{ id: nid, title: data.chat.title, messages: [], customTitle: true, createdAt: Date.now(), updatedAt: Date.now() }, ...prev]);
      return nid;
    } catch {
      const orig = chats.find((c) => c.id === chatId);
      if (!orig) return null;
      const id = crypto.randomUUID();
      const dup = { ...orig, id, title: `${orig.title} (Copy)`, customTitle: true, createdAt: Date.now(), updatedAt: Date.now() };
      setChats((prev) => [dup, ...prev]);
      return id;
    }
  }, [chats]);

  const exportChatPdf = useCallback(async (chatId) => {
    const root = document.getElementById('chat-export-root');
    if (!root) return;
    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(root, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = canvas.height * (imgWidth / canvas.width);
    let y = 0;
    while (y < imgHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0 - y, imgWidth, imgHeight);
      if (y + pageHeight < imgHeight) pdf.addPage();
      y += pageHeight;
    }
    pdf.save('chat.pdf');
  }, []);

  const updateMessage = useCallback(async (chatId, messageId, patch) => {
    try {
      await fetch(`${apiBase}/api/messages/${messageId}`, withAuth({ method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: patch.content, images: patch.images }) }));
    } catch {}
    setChats((prev) => prev.map((c) => {
      if (c.id !== chatId) return c;
      const msgs = c.messages.map((m) => m.id === messageId ? { ...m, content: patch.content ?? m.content, images: patch.images ?? m.images } : m);
      return { ...c, messages: msgs, updatedAt: Date.now() };
    }));
  }, []);

  useEffect(() => {
    if (!activeId || !/^\d+$/.test(activeId)) return;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/chats/${activeId}`, withAuth());
        if (!res.ok) return;
        const data = await res.json();
        const det = data.chat || {};
        const msgs = Array.isArray(det.messages) ? det.messages : [];
        setChats((prev) => prev.map((c) => c.id === activeId ? { ...c, title: det.title ?? c.title, customTitle: !!det.customTitle, createdAt: det.createdAt ?? c.createdAt, updatedAt: det.updatedAt ?? c.updatedAt, messages: msgs } : c));
      } catch {}
    })();
  }, [activeId]);

  const fetchChat = useCallback(async (id) => {
    try {
      const res = await fetch(`${apiBase}/api/chats/${id}`, withAuth());
      if (!res.ok) return;
      const data = await res.json();
      const det = data.chat || {};
      const msgs = Array.isArray(det.messages) ? det.messages : [];
      setChats((prev) => prev.map((c) => c.id === id ? { ...c, title: det.title ?? c.title, customTitle: !!det.customTitle, createdAt: det.createdAt ?? c.createdAt, updatedAt: det.updatedAt ?? c.updatedAt, messages: msgs } : c));
    } catch {}
  }, []);

  const value = useMemo(() => ({ chats, activeId, createChat, setActiveId, addMessage, renameChat, deleteChat, duplicateChat, exportChatPdf, refreshChats, updateMessage, fetchChat }), [chats, activeId, createChat, addMessage, renameChat, deleteChat, duplicateChat, exportChatPdf, refreshChats, updateMessage, fetchChat]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
