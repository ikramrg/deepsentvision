import React from 'react';
import MPaper from './MPaper';
import { Box, Stack, Typography, colors } from '@mui/material';
import { Bar } from 'react-chartjs-2';

const chartData = {
  labels: ["Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc", "Jan"],
  datasets: [
    {
      label: "Positif",
      data: [100, 90, 21, 90, 25, 91, 100, 90, 21, 90, 25, 91],
      stack: "stack 0",
      backgroundColor: colors.green[600],
      barPercentage: 0.6,
      categoryPercentage: 0.7
    },
    {
      label: "Neutre",
      data: [40, 25, 35, 30, 22, 28, 32, 24, 30, 26, 33, 29],
      stack: "stack 1",
      backgroundColor: colors.grey[400],
      barPercentage: 0.6,
      categoryPercentage: 0.7
    },
    {
      label: "Négatif",
      data: [30, 10, 8, 40, 10, 9, 30, 10, 8, 40, 10, 9],
      stack: "stack 2",
      backgroundColor: colors.red[300],
      barPercentage: 0.6,
      categoryPercentage: 0.7
    }
  ]
};

const charOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: { display: false },
      stacked: true
    },
    y: { stacked: true }
  },
  plugins: {
    legend: { display: false },
    title: { display: false }
  },
  elements: {
    bar: {
      borderRadius: 10
    }
  }
};
const StatisticData = () => {
  return (
    <MPaper title="Statistic">
      <Stack spacing={4}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2">
            (+18% positif | -5% négatif) vs année passée
          </Typography>
          <Stack direction="row" spacing={3} alignItems="center">
            {chartData.datasets.map((data, index) => (
              <Stack key={index} direction="row" alignItems="center">
                <Box sx={{
                  width: "15px",
                  height: "15px",
                  borderRadius: "4px",
                  bgcolor: data.backgroundColor,
                  mr: 1
                }} />
                <Typography variant="subtitle2">
                  {data.label}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Stack>
        {/* bar chart */}
        <Box>
          <Bar options={charOptions} data={chartData} height="300px" />
        </Box>
        {/* bar chart */}
      </Stack>
    </MPaper>
  );
};

export default StatisticData;;