# Testing the Stripe card payment flow

Flow: checkout session -> pay on Stripe -> Stripe calls our webhook -> order is created.

## 1. One-time setup

1. Check the Stripe CLI is installed: `stripe --version`
   - If you get `command not found`: `brew install stripe/stripe-cli/stripe`
2. Log in: `stripe login` (follow the browser prompt)

## 2. Start the webhook listener

Keep it running in its own terminal:

```
stripe listen --events checkout.session.completed --forward-to localhost:8000/webhook-checkout
```

It prints a signing secret that starts with `whsec_...`.

The CLI requires you to choose which events to forward. The options are:

| Option | What it forwards |
| --- | --- |
| `--events checkout.session.completed` | Only the events you list (comma separated, no spaces). Our webhook only handles `checkout.session.completed`, so this is the one to use. |
| `--all-snapshot` | Every snapshot event. A snapshot event carries the full object (for example the whole checkout session) in the payload. This is the classic webhook style and the style our code reads. |
| `--all-thin` | Every thin event. A thin event carries only a small payload (the event type and the id of the related object), and you fetch the full object from the API yourself. Our code does not read this style. |

Use `--events` for this project. The other two forward events the webhook
ignores, and `--all-thin` events would not match what the handler expects.

## 3. Add the secret and restart the server

- Put the `whsec_...` value in `STRIPE_WEBHOOK_SECRET=` in `config.env`.
- Restart the server. The env is read at startup, so skipping this keeps the old value.

## 4. Create a checkout session (Postman)

1. Log in as a user with the `user` role and copy the token.
2. Add a product with enough stock to the cart: `POST /api/v1/cart`
3. Call `POST /api/v1/orders/checkout-session` with the Bearer token and this body:

```json
{
  "shippingAddress": {
    "details": "street 1",
    "phone": "01012345678",
    "city": "Cairo"
  }
}
```

4. Copy `session.url` from the response.

## 5. Pay

- Open `session.url` in the browser.
- Test card: `4242 4242 4242 4242`, any future expiry, any CVC, any postal code.
- After paying, the browser redirects to `/api/v1/orders` and shows an auth error
  because the browser has no token. This is expected.

## 6. Check the result

- Listener terminal: `checkout.session.completed` forwarded with `[200]`.
- `GET /api/v1/orders`: a new order with `paymentMethodType: "card"`,
  `isPaid: true` and a `stripeSessionId`.
- `GET /api/v1/cart`: the cart is gone.
- Product: `quantity` is lower and `sold` is higher.

## 7. Test the duplicate protection

In the listener terminal, resend the event you just paid with:

```
stripe events resend <event_id>
```

The event id is shown in the `stripe listen` output. Expected: reply `200`, no
second order, and stock does not change again.

## Troubleshooting

- Listener shows `400`: `STRIPE_WEBHOOK_SECRET` is wrong or the server was not
  restarted after changing it.
- No event reaches the server: check the port in `--forward-to` matches `PORT`.
- Order missing but the listener shows `500`: check the server logs. Stripe
  retries a `500` later.
