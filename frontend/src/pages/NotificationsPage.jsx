import { Stack, Typography, colors, Chip } from "@mui/material";
import MPaper from "../components/common/MPaper";
import React from "react";
import Animate from "../components/common/Animate";

const notifications = [
  { title: "Nouveau lot de données MOSI importé", color: colors.green[600] },
  { title: "Entraînement du modèle multimodal démarré", color: colors.blue[600] },
  { title: "Échec de déploiement en staging", color: colors.red[600] },
  { title: "Tendance du sentiment en hausse", color: colors.green[600] }
];

const NotificationsPage = () => {
  return (
    <MPaper title="Notifications">
      <Stack spacing={2}>
        {notifications.map((n, i) => (
          <Animate key={i} delay={(i + 1) * 0.1}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip label={n.title} sx={{ bgcolor: n.color, color: colors.common.white }} />
              <Typography variant="caption" color={colors.grey[600]}>il y a {i + 1} h</Typography>
            </Stack>
          </Animate>
        ))}
      </Stack>
    </MPaper>
  );
};

export default NotificationsPage;