// server.js
import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PORT = process.env.PORT || 4242;
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

// Health check
app.get("/", (_req, res) => {
  res.send("Aspect BACS Direct Debit setup (Stripe-hosted) ✅");
});

// 🔹 Direct Debit ONLY (Stripe Checkout in setup mode)
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
    res.redirect(session.url); // <-- send user to Stripe-hosted page
  } catch (err) {
    console.error("❌ Stripe error:", err);
    res.status(400).send(err.message);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on ${APP_BASE_URL}`);
});