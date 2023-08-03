const express = require("express");
const cors = require("cors");
const app = express();
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("working");
});
app.post("/payment", async (req, res) => {
  const uuid = uuidv4();
  let { amount, id, isSubscription, priceId, planId } = req.body;
  try {
    const customer = await stripe.customers.create({
      id: uuid,
      payment_method: id,
      invoice_settings: {
        default_payment_method: id,
      },
      email: "meet18@gmail.com",
    });
    // if (!isSubscription) {
    const payment = await stripe.paymentIntents.create({
      amount,
      currency: "INR",
      description: "Test payment INC",
      payment_method: id,
      confirm: true,
      customer: customer.id,
    });
    if (payment.status === "requires_action") {
      try {
        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ plan: priceId }],
          collection_method: "send_invoice",
          days_until_due: 7,
        });
        res.status(200).json({ success: true, subscription });
      } catch (e) {
        console.log(e);
        res.json({
          message: "Payment Failed",
          success: false,
        });
      }
    } else {
      res.status(400).json({ success: false, error: "Payment failed" });
    }
    // } else {
    // const subscription = await stripe.subscriptions.create({
    //   customer: customer.id,
    //   items: [{ price: priceId }],
    //   collection_method: "send_invoice",
    //   days_until_due: 7,
    // });
    // }
    // res.json({
    //   message: "Payment Successful outside",
    //   success: true,
    // });
  } catch (e) {
    console.log(e);
    res.json({
      message: "Payment Failed",
      success: false,
    });
  }
});

app.post("/pay", async (req, res) => {
  const uuid = uuidv4();
  let { id, priceId } = req.body;
  try {
    const customer = await stripe.customers.create({
      id: uuid,
      email: "testing6@gmail.com",
      payment_method: id,
      invoice_settings: {
        default_payment_method: id,
      },
    });
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ plan: priceId }],
      payment_settings: {
        payment_method_options: {
          card: {
            request_three_d_secure: "any",
          },
        },
        payment_method_types: ["card"],
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice.payment_intent"],
    });
    const clientSecret =
      subscription.latest_invoice.payment_intent.client_secret;
    res.json({ clientSecret, message: "Payment Initiated" });
  } catch (err) {
    res.status(500).json({ message: err?.raw?.message });
  }
});

app.listen(process.env.PORT || 4000, () => {
  console.log("server is listening to " + (process.env.PORT || 4000));
});
