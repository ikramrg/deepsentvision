import React from "react";
import { Grid, Typography, colors, Chip, Stack } from "@mui/material";
import MPaper from "../components/common/MPaper";
import { Bar, Line } from "react-chartjs-2";
import Animate from "../components/common/Animate";

const sentimentDist = {
  labels: ["Positif", "Neutre", "Négatif"],
  datasets: [{ data: [420, 310, 180], backgroundColor: [colors.green[600], colors.grey[400], colors.red[300]] }]
};

const sentimentTrend = {
  labels: ["S1", "S2", "S3", "S4", "S5"],
  datasets: [{ label: "Score", data: [0.6, 0.64, 0.62, 0.68, 0.71], borderColor: colors.green[600], tension: 0.4 }]
};

const keywords = ["qualité", "prix", "design", "durabilité", "sav"];

const NLPPage = () => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Animate>
          <MPaper title="Distribution des sentiments (texte)">
            <Bar data={sentimentDist} options={{ plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false }} height="250px" />
          </MPaper>
        </Animate>
      </Grid>
      <Grid item xs={12} md={6}>
        <Animate delay={0.2}>
          <MPaper title="Tendance du score">
            <Line data={sentimentTrend} options={{ elements: { point: { radius: 0 } }, plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false }} height="250px" />
          </MPaper>
        </Animate>
      </Grid>
      <Grid item xs={12}>
        <Animate delay={0.4}>
          <MPaper title="Mots-clés fréquents">
            <Stack direction="row" spacing={2}>
              {keywords.map((k, i) => (
                <Chip key={i} label={k} variant="outlined" />
              ))}
            </Stack>
          </MPaper>
        </Animate>
      </Grid>
      <Grid item xs={12}>
        <Animate delay={0.6}>
          <MPaper>
            <Typography variant="body2">Modèle texte utilisé: BERT-base</Typography>
          </MPaper>
        </Animate>
      </Grid>
    </Grid>
  );
};

export default NLPPage;