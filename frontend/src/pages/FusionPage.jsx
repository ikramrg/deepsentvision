import React from "react";
import { Grid, colors } from "@mui/material";
import MPaper from "../components/common/MPaper";
import { Bar } from "react-chartjs-2";
import Animate from "../components/common/Animate";

const fusionData = {
  labels: ["Fév", "Mar", "Avr", "Mai", "Juin", "Juil"],
  datasets: [
    { label: "Texte", data: [60, 55, 58, 62, 64, 66], backgroundColor: colors.green[300], stack: "stack" },
    { label: "Image", data: [20, 25, 24, 28, 27, 26], backgroundColor: colors.blue[300], stack: "stack" },
    { label: "Fusion", data: [10, 12, 14, 18, 20, 22], backgroundColor: colors.grey[500], stack: "stack" }
  ]
};

const FusionPage = () => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Animate>
          <MPaper title="Contribution des modalités">
            <Bar data={fusionData} options={{ responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } }} height="300px" />
          </MPaper>
        </Animate>
      </Grid>
    </Grid>
  );
};

export default FusionPage;