import React from 'react';
import { Box, Grid, Stack, Typography, colors } from '@mui/material';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import RemoveCircleOutlineOutlinedIcon from '@mui/icons-material/RemoveCircleOutlineOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import Animate from "./Animate";
import MPaper from './MPaper';

const summaryData = [
  {
    title: "Réactions positives",
    value: "311k",
    icon: <ThumbUpOutlinedIcon sx={{ fontSize: 60, color: colors.green[600] }} />
  },
  {
    title: "Réactions neutres",
    value: "281k",
    icon: <RemoveCircleOutlineOutlinedIcon sx={{ fontSize: 60, color: colors.grey[500] }} />
  },
  {
    title: "Réactions négatives",
    value: "122k",
    icon: <CloseOutlinedIcon sx={{ fontSize: 60, color: colors.red[600] }} />
  }
];

const SummaryGrid = () => {
  return (
    <Grid container spacing={3}>
      {summaryData.map((summary, index) => (
        <Grid key={index} item xs={12} lg={4}>
          <Animate type="fade" delay={(index + 1) / 3}>
            <MPaper>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack spacing={1}>
                  <Typography variant="h4" fontWeight="bold">
                    {summary.value}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" color={colors.grey[600]}>
                    {summary.title}
                  </Typography>
                </Stack>
                <Box sx={{ height: "100px", width: "100px", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {summary.icon}
                </Box>
              </Stack>
            </MPaper>
          </Animate>
        </Grid>
      ))}
    </Grid>
  );
};

export default SummaryGrid;
