// server.js
import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";

// ✅ Load environment variables
dotenv.config();

// ✅ Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ App setup
const app = express();
const PORT = process.env.PORT || 4242;
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

// =============================
//  BASIC AUTH (Protect admin.html only)
// =============================
const ADMIN_USER = process.env.ADMIN_USER || "aspectadmin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "aspectdd";

app.get("/admin.html", (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Aspect Admin Panel"');
    return res.status(401).send("Authentication required");
  }

  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString("utf8");
  const [username, password] = credentials.split(":");

  if (username !== ADMIN_USER || password !== ADMIN_PASSWORD) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Aspect Admin Panel"');
    return res.status(401).send("Invalid credentials");
  }

  next();
});

// =============================
//  STATIC FRONTEND
// =============================
app.use(express.static("public"));
app.use(express.json());

// =============================
//  HEALTH CHECK
// =============================
app.get("/", (_req, res) => {
  res.send("✅ Aspect BACS Direct Debit setup — Live and running");
});

// =============================
//  CUSTOMER SEARCH (by name/email)
// =============================
app.get("/search-customer", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Missing search query" });

    const params = { limit: 100 };
    if (q.includes("@")) params.email = q;

    const customers = await stripe.customers.list(params);

    // Filter manually if searching by name
    const results = customers.data.filter(
      (c) =>
        c.name?.toLowerCase().includes(q.toLowerCase()) ||
        c.email?.toLowerCase().includes(q.toLowerCase())
    );

    res.json(
      results.map((c) => ({
        id: c.id,
        name: c.name || "Unnamed",
        email: c.email || "—",
      }))
    );
  } catch (err) {
    console.error("❌ Customer search error:", err);
    res.status(400).json({ error: err.message });
  }
});

// =============================
//  GENERATE DIRECT DEBIT SETUP LINK
// =============================
app.get("/create-directdebit-session", async (req, res) => {
  try {
    const { customer_id } = req.query;
    if (!customer_id) return res.status(400).send("Missing customer_id");

    console.log("🧾 Creating Bacs setup session for:", customer_id);

    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      payment_method_types: ["bacs_debit"],
      customer: customer_id,
      success_url: `${APP_BASE_URL}/success.html`,
      cancel_url: `${APP_BASE_URL}/cancel.html`,
    });

    console.log("✅ Session created:", session.id, session.url);
    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe error:", err);
    res.status(400).json({ error: err.message });
  }
});

// =============================
//  START SERVER
// =============================
app.listen(PORT, () => {
  console.log(`🚀 Server running at ${APP_BASE_URL}`);
});