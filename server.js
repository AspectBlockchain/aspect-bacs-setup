// server.js
import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";

// ✅ Load environment variables
dotenv.config();

const app = express();
app.use(express.static("public"));
app.use(express.json());

// ✅ Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ Use Render's port or default to 4242
const PORT = process.env.PORT || 4242;

// ✅ Use your environment base URL (Render or localhost)
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

// ✅ Create Checkout Session (Bacs Direct Debit setup)
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { email, name } = req.body;

    console.log("🧾 Creating customer:", name, email);

    // Create or reuse customer
    const customer = await stripe.customers.create({ name, email });
    console.log("✅ Customer created:", customer.id);

    // Create checkout session in setup mode
    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      payment_method_types: ["bacs_debit"],
      customer: customer.id,
      success_url: `${APP_BASE_URL}/success.html`,
      cancel_url: `${APP_BASE_URL}/cancel.html`,
    });

    // 🧩 Debug line to show full session response
    console.log("🔎 Full session response:", session);

    console.log("✅ Stripe session created:", session.id);
    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ✅ Optional webhook (enable later for auto “set default”)
//// import bodyParser from "body-parser";
//// app.post("/webhook", bodyParser.raw({ type: "application/json" }), async (req, res) => {
////   const sig = req.headers["stripe-signature"];
////   try {
////     const event = stripe.webhooks.constructEvent(
////       req.body,
////       sig,
////       process.env.STRIPE_WEBHOOK_SECRET
////     );
////
////     if (event.type === "checkout.session.completed") {
////       const session = event.data.object;
////       const si = await stripe.setupIntents.retrieve(session.setup_intent);
////       await stripe.customers.update(session.customer, {
////         invoice_settings: { default_payment_method: si.payment_method },
////       });
////     }
////
////     res.sendStatus(200);
////   } catch (e) {
////     console.error(e);
////     res.status(400).send(`Webhook Error: ${e.message}`);
////   }
//// });

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on ${APP_BASE_URL}`);
});