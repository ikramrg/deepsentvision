import React from "react";
import { Grid, colors } from "@mui/material";
import MPaper from "../components/common/MPaper";
import { Bar, Doughnut } from "react-chartjs-2";

const emotions = {
  labels: ["Joie", "Neutre", "Colère", "Tristesse"],
  datasets: [{ data: [210, 330, 90, 70], backgroundColor: [colors.green[600], colors.grey[400], colors.red[300], colors.blue[300]] }]
};

const logos = {
  labels: ["Logo A", "Logo B", "Logo C"],
  datasets: [{ data: [120, 80, 40], backgroundColor: colors.green[600] }]
};

const palette = {
  labels: ["Vert", "Rouge", "Bleu", "Gris"],
  datasets: [{ data: [40, 25, 20, 15], backgroundColor: [colors.green[500], colors.red[400], colors.blue[400], colors.grey[500]] }]
};

const VisionPage = () => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <MPaper title="Émotions détectées">
          <Bar data={emotions} options={{ plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false }} height="250px" />
        </MPaper>
      </Grid>
      <Grid item xs={12} md={6}>
        <MPaper title="Logos reconnus">
          <Bar data={logos} options={{ plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false }} height="250px" />
        </MPaper>
      </Grid>
      <Grid item xs={12}>
        <MPaper title="Palette de couleurs dominante">
          <Doughnut data={palette} />
        </MPaper>
      </Grid>
    </Grid>
  );
};

export default VisionPage;