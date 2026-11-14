# Lightning Vend

Kiosk UI that lets a vending machine accept Bitcoin Lightning payments.
Tablet shows a QR invoice (OpenNode API) -> customer pays -> server notifies the CryptoVend -> customer picks a product on the machine.

## Quick start (demo, no real money)
```bash
npm install
cp .env.example .env     # leave OPENNODE_API_KEY empty = mock mode
npm start                # open http://localhost:3000
```
Mock mode creates a fake invoice and marks it paid after 10 seconds so you can see the whole flow.

## Real payments
1. Create an OpenNode account and an API key (use the dev/testnet key first: https://dev.opennode.com).
2. In `.env` set `OPENNODE_API_KEY`, `OPENNODE_ENV=dev` (or `live`), `PAYMENT_AMOUNT`, `PAYMENT_CURRENCY`.
3. Keep the key on the server only. Never put it in `public/`.
4. Optional faster confirmation: set `PUBLIC_URL` to a public https address of this server so OpenNode can call `/api/webhook`. Without it the UI polls every 2 s, which works fine behind a tablet's WiFi.

## Hardware (CryptoVend)
Install the iozeta CryptoVend in an MDB-capable machine and see https://github.com/iozeta/cryptovend-tablet-ui for how the device receives credit.
`creditMachine()` in `server.js` sends `POST CRYPTOVEND_URL` with `{event, orderId, amount, currency}` once per paid order.
**Adjust that function to match the CryptoVend's real API**; the payload here is a placeholder and was not tested against the device.

## Kiosk setup
Run `npm start` on a small computer on the same network, open the page in Chrome on the tablet in fullscreen/kiosk mode.

## Files
- `server.js`: invoice creation, status polling, webhook, machine credit
- `public/index.html`: Vue 3 kiosk UI (idle, invoice, paid, expired)
