import React from "react";
import { Stack, Typography, colors } from "@mui/material";
import MPaper from "../components/common/MPaper";
import Animate from "../components/common/Animate";

const models = [
  { name: "BERT-base", metric: "F1: 0.84", color: colors.green[600] },
  { name: "ResNet-50", metric: "Acc: 0.88", color: colors.green[600] },
  { name: "Fusion MLP", metric: "AUC: 0.91", color: colors.blue[600] }
];

const ModelsPage = () => {
  return (
    <Stack spacing={3}>
      <Animate>
        <MPaper title="Modèles">
          <Stack spacing={2}>
            {models.map((m, i) => (
              <Typography key={i} variant="body2" fontWeight={600} color={m.color}>{m.name} — {m.metric}</Typography>
            ))}
          </Stack>
        </MPaper>
      </Animate>
    </Stack>
  );
};

export default ModelsPage;