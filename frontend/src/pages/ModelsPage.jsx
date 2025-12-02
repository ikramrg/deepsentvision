import React, { useContext, useMemo, useState, useEffect } from "react";
import { Box, Button, Stack, TextField, Grid, IconButton, Typography, colors } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import MPaper from "../components/common/MPaper";
import Animate from "../components/common/Animate";
import { ChatContext } from "../context/ChatContext";
import { Line } from "react-chartjs-2";

const ModelsPage = () => {
  const { chats, activeId, addMessage, createChat, refreshChats, fetchChat, renameChat } = useContext(ChatContext);
  const chat = useMemo(() => chats.find((c) => c.id === activeId) || null, [chats, activeId]);
  const [pairs, setPairs] = useState([]);
  const [error, setError] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameText, setRenameText] = useState("");

  useEffect(() => {
    setRenameText(chat?.title || "");
  }, [chat?.id, chat?.title]);

  const onAnalyse = async () => {
    setError("");
    const token = localStorage.getItem('authToken');
    if (!token) { setError("Veuillez vous connecter pour enregistrer la conversation."); return; }
    let id = chat?.id;
    if (!id || !/^\d+$/.test(id)) {
      id = await createChat();
    }
    if (!id || !/^\d+$/.test(id)) { setError("Échec de création de la conversation sur le serveur."); return; }
    try {
      for (const p of pairs) {
        const mid = await addMessage(id, { role: 'user', content: (p.text || ''), images: [p.imgSrc] });
        if (!mid) throw new Error('save-failed');
      }
      const finalId = await addMessage(id, { role: 'user', content: 'Analyse' });
      if (!finalId) throw new Error('save-failed');
      await fetchChat(id);
    } catch {
      setError("Échec d'enregistrement. Vérifiez la connexion au serveur.");
    }
  };

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    for (const f of files) {
      const data = await fileToCompressedDataUrl(f);
      setPairs((prev) => [...prev, { imgSrc: data, text: '' }]);
    }
  };

  const onPairText = (i, val) => {
    setPairs((prev) => prev.map((p, idx) => (idx === i ? { ...p, text: val } : p)));
  };

  const fileToCompressedDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 800;
        const maxH = 800;
        const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try { resolve(canvas.toDataURL('image/jpeg', 0.7)); } catch (err) { reject(err); }
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });


  const onAddClick = () => { const el = document.getElementById('chat-add-input'); if (el) el.click(); };

  const chartData = {
    labels: (chat?.messages || []).map((_, i) => `M${i + 1}`),
    datasets: [{ label: "Messages", data: (chat?.messages || []).map(() => 1), tension: 0.3 }]
  };

  return (
    <Box id="chat-export-root">
      <Animate>
        <MPaper>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              {renaming ? (
                <TextField
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                  size="small"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (chat?.id && renameText.trim()) renameChat(chat.id, renameText.trim());
                      setRenaming(false);
                    }
                  }}
                  onBlur={() => {
                    if (chat?.id && renameText.trim()) renameChat(chat.id, renameText.trim());
                    setRenaming(false);
                  }}
                  sx={{ maxWidth: 400 }}
                />
              ) : (
                <Typography variant="h6" fontWeight={700}>{chat?.title || "Conversation"}</Typography>
              )}
              <Button variant="text" onClick={() => setRenaming(true)} disabled={!chat}>Renommer</Button>
            </Stack>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Button variant="outlined" component="label">
                  Importer des images
                  <input hidden type="file" accept="image/*" multiple onChange={onFiles} />
                </Button>
                
                <input hidden id="chat-add-input" type="file" accept="image/*" multiple onChange={onFiles} />
              </Stack>
              {pairs.length > 0 && (
                <Grid container spacing={2}>
                  {pairs.map((p, i) => (
                    <Grid item xs={12} sm={6} md={4} key={i}>
                      <Stack spacing={1}>
                        <Box sx={{ position: 'relative', height: 100, '& img': { width: '100%', height: '100%', borderRadius: 2, objectFit: 'cover' } }}>
                          <img src={p.imgSrc} alt="preview" />
                          {i === pairs.length - 1 && (
                            <IconButton size="small" onClick={onAddClick} sx={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', bgcolor: 'background.paper' }}>
                              <AddIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                        <TextField value={p.text} onChange={(e) => onPairText(i, e.target.value)} placeholder="Texte associé" fullWidth />
                      </Stack>
                    </Grid>
                  ))}
                </Grid>
              )}
              <Box>
                <Button variant="contained" color="success" onClick={onAnalyse}>Analyser</Button>
                {error && (
                  <Typography mt={1} variant="body2" sx={{ color: colors.red[600] }}>{error}</Typography>
                )}
              </Box>
            </Stack>
            {chat && (chat.messages || []).length > 0 && (
              <Stack spacing={2} sx={{ mt: 3 }}>
                <Typography variant="body1" fontWeight={600}>Messages enregistrés</Typography>
                <Grid container spacing={2}>
                  {(chat.messages || []).map((m, idx) => (
                    (Array.isArray(m.images) && m.images.length > 0) ? (
                      m.images.map((src, i2) => (
                        <Grid item xs={12} sm={6} md={4} key={`${idx}-${i2}`}>
                          <Stack spacing={1}>
                            <Box sx={{ pt: '100%', position: 'relative', '& img': { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 2 } }}>
                              <img src={src} alt="saved" />
                            </Box>
                            {m.content && (
                              <Typography variant="body2">{m.content}</Typography>
                            )}
                          </Stack>
                        </Grid>
                      ))
                    ) : (
                      <Grid item xs={12} key={`text-${idx}`}>
                        <Typography variant="body2">{m.content}</Typography>
                      </Grid>
                    )
                  ))}
                </Grid>
              </Stack>
            )}
          </Stack>
        </MPaper>
      </Animate>
      <Animate delay={0.2}>
        <MPaper title="Résumé global">
          <Line data={chartData} options={{ elements: { point: { radius: 0 } }, plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false }} height="200px" />
        </MPaper>
      </Animate>
    </Box>
  );
};

export default ModelsPage;
