import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Paper, Typography, colors, IconButton, TextField, Menu, MenuItem } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Animate from "./Animate";
import React, { useContext, useEffect, useState } from 'react';
import { ModeContext } from '../../theme/ModeContext';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { ChatContext } from '../../context/ChatContext';

 

const accountMenus = [
  {
    title: "Se déconnecter",
    icon: <LogoutOutlinedIcon />,
    state: "logout"
  }
];

const Sidebar = ({ sidebarWidth }) => {
  
  const navigate = useNavigate();
  const { mode, toggle } = useContext(ModeContext);
  const { chats, activeId, setActiveId, createChat, renameChat, deleteChat, duplicateChat, exportChatPdf, refreshChats, fetchChat } = useContext(ChatContext);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuChatId, setMenuChatId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameText, setRenameText] = useState('');
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/');
  };
  useEffect(() => { if (localStorage.getItem('authToken')) refreshChats(); }, []);
  const onNewChat = async () => { const id = await createChat(); if (!id) return; navigate('/dashboard/models'); setActiveId(id); };
  const openMenu = (e, id) => { setAnchorEl(e.currentTarget); setMenuChatId(id); };
  const closeMenu = () => { setAnchorEl(null); setMenuChatId(null); };
  const startRename = (id, current) => { setRenamingId(id); setRenameText(current); closeMenu(); };
  const commitRename = async () => { if (renamingId && renameText.trim()) { await renameChat(renamingId, renameText.trim()); await fetchChat(renamingId); } setRenamingId(null); };
  const onDelete = (id) => { if (window.confirm('Supprimer cette conversation ?')) { deleteChat(id); } closeMenu(); };
  const onExport = (id) => { exportChatPdf(id); closeMenu(); };
  const onDuplicate = async (id) => { const nid = await duplicateChat(id); closeMenu(); if (nid) { setActiveId(nid); navigate('/dashboard/models'); } };

  // const container = window !== undefined ? () => window.document.body : undefined;

  

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
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <List sx={{ display: 'none' }}>
            <ListItem>
              <ListItemButton onClick={toggle} sx={{ borderRadius: '10px' }}>
                <ListItemIcon sx={{ minWidth: '40px' }}>
                  {mode === 'dark' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
                </ListItemIcon>
                <ListItemText primary={
                  <Typography fontWeight={600}>
                    Thème {mode === 'dark' ? 'sombre' : 'clair'}
                  </Typography>
                } />
              </ListItemButton>
            </ListItem>
          </List>
          <List>
            <ListItem>
              <ListItemButton onClick={onNewChat} sx={{ borderRadius: '10px' }}>
                <ListItemIcon sx={{ minWidth: '40px' }}>
                  <SavingsOutlinedIcon />
                </ListItemIcon>
                <ListItemText primary={<Typography fontWeight={600}>Nouvelle discussion</Typography>} />
              </ListItemButton>
            </ListItem>
          </List>
          <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
            <List>
              {chats.map((c) => (
                <ListItem key={c.id} disableGutters disablePadding sx={{ py: 0.5 }}>
                  <ListItemButton onClick={() => { setActiveId(c.id); navigate('/dashboard/models'); }} sx={{ borderRadius: '10px', bgcolor: activeId === c.id ? colors.green[600] : '', color: activeId === c.id ? colors.common.white : '' }}>
                    <ListItemText primary={
                      renamingId === c.id ? (
                        <TextField value={renameText} onChange={(e) => setRenameText(e.target.value)} onBlur={commitRename} onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); }} size="small" autoFocus inputRef={(ref) => { if (ref) { try { ref.select(); } catch {} } }} />
                      ) : (
                        <Typography fontWeight={600}>{c.title}</Typography>
                      )
                    } />
                    <IconButton onClick={(e) => openMenu(e, c.id)} sx={{ color: activeId === c.id ? colors.common.white : '' }}>
                      <MoreVertIcon />
                    </IconButton>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
              <MenuItem onClick={() => startRename(menuChatId, (chats.find(x => x.id === menuChatId)?.title || ''))}>Renommer</MenuItem>
              <MenuItem onClick={() => onDelete(menuChatId)}>Supprimer</MenuItem>
              <MenuItem onClick={() => onExport(menuChatId)}>Exporter en PDF</MenuItem>
              <MenuItem onClick={() => onDuplicate(menuChatId)}>Dupliquer</MenuItem>
            </Menu>
          </Box>
          <List sx={{ mt: 'auto' }}>
            <ListItem>
              <ListItemButton onClick={handleLogout} sx={{ borderRadius: '10px' }}>
                <ListItemIcon sx={{ minWidth: '40px' }}>
                  <LogoutOutlinedIcon />
                </ListItemIcon>
                <ListItemText primary={<Typography fontWeight={600}>Se déconnecter</Typography>} />
              </ListItemButton>
            </ListItem>
          </List>
          </Box>
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
