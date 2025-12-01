import React from "react";
import { Box, LinearProgress, Stack, Typography, colors, linearProgressClasses, Chip } from "@mui/material";
import MPaper from "../components/common/MPaper";
import Animate from "../components/common/Animate";

const stages = [
  { title: "Ingestion", value: 100, color: colors.green[600] },
  { title: "Prétraitement", value: 80, color: colors.green[600] },
  { title: "Entraînement", value: 60, color: colors.blue[600] },
  { title: "Évaluation", value: 40, color: colors.orange[600] },
  { title: "Déploiement", value: 20, color: colors.red[600] }
];

const runs = [
  { id: "run_102", status: "En cours", color: colors.orange[600] },
  { id: "run_101", status: "Succès", color: colors.green[600] },
  { id: "run_100", status: "Échec", color: colors.red[600] }
];

const MLOpsPage = () => {
  return (
    <Stack spacing={3}>
      <Animate>
        <MPaper title="Pipeline MLOps">
          <Stack spacing={3}>
            {stages.map((s, i) => (
              <Stack key={i} spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" fontWeight={600}>{s.title}</Typography>
                  <Typography variant="caption" fontWeight={600}>{s.value}%</Typography>
                </Stack>
                <Box>
                  <LinearProgress variant="determinate" value={s.value} sx={{ bgcolor: colors.grey[200], height: 10, borderRadius: 5, [`& .${linearProgressClasses.bar}`]: { borderRadius: 5, bgcolor: s.color } }} />
                </Box>
              </Stack>
            ))}
          </Stack>
        </MPaper>
      </Animate>
      <Animate delay={0.2}>
        <MPaper title="Historique des runs">
          <Stack spacing={2}>
            {runs.map((r, i) => (
              <Chip key={i} label={`${r.id} — ${r.status}`} sx={{ bgcolor: r.color, color: colors.common.white }} />
            ))}
          </Stack>
        </MPaper>
      </Animate>
    </Stack>
  );
};

export default MLOpsPage;