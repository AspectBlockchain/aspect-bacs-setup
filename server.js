// server.js
import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PORT = process.env.PORT || 4242;
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

// ✅ Serve static files
app.use(express.static("public"));
app.use(express.json());

// ✅ Basic Auth only for /admin page (not API route)
const auth = { login: "aspectadmin", password: process.env.ADMIN_PASSWORD };

app.get("/admin.html", (req, res, next) => {
  const b64auth = (req.headers.authorization || "").split(" ")[1] || "";
  const [login, password] = Buffer.from(b64auth, "base64").toString().split(":");

  if (login === auth.login && password === auth.password) {
    return next();
  }

  res.set("WWW-Authenticate", 'Basic realm="Aspect Admin"');
  return res.status(401).send("Authentication required.");
});

// ✅ Health check
app.get("/", (_req, res) => {
  res.send("Aspect BACS Direct Debit setup (Stripe-hosted) ✅");
});

// ✅ Public endpoint (used only by admin page)
app.get("/create-directdebit-session", async (req, res) => {
  try {
    const { customer_id } = req.query;
    if (!customer_id) return res.status(400).json({ error: "Missing customer_id" });

    console.log("🧾 Creating Bacs setup session for:", customer_id);

    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      payment_method_types: ["bacs_debit"],
      customer: customer_id,
      success_url: `${APP_BASE_URL}/success.html`,
      cancel_url: `${APP_BASE_URL}/cancel.html`,
    });

    console.log("✅ Session created:", session.id, session.url);
    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe error:", err);
    res.status(400).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on ${APP_BASE_URL}`);
});