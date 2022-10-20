![Medusa Hackathon 2022](https://i.imgur.com/lNXGDj5.jpg)

## About

### Participants

@anteprimorac <br>
@josipmatichr <br>
@marijapolovic

### Description

Adds Reepay payment provider for Medusa Commerce.

## Set up Project

Install:

```
npm i @agilo/medusa-payment-reepay
```

Add to medusa-config.js

```javascript
{
  resolve: `@agilo/medusa-payment-reepay`,
  options: {
    api_key: REEPAY_API_KEY,
    payment_methods: ["mobilepay"],
    webhook_secret: WEBOOK_SECRET,
    accept_url: "www.some-webshop.com/checkout/payment",
    cancel_url: "www.some-webshop.com/checkout",
  },
}
```

Enable reepay as a payment provider in Medusa admin settings

## Creating Payment Session

Use Medusa API to [create Payment Sessions](https://docs.medusajs.com/api/store/#tag/Cart/operation/PostCartsCartPaymentSessions) for the available payment providers.

This will create a Reepay [charge session](https://docs.reepay.com/reference/createchargesession).

**Request**

```javascript
{
  settle: false,
  order: {
    handle: CART_ID,
    amount: TOTAL,
    currency: CURRENCY_CODE,
    customer: {
      email: CART_EMAIL,
    },
  },
  payment_methods: this.options_.payment_methods,
  accept_url: this.options_.accept_url,
  cancel_url: this.options_.cancel_url,
}
```

**Response**

```javascript
{
  id: "string",
  url: "string"
}
```

## Authorize Payment

Use Medusa API to [complete cart](https://docs.medusajs.com/api/store/#tag/Cart/operation/PostCartsCartComplete), this will result in an attempt to authorize payment.

To authorize payment using Reepay checkout you can use `cart.payment_session.data.action.url` to redirect user to the checkout page.

After completion user is redirected to the `options.accept_url`, where you can complete a cart.

If you're using webhooks you should make sure to check that the cart is not already completed to avoid conflict. In this case you should [retrieve an order](https://docs.medusajs.com/api/store/#tag/Order/operation/GetOrdersOrderCartId) before trying to complete the cart.

## Capture Payment

[Capturing payment](https://docs.medusajs.com/api/admin/#tag/Order/operation/PostOrdersOrderCapture) will result in an attempt to [settle a payment](https://reference.reepay.com/api/#settle-charge)

## Cancel Payment

[Canceling an order](https://docs.medusajs.com/api/admin/#tag/Order/operation/PostOrdersOrderCancel) will result in an attempt to [cancel a charge](https://reference.reepay.com/api/#cancel-charge)

## Refund Payment

[Creating a refund](https://docs.medusajs.com/api/admin/#tag/Order/operation/PostOrdersOrderRefunds) will result in an attempt to [create a refund](https://reference.reepay.com/api/#create-refund)

## Webhooks

Currently, the only supported webhook is for invoice_authorized.

Once this webhook is fired, this will result in an attempt to [complete a cart](https://docs.medusajs.com/api/store/#tag/Cart/operation/PostCartsCartComplete).

## MobilePay

To enable MobilePay payment method you should add a MobilePay acquirer in the Reepay acquiring configuration. After that you should add "mobilepay" as a payment method in the medusa-payment-reepay options.

## Resources

Medusa Docs\
https://docs.medusajs.com/

Reepay Docs\
https://reference.reepay.com/api/

MobilePay Docs\
https://developer.mobilepay.dk/products/online/test
