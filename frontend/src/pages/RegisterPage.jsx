import React, { useState } from "react";
import { Box, Button, Stack, TextField, Typography, colors } from "@mui/material";
import { useNavigate, Link } from "react-router-dom";
import Animate from "../components/common/Animate";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas"); return; }
    try {
      const res = await fetch("http://localhost:4001/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password })
      });
      if (!res.ok) { setError("Impossible de créer le compte"); return; }
      const data = await res.json();
      localStorage.setItem("authToken", data.token);
      navigate("/dashboard");
    } catch {
      setError("Erreur serveur");
    }
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <Animate type="fade" sx={{ maxWidth: 400, width: "100%" }}>
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={3}>
            <Typography variant="h6">Créer un compte</Typography>
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
            <TextField label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth />
            <TextField label="Confirmer le mot de passe" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} fullWidth />
            <Button type="submit" variant="contained" color="success">Créer</Button>
            {error && <Typography color="error" fontWeight="bold">{error}</Typography>}
            <Typography>
              <Link to="/">Se connecter</Link>
            </Typography>
          </Stack>
        </Box>
      </Animate>
    </Box>
  );
};

export default RegisterPage;
