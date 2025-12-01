import React from "react";
import { Stack, colors, Chip } from "@mui/material";
import MPaper from "../components/common/MPaper";
import Animate from "../components/common/Animate";

const envs = [
  { name: "Staging", status: "Échec", color: colors.red[600] },
  { name: "Préprod", status: "En cours", color: colors.orange[600] },
  { name: "Production", status: "Actif", color: colors.green[600] }
];

const DeploymentsPage = () => {
  return (
    <Stack spacing={3}>
      <Animate>
        <MPaper title="Déploiements">
          <Stack spacing={2}>
            {envs.map((e, i) => (
              <Chip key={i} label={`${e.name} — ${e.status}`} sx={{ bgcolor: e.color, color: colors.common.white }} />
            ))}
          </Stack>
        </MPaper>
      </Animate>
    </Stack>
  );
};

export default DeploymentsPage;