// server.js
import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.static("public"));
app.use(express.json());

// ✅ Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ Core variables
const PORT = process.env.PORT || 4242;
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;
const ADMIN_USER = process.env.ADMIN_USERNAME || "aspectadmin";
const ADMIN_PASS = process.env.ADMIN_PASSWORD || "aspectdd";

// ✅ Basic auth middleware (for admin + API routes)
app.use((req, res, next) => {
  const protectedRoutes = ["/admin", "/search-customers", "/create-directdebit-session"];
  if (protectedRoutes.some((r) => req.path.startsWith(r))) {
    const auth = req.headers.authorization;
    if (!auth) {
      res.set("WWW-Authenticate", 'Basic realm="Aspect Admin"');
      return res.status(401).send("Authentication required.");
    }
    const [type, value] = auth.split(" ");
    if (type !== "Basic") return res.status(401).send("Invalid auth type");
    const [user, pass] = Buffer.from(value, "base64").toString().split(":");
    if (user !== ADMIN_USER || pass !== ADMIN_PASS)
      return res.status(403).send("Forbidden");
  }
  next();
});

// ✅ Health check
app.get("/", (_req, res) => {
  res.send("Aspect BACS Direct Debit setup — running ✅");
});

// ✅ Serve admin panel
app.get("/admin", (_req, res) => {
  res.sendFile(new URL("./public/admin.html", import.meta.url).pathname);
});

// ✅ Search customers by name or email
app.get("/search-customers", async (req, res) => {
  try {
    const q = req.query.q?.trim();
    if (!q) return res.json([]);

    // 🔹 Fetch first 100 customers from Stripe
    const customers = await stripe.customers.list({ limit: 100 });

    // 🔹 Case-insensitive filter
    const results = customers.data
      .filter(
        (c) =>
          (c.name && c.name.toLowerCase().includes(q.toLowerCase())) ||
          (c.email && c.email.toLowerCase().includes(q.toLowerCase()))
      )
      .map((c) => ({
        id: c.id,
        name: c.name || "(No name)",
        email: c.email || "(No email)",
      }));

    res.status(200).json(results);
  } catch (err) {
    console.error("❌ Error searching customers:", err);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// ✅ Create Stripe Checkout Setup Session (BACS)
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

    console.log("✅ Session created:", session.id);
    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on ${APP_BASE_URL}`);
});