// server.js
import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";

// ✅ Load environment variables first
dotenv.config();

const app = express();
app.use(express.static("public"));
app.use(express.json());

// ✅ Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ Use Render's port if available
const PORT = process.env.PORT || 4242;

// ✅ Use environment variable for live base URL (fallback to localhost)
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

// ✅ Create Checkout session (Bacs Direct Debit setup)
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { email, name } = req.body;

    const customer = await stripe.customers.create({ name, email });

    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: customer.id,
      payment_method_types: ["bacs_debit"],
      success_url: `${APP_BASE_URL}/success.html`,
      cancel_url: `${APP_BASE_URL}/cancel.html`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ✅ (Optional) Webhook — enable later if you want automatic default-payment setup
// import bodyParser from "body-parser";
// app.post("/webhook", bodyParser.raw({ type: "application/json" }), async (req, res) => {
//   const sig = req.headers["stripe-signature"];
//   try {
//     const event = stripe.webhooks.constructEvent(
//       req.body,
//       sig,
//       process.env.STRIPE_WEBHOOK_SECRET
//     );
//
//     if (event.type === "checkout.session.completed") {
//       const session = event.data.object;
//       const si = await stripe.setupIntents.retrieve(session.setup_intent);
//       await stripe.customers.update(session.customer, {
//         invoice_settings: { default_payment_method: si.payment_method },
//       });
//     }
//
//     res.sendStatus(200);
//   } catch (e) {
//     console.error(e);
//     res.status(400).send(`Webhook Error: ${e.message}`);
//   }
// });

app.listen(PORT, () => {
  console.log(`✅ Server running on ${APP_BASE_URL}`);
});