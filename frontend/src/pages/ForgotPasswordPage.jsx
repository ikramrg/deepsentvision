import React, { useState } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import Animate from "../components/common/Animate";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const requestToken = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await fetch("http://localhost:4000/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email })
      });
      if (!res.ok) { setError("Email introuvable"); return; }
      const data = await res.json();
      setToken(data.token);
      setMessage("Code de réinitialisation généré. Utilisez-le ci-dessous.");
      setStep(2);
    } catch {
      setError("Erreur serveur");
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await fetch("http://localhost:4000/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, token, password: newPassword })
      });
      if (!res.ok) { setError("Code invalide"); return; }
      setMessage("Mot de passe mis à jour. Vous pouvez vous connecter.");
    } catch {
      setError("Erreur serveur");
    }
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <Animate type="fade" sx={{ maxWidth: 400, width: "100%" }}>
        {step === 1 && (
          <Box component="form" onSubmit={requestToken}>
            <Stack spacing={3}>
              <Typography variant="h6">Mot de passe oublié</Typography>
              <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
              <Button type="submit" variant="contained">Obtenir le code</Button>
              {error && <Typography color="error" fontWeight="bold">{error}</Typography>}
              {message && <Typography color="success.main" fontWeight="bold">{message}</Typography>}
              <Typography><Link to="/">Se connecter</Link></Typography>
            </Stack>
          </Box>
        )}
        {step === 2 && (
          <Box component="form" onSubmit={resetPassword}>
            <Stack spacing={3}>
              <Typography variant="h6">Réinitialiser le mot de passe</Typography>
              <TextField label="Code de réinitialisation" value={token} onChange={(e) => setToken(e.target.value)} fullWidth />
              <TextField label="Nouveau mot de passe" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} fullWidth />
              <Button type="submit" variant="contained" color="success">Mettre à jour</Button>
              {error && <Typography color="error" fontWeight="bold">{error}</Typography>}
              {message && <Typography color="success.main" fontWeight="bold">{message}</Typography>}
              <Typography><Link to="/">Se connecter</Link></Typography>
            </Stack>
          </Box>
        )}
      </Animate>
    </Box>
  );
};

export default ForgotPasswordPage;