// server.js
import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PORT = process.env.PORT || 4242;
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

// ✅ Basic Auth for admin routes
const auth = { login: "aspectadmin", password: process.env.ADMIN_PASSWORD };

app.use((req, res, next) => {
  // Protect only /admin and /admin.html
  if (req.path.startsWith("/admin")) {
    const b64auth = (req.headers.authorization || "").split(" ")[1] || "";
    const [login, password] = Buffer.from(b64auth, "base64")
      .toString()
      .split(":");

    if (login === auth.login && password === auth.password) {
      return next();
    }

    res.set("WWW-Authenticate", 'Basic realm="Aspect Admin"');
    return res.status(401).send("Authentication required.");
  }

  next();
});

// ✅ Serve all static files from "public"
app.use(express.static("public"));
app.use(express.json());

// Health check route
app.get("/", (_req, res) => {
  res.send("Aspect BACS Direct Debit setup (Stripe-hosted) ✅");
});

// 🔹 Stripe-hosted Direct Debit setup route
app.get("/create-directdebit-session", async (req, res) => {
  try {
    const { customer_id } = req.query;
    if (!customer_id) return res.status(400).send("Missing customer_id");

    console.log("🧾 Creating Bacs setup session for:", customer_id);

    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      payment_method_types: ["bacs_debit"],
      customer: customer_id, // existing Stripe customer
      success_url: `${APP_BASE_URL}/success.html`,
      cancel_url: `${APP_BASE_URL}/cancel.html`,
    });

    console.log("✅ Session created:", session.id, session.url);
    res.redirect(session.url); // Redirect to Stripe-hosted DD setup page
  } catch (err) {
    console.error("❌ Stripe error:", err);
    res.status(400).send(err.message);
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on ${APP_BASE_URL}`);
});