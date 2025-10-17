// server.js
import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PORT = process.env.PORT || 4242;
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

// ✅ Stripe-hosted Bacs Direct Debit setup page (no local HTML needed)
app.get("/create-checkout-session", async (req, res) => {
  try {
    const { email, name } = req.query;

    if (!email || !name) {
      return res.status(400).send("Missing name or email");
    }

    console.log("🧾 Creating hosted checkout for:", name, email);

    const customer = await stripe.customers.create({ email, name });

    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      payment_method_types: ["bacs_debit"],
      customer: customer.id,
      success_url: `${APP_BASE_URL}/success.html`,
      cancel_url: `${APP_BASE_URL}/cancel.html`,
    });

    console.log("✅ Hosted session created:", session.url);
    res.redirect(session.url);
  } catch (err) {
    console.error("❌ Stripe error:", err);
    res.status(400).send(err.message);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on ${APP_BASE_URL}`);
});