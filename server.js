// server.js
import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";

// ✅ Load environment variables
dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PORT = process.env.PORT || 4242;
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

// ✅ Health check route (optional)
app.get("/", (req, res) => {
  res.send("Aspect Blockchain BACS Direct Debit setup is running ✅");
});

// ✅ Stripe-hosted Customer Portal (for existing Stripe customers)
app.get("/create-portal-session", async (req, res) => {
  try {
    const { customer_id } = req.query;

    if (!customer_id) {
      return res.status(400).send("Missing customer_id in query parameters");
    }

    console.log("🧾 Creating Customer Portal session for:", customer_id);

    // Create a billing portal session for the existing customer
    const session = await stripe.billingPortal.sessions.create({
      customer: customer_id,
      return_url: `${APP_BASE_URL}/success.html`, // Redirect after setup or management
    });

    console.log("✅ Portal session created:", session.url);

    // Redirect user directly to their unique Stripe-hosted portal
    res.redirect(session.url);
  } catch (err) {
    console.error("❌ Stripe error:", err);
    res.status(400).send(`Error: ${err.message}`);
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on ${APP_BASE_URL}`);
});