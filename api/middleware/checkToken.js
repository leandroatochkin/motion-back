// checkToken.js
import dotenv from "dotenv";
dotenv.config();
import { supabase } from "../storage/supabase.js";

export const checkToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "Missing token" });
    }

    // Verificación del token con supabase.auth.getUser()
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Guardás el usuario en la request para usarlo en tus rutas
    req.user = data.user;
    next();

  } catch (err) {
    console.error("Token validation error:", err);
    return res.status(500).json({ message: "Token validation failed" });
  }
};