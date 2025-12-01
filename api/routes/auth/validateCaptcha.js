import express from "express";
import axios from "axios";

const router = express.Router();

async function verifyCaptcha(token) {
  const secret = process.env.CAPTCHA_SECRET_KEY;

  const verifyURL = "https://hcaptcha.com/siteverify";

  try {
    const response = await axios.post(
      verifyURL,
      new URLSearchParams({
        response: token,
        secret: secret
      })
    );

    return response.data.success === true;
  } catch (err) {
    console.error("Captcha verification error:", err);
    return false;
  }
}


router.post("/", async (req, res) => {
  const { token } = req.body;

  const isValid = await verifyCaptcha(token);

  if (!isValid) {
    return res.status(400).json({ message: "Captcha failed" });
  }

  return res.json({ message: "Captcha ok" });
});

export default router;
