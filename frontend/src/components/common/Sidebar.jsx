import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import DashboardCustomizeOutlinedIcon from '@mui/icons-material/DashboardCustomizeOutlined';
import DirectionsCarFilledOutlinedIcon from '@mui/icons-material/DirectionsCarFilledOutlined';
import MailOutlinedIcon from '@mui/icons-material/MailOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import OtherHousesOutlinedIcon from '@mui/icons-material/OtherHousesOutlined';
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import SportsMotorsportsOutlinedIcon from '@mui/icons-material/SportsMotorsportsOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Paper, Typography, colors } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import Animate from "./Animate";

const menus = [
  {
    title: "Tableau de bord",
    icon: <DashboardCustomizeOutlinedIcon />,
    state: "overview",
    to: "/dashboard"
  },
  {
    title: "Flux social",
    icon: <MailOutlinedIcon />,
    state: "feed",
    to: "/dashboard/feed"
  },
  {
    title: "Notifications",
    icon: <NotificationsOutlinedIcon />,
    state: "notifications",
    to: "/dashboard/notifications"
  }
];

const serviceMenus = [
  {
    title: "Analyse de texte",
    icon: <ChatBubbleOutlineOutlinedIcon />,
    state: "nlp",
    to: "/dashboard/nlp"
  },
  {
    title: "Analyse d'images",
    icon: <SportsMotorsportsOutlinedIcon />,
    state: "vision",
    to: "/dashboard/vision"
  },
  {
    title: "Fusion multimodale",
    icon: <SwapHorizOutlinedIcon />,
    state: "fusion",
    to: "/dashboard/fusion"
  }
];

const investmentMenus = [
  {
    title: "Pipeline MLOps",
    icon: <OtherHousesOutlinedIcon />,
    state: "mlops",
    to: "/dashboard/mlops"
  },
  {
    title: "Modèles",
    icon: <SavingsOutlinedIcon />,
    state: "models",
    to: "/dashboard/models"
  },
  {
    title: "Déploiements",
    icon: <DirectionsCarFilledOutlinedIcon />,
    state: "deployments",
    to: "/dashboard/deployments"
  }
];

const accountMenus = [
  {
    title: "Se déconnecter",
    icon: <LogoutOutlinedIcon />,
    state: "logout"
  }
];

const Sidebar = ({ sidebarWidth }) => {
  const activeState = "overview";
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/');
  };

  // const container = window !== undefined ? () => window.document.body : undefined;

  const MenuItem = (props) => {
    return (
      <ListItem key={props.index} disableGutters disablePadding sx={{ py: 0.5 }}>
        <ListItemButton component={props.item.to ? Link : 'button'} to={props.item.to || undefined} onClick={props.onClick || undefined} sx={{
          borderRadius: "10px",
          bgcolor: props.isActive ? colors.green[600] : "",
          color: props.isActive ? colors.common.white : "",
          "&:hover": {
            bgcolor: props.isActive ? colors.green[600] : "",
            color: props.isActive ? colors.common.white : "",
          }
        }}>
          <ListItemIcon sx={{
            minWidth: "40px",
            color: props.isActive ? colors.common.white : ""
          }}>
            {props.item.icon}
          </ListItemIcon>
          <ListItemText primary={
            <Typography fontWeight={600}>
              {props.item.title}
            </Typography>
          } />
        </ListItemButton>
      </ListItem>
    );
  };

  const drawer = (
    <Box
      padding={3}
      paddingBottom={0}
      display="flex"
      flexDirection="column"
      height="100vh"
      sx={{
        "::-webkit-scrollbar": {
          display: "none"
        }
      }}
    >
      

      <Animate sx={{ flexGrow: 1 }}>
        <Paper
          elevation={0}
          square
          sx={{
            borderTopRightRadius: "10px",
            borderTopLeftRadius: "10px",
            p: 2,
            height: "100%",
            boxShadow: "rgba(145, 158, 171, 0.2) 0px 0px 2px 0px, rgba(145, 158, 171, 0.12) 0px 12px 24px -4px"
          }}
        >
          {/* menu group 1 */}
          <List>
            {menus.map((item, index) => (
              <MenuItem
                key={index}
                item={item}
                isActive={item.state === activeState}
              />
            ))}
          </List>
          {/* menu group 1 */}

          {/* menu group 2 */}
          <List>
            <ListItem>
              <Typography fontWeight={600} mt={1} color={colors.grey[600]}>
                Modules d'analyse
              </Typography>
            </ListItem>
            {serviceMenus.map((item, index) => (
              <MenuItem
                key={index}
                item={item}
                isActive={item.state === activeState}
              />
            ))}
          </List>
          {/* menu group 2 */}

          {/* menu group 3 */}
          <List>
            <ListItem>
              <Typography fontWeight={600} mt={1} color={colors.grey[600]}>
                MLOps & Modèles
              </Typography>
            </ListItem>
            {investmentMenus.map((item, index) => (
              <MenuItem
                key={index}
                item={item}
                isActive={item.state === activeState}
              />
            ))}
          </List>
          {/* menu group 3 */}
          <List>
            <ListItem>
              <Typography fontWeight={600} mt={1} color={colors.grey[600]}>
                Compte
              </Typography>
            </ListItem>
            {accountMenus.map((item, index) => (
              <MenuItem
                key={index}
                item={item}
                isActive={false}
                onClick={handleLogout}
              />
            ))}
          </List>
        </Paper>
      </Animate>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{
        width: { md: sidebarWidth },
        flexShrink: { md: 0 }
      }}
    >
      {/* large screen */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", sm: "none", md: "block" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: sidebarWidth,
            borderWidth: 0,
            bgcolor: "transparent",
            "::-webkit-scrollbar": {
              display: "none"
            }
          }
        }}
        open
      >
        {drawer}
      </Drawer>
      {/* large screen */}
    </Box>
  );
};

export default Sidebar;