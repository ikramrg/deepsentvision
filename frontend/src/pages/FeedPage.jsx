import { Avatar, Box, Stack, Typography, colors, Chip, Divider } from "@mui/material";
import MPaper from "../components/common/MPaper";
import { images } from "../assets";
import React from "react";
import Animate from "../components/common/Animate";

const posts = [
  { user: "@brand_fan", time: "il y a 2h", text: "Trop bien ce produit 😍", sentiment: "Positif", color: colors.green[600], image: images.bookingImage },
  { user: "@skeptic_user", time: "il y a 5h", text: "Ça casse vite, déçu 😒", sentiment: "Négatif", color: colors.red[600], image: images.userProfile },
  { user: "@neutral_view", time: "hier", text: "Correct sans plus", sentiment: "Neutre", color: colors.grey[600], image: images.summaryImages.totalBook }
];

const FeedPage = () => {
  return (
    <Stack spacing={3}>
      <Animate>
        <Stack direction="row" spacing={2}>
          <Chip label="Tous" color="success" variant="outlined" />
          <Chip label="Positif" color="success" />
          <Chip label="Neutre" />
          <Chip label="Négatif" color="error" />
        </Stack>
      </Animate>
      <Divider />
      {posts.map((p, i) => (
        <Animate key={i} delay={(i + 1) * 0.1}>
          <MPaper>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar src={images.userProfile} />
              <Stack>
                <Typography variant="subtitle2">{p.user}</Typography>
                <Typography variant="caption" color={colors.grey[600]}>{p.time}</Typography>
              </Stack>
              <Chip label={p.sentiment} sx={{ ml: "auto" }} style={{ backgroundColor: p.color, color: colors.common.white }} />
            </Stack>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1">{p.text}</Typography>
            </Box>
            <Box sx={{ mt: 2, position: "relative", pt: "56%", "& img": { position: "absolute", top: 0, width: "100%", height: "100%", borderRadius: 8 } }}>
              <img src={p.image} alt="media" />
            </Box>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Chip label="#promotion" variant="outlined" />
              <Chip label="#nouveauProduit" variant="outlined" />
              <Chip label="#avis" variant="outlined" />
            </Stack>
          </MPaper>
        </Animate>
      ))}
    </Stack>
  );
};

export default FeedPage;