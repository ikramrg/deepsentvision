import React, { useContext, useMemo, useState, useEffect } from "react";
import { Box, Button, Stack, TextField, Grid, IconButton, Typography, colors } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import MPaper from "../components/common/MPaper";
import Animate from "../components/common/Animate";
import { ChatContext } from "../context/ChatContext";
import { Line, Bar, Pie } from "react-chartjs-2";

const ModelsPage = () => {
  const { chats, activeId, addMessage, createChat, refreshChats, fetchChat, renameChat, exportChatPdf, setActiveId } = useContext(ChatContext);
  const chat = useMemo(() => chats.find((c) => c.id === activeId) || null, [chats, activeId]);
  const [pairsByChat, setPairsByChat] = useState({});
  const pairs = useMemo(() => pairsByChat[chat?.id] || [], [pairsByChat, chat?.id]);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameText, setRenameText] = useState("");
  const [loading, setLoading] = useState(false);
  const valueLabelPlugin = {
    id: 'valueLabelPlugin',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      chart.data.datasets.forEach((dataset, i) => {
        const meta = chart.getDatasetMeta(i);
        meta.data.forEach((el, index) => {
          const val = dataset.data[index];
          if (val == null) return;
          ctx.save();
          ctx.fillStyle = '#ccc';
          ctx.font = '10px sans-serif';
          const isPie = chart.config?.type === 'pie' || chart.config?.type === 'doughnut';
          const text = typeof val === 'number' ? (isPie || chart.options.scales?.y?.max === 100 ? `${Math.round(val)}%` : `${val}`) : `${val}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          let x = el.x, y = el.y;
          try {
            if (isPie && typeof el.tooltipPosition === 'function') {
              const tp = el.tooltipPosition();
              x = tp.x; y = tp.y;
            } else if (!isPie) {
              y = el.y - 4;
            }
          } catch {}
          ctx.fillText(text, x, y);
          ctx.restore();
        });
      });
    }
  };

  useEffect(() => {
    setRenameText(chat?.title || "");
  }, [chat?.id, chat?.title]);

  const onAnalyse = async () => {
    setError("");
    if (pairs.length === 0) { setError("Ajoutez au moins une image."); return; }
    if (pairs.some((p) => !(p.text || '').trim())) { setError("Chaque image doit avoir un texte."); return; }
    const token = localStorage.getItem('authToken');
    if (!token) { setError("Veuillez vous connecter pour enregistrer la conversation."); return; }
    try {
      const h = await fetch('http://localhost:8001/health');
      const hd = await h.json();
      if (!hd.model_loaded) { setWarning("Modèle non chargé; mode heuristique activé."); }
    } catch { setWarning("Impossible de contacter l'API (health), tentative directe."); }
    let id = chat?.id;
    if (!id || !/^\d+$/.test(id)) { id = await createChat(); setActiveId(id); }
    if (!id || !/^\d+$/.test(id)) { setError("Échec de création de la conversation sur le serveur."); return; }
    setLoading(true);
    try {
      for (const p of pairs) {
        await addMessage(id, { role: 'user', content: (p.text || ''), images: [p.imgSrc] });
      }
      const body = {
        conversation_id: id,
        entries: pairs.map((p) => ({ image_id: p.id, image_path: p.imgSrc, filename: p.filename || 'image.jpg', text: p.text || '' })),
        options: { per_image_report: true, global_report: true }
      };
      let resp;
      try { resp = await fetch('http://localhost:8001/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); } catch (e) { setError("Échec de la requête vers l'API (8001)."); setLoading(false); return; }
      if (!resp.ok) { if (resp.status === 413) { setError("Payload trop volumineux."); } else { let msg = "Échec d'analyse côté API."; try { const err = await resp.json(); msg = err?.error ? String(err.error) : JSON.stringify(err); } catch {} setError(msg); } setLoading(false); return; }
      const data = await resp.json();
      const perImage = Array.isArray(data.per_image) ? data.per_image : (Array.isArray(data.images) ? data.images : []);
      for (const r of perImage) {
        const img = pairs.find((p) => p.id === r.image_id)?.imgSrc;
        const content = JSON.stringify({ type: 'image_report', report: r });
        await addMessage(id, { role: 'assistant', content, images: img ? [img] : [] });
      }
      const global = data.global || data.report || null;
      if (global) {
        const content = JSON.stringify({ type: 'global_report', report: global });
        await addMessage(id, { role: 'assistant', content });
      }
      await fetchChat(id);
    } catch { setError("Échec d'enregistrement."); }
    setLoading(false);
  };

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    let cid = chat?.id;
    if (!cid || !/^\d+$/.test(cid)) { cid = await createChat(); setActiveId(cid); }
    const items = [];
    for (const f of files) {
      const id = crypto.randomUUID();
      const data = await fileToCompressedDataUrl(f);
      items.push({ id, filename: f.name, imgSrc: data, text: '' });
    }
    setPairsByChat((prev) => ({ ...prev, [cid]: [ ...(prev[cid] || []), ...items ] }));
  };

  const onPairText = (i, val) => {
    const cid = chat?.id;
    if (!cid) return;
    setPairsByChat((prev) => ({ ...prev, [cid]: (prev[cid] || []).map((p, idx) => (idx === i ? { ...p, text: val } : p)) }));
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

  const dataUrlToBlob = (dataUrl) => new Promise((resolve, reject) => {
    try {
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) { u8arr[n] = bstr.charCodeAt(n); }
      resolve(new Blob([u8arr], { type: mime }));
    } catch (e) { reject(e); }
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
                <Button variant="contained" color="success" onClick={onAnalyse} disabled={pairs.length === 0 || pairs.some((p) => !(p.text || '').trim()) || loading}>{loading ? "Chargement..." : "Analyser"}</Button>
                <Button variant="outlined" sx={{ ml: 2 }} onClick={() => { if (chat?.id) exportChatPdf(chat.id); }}>Exporter PDF</Button>
                {warning && (
                  <Typography mt={1} variant="body2" sx={{ color: colors.amber[700] }}>{warning}</Typography>
                )}
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
                    (Array.isArray(m.images) && m.images.length > 0 && m.role === 'user') ? (
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
                      (() => {
                        let parsed = null;
                        try { parsed = JSON.parse(m.content || '') } catch {}
                        if (parsed && parsed.type === 'image_report') {
                          const r = parsed.report || {};
                          const pneg = Number(r.probabilities?.negatif ?? r.probabilities?.['négatif'] ?? 0) * 100;
                          const pneu = Number(r.probabilities?.neutre ?? 0) * 100;
                          const ppos = Number(r.probabilities?.positif ?? 0) * 100;
                          const perImageData = { labels: ['Négatif', 'Neutre', 'Positif'], datasets: [{ label: 'Probabilités (%)', data: [pneg, pneu, ppos], backgroundColor: [colors.red[400], colors.grey[500], colors.green[600]], borderRadius: 4 }] };
                          return (
                            <Grid item xs={12} key={`img-report-${idx}`}>
                              <Stack spacing={2}>
                                {Array.isArray(m.images) && m.images[0] && (
                                  <Box sx={{ pt: '50%', position: 'relative', '& img': { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: 2 } }}>
                                    <img src={m.images[0]} alt="" />
                                  </Box>
                                )}
                                <Typography variant="subtitle1" fontWeight={700}>Rapport</Typography>
                                <Box sx={{ height: 200 }}>
                                  <Bar data={perImageData} options={{ plugins: { legend: { display: false }, tooltip: { enabled: true } }, animation: { duration: 800 }, responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (val) => `${val}%` } } } }} plugins={[valueLabelPlugin]} />
                                </Box>
                                <Typography variant="body2">Sentiment: {r.sentiment}</Typography>
                                <Typography variant="body2">Confiance: {Number(r.confidence || 0).toFixed(2)}</Typography>
                                {Array.isArray(r.keywords) && r.keywords.length > 0 && (
                                  <Typography variant="body2">Mots-clés: {r.keywords.join(', ')}</Typography>
                                )}
                                {r.summary && (<Typography variant="body2">Résumé: {r.summary}</Typography>)}
                                {r.notes && (<Typography variant="body2">Notes: {r.notes}</Typography>)}
                              </Stack>
                            </Grid>
                          );
                        }
                        if (parsed && parsed.type === 'global_report') {
                          const gr = parsed.report || {};
                          const barData = gr.chart_data?.bar ? ({ labels: gr.chart_data.bar.labels || [], datasets: [{ label: 'Comptes', data: gr.chart_data.bar.data || [], backgroundColor: [colors.green[600], colors.grey[500], colors.red[400]], borderRadius: 4 }] }) : ({ labels: ['Positif', 'Neutre', 'Négatif'], datasets: [{ label: 'Comptes', data: [gr.counts?.positif || 0, gr.counts?.neutre || 0, gr.counts?.negatif || 0], backgroundColor: [colors.green[600], colors.grey[500], colors.red[400]], borderRadius: 4 }] });
                          const pieData = gr.chart_data?.pie ? ({ labels: gr.chart_data.pie.labels || [], datasets: [{ data: gr.chart_data.pie.data || [], backgroundColor: [colors.green[600], colors.grey[500], colors.red[400]] }] }) : ({ labels: ['Positif', 'Neutre', 'Négatif'], datasets: [{ data: [gr.percentages?.positif || 0, gr.percentages?.neutre || 0, gr.percentages?.negatif || 0], backgroundColor: [colors.green[600], colors.grey[500], colors.red[400]] }] });
                          const lineData = gr.chart_data?.line ? ({ labels: gr.chart_data.line.labels || [], datasets: [{ label: 'Historique', data: gr.chart_data.line.data || [], borderColor: colors.blue[600], tension: 0.3 }] }) : null;
                          const imgReports = (chat?.messages || []).map((mm) => { try { const p = JSON.parse(mm.content || ''); return (p && p.type === 'image_report') ? p.report : null; } catch { return null; } }).filter(Boolean);
                          const allLabels = imgReports.map((r, i2) => r.image_id || `Image ${i2 + 1}`);
                          const negs = imgReports.map((r) => Number(r?.probabilities?.negatif ?? r?.probabilities?.['négatif'] ?? 0) * 100);
                          const neus = imgReports.map((r) => Number(r?.probabilities?.neutre ?? 0) * 100);
                          const poss = imgReports.map((r) => Number(r?.probabilities?.positif ?? 0) * 100);
                          const allImagesData = { labels: allLabels, datasets: [
                            { label: 'Négatif (%)', data: negs, backgroundColor: colors.red[400], stack: 'stack1', borderRadius: 4 },
                            { label: 'Neutre (%)', data: neus, backgroundColor: colors.grey[500], stack: 'stack1', borderRadius: 4 },
                            { label: 'Positif (%)', data: poss, backgroundColor: colors.green[600], stack: 'stack1', borderRadius: 4 }
                          ] };
                          return (
                            <Grid item xs={12} key={`global-${idx}`}>
                              <Stack spacing={2}>
                                <Grid container spacing={2}>
                                  <Grid item xs={12} md={4}><Typography align="center" fontWeight={700}>Réactions positives</Typography></Grid>
                                  <Grid item xs={12} md={4}><Typography align="center" fontWeight={700}>Réactions neutres</Typography></Grid>
                                  <Grid item xs={12} md={4}><Typography align="center" fontWeight={700}>Réactions négatives</Typography></Grid>
                                </Grid>
                                <Typography variant="subtitle1" fontWeight={700}>Répartition des sentiments</Typography>
                                <Grid container spacing={2}>
                                  <Grid item xs={12} md={6}>
                                    <Box sx={{ height: 260 }}>
                                      <Bar data={barData} options={{ plugins: { legend: { display: false } }, animation: { duration: 800 }, responsive: true, maintainAspectRatio: false }} plugins={[valueLabelPlugin]} />
                                    </Box>
                                  </Grid>
                                  <Grid item xs={12} md={6}>
                                    <Box sx={{ height: 260 }}>
                                  <Pie data={pieData} options={{ plugins: { legend: { position: 'bottom' } }, animation: { duration: 800 }, responsive: true, maintainAspectRatio: false }} plugins={[valueLabelPlugin]} />
                                  </Box>
                                  </Grid>
                                </Grid>
                                {lineData && (
                                  <Stack spacing={1}>
                                    <Typography variant="subtitle1" fontWeight={700}>Historique</Typography>
                                    <Box sx={{ height: 240 }}>
                                      <Line data={lineData} options={{ plugins: { legend: { display: false } }, animation: { duration: 800 }, responsive: true, maintainAspectRatio: false, elements: { point: { radius: 2 } } }} />
                                    </Box>
                                  </Stack>
                                )}
                                {allLabels.length > 0 && (
                                  <Stack spacing={1}>
                                    <Typography variant="subtitle1" fontWeight={700}>Toutes les images</Typography>
                                    <Box sx={{ height: 280 }}>
                                      <Bar data={allImagesData} options={{ plugins: { legend: { position: 'bottom' } }, animation: { duration: 800 }, responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, max: 100, ticks: { callback: (val) => `${val}%` } } } }} plugins={[valueLabelPlugin]} />
                                    </Box>
                                  </Stack>
                                )}
                                {Array.isArray(gr.per_image) && gr.per_image.length > 0 && (
                                  <Stack>
                                    <Typography variant="body2" fontWeight={600}>Images</Typography>
                                    {gr.per_image.map((it, i3) => (
                                      <Typography key={i3} variant="body2">{it.image_id}: {it.sentiment}</Typography>
                                    ))}
                                  </Stack>
                                )}
                                <Typography variant="body2">Confiance moyenne: {Number(gr.average_confidence || 0).toFixed(2)}</Typography>
                                {Array.isArray(gr.keywords) && gr.keywords.length > 0 && (
                                  <Typography variant="body2">Mots-clés: {gr.keywords.join(', ')}</Typography>
                                )}
                              </Stack>
                            </Grid>
                          );
                        }
                        return (
                          <Grid item xs={12} key={`text-${idx}`}>
                            <Typography variant="body2">{m.content}</Typography>
                          </Grid>
                        );
                      })()
                    )
                  ))}
                </Grid>
              </Stack>
            )}
          </Stack>
        </MPaper>
      </Animate>
      <Animate delay={0.2} sx={{ display: 'none' }}>
        <MPaper title="Résumé global">
          <Line data={chartData} options={{ elements: { point: { radius: 0 } }, plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false }} height="200px" />
        </MPaper>
      </Animate>
    </Box>
  );
};

export default ModelsPage;
