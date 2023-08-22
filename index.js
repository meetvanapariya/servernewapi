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

app.post("/pay", async (req, res) => {
  const uuid = uuidv4();
  let { id, priceId, amount } = req.body;
  try {
    //create dummy customer
    const customer = await stripe.customers.create(
      {
        id: uuid,
        email: "jack@gmail.com",
        payment_method: id,
        invoice_settings: {
          default_payment_method: id,
        },
      },
      { idempotencyKey: uuid }
    );
    //Check if subscription is one time or recurring by id
    //when you create product from stripe you will get price id
    if (priceId == "price_1NbJBQAYF8m6Yfq3sQwgg2rV") {
      //===== This is for one time payment =====

      // Step 1: Create invoice
      const invoice = await stripe.invoices.create({
        customer: customer.id,
        collection_method: "charge_automatically",
      });

      // Step 2: Create invoice items which will add product details this invoice.
      const invoiceItems = await stripe.invoiceItems.create({
        customer: customer.id,
        price: priceId,
        quantity: 1,
        invoice: invoice.id,
      });

      // Step 3:Finalize invoice that way it will change invoice status from draft to open.
      await stripe.invoices.finalizeInvoice(invoice.id);

      // Step 4: we will retrieve all details to get client secret to confirm payment in frontend.
      const invoiceData = await stripe.invoices.retrieve(invoice.id);
      const paymentIntent = await stripe.paymentIntents.retrieve(
        invoiceData.payment_intent
      );

      // Get the client secret from the Payment Intent
      const clientSecret = paymentIntent.client_secret;
      res.json({ clientSecret, message: "Payment Initiated" });
    } else {
      // ==== This is for subscription creation ====
      //Subscription default generate invoice so we don't need to code for invoice
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
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err?.raw?.message });
  }
});

app.listen(process.env.PORT || 4000, () => {
  console.log("server is listening to " + (process.env.PORT || 4000));
});
