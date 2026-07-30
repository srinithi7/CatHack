# [SYSTEM_NAME] — Smart Rental Tracking System

A dealer/renter/operator equipment rental tracking platform built for the Caterpillar hackathon problem statement "Smart Rental Tracking System". Covers fleet health scoring, predictive maintenance forecasting, anomaly detection, and an AI fleet-intelligence chatbot, driven entirely by a fixed hardcoded dataset (no external API calls).

## Stack

- React 19 + Vite
- Tailwind CSS v4
- Recharts (charts)
- Lucide React (icons)

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Screens

- **Login** — role selection (Dealer / Renter / Operator)
- **Dealer Dashboard** — fleet KPIs, predictive maintenance panel, fleet table, alert center, AI chatbot, charts, revenue loss & site utilization
- **Renter Portal** — renter's own equipment, check-in/check-out with a generated QR code, usage summary
- **Operator View** — mobile-first single-machine view with RFID session timer and safety checklist

## Data & algorithms

All fleet data lives in [src/data/equipment.js](src/data/equipment.js). Health score, predictive maintenance, and anomaly detection logic live in [src/data/algorithms.js](src/data/algorithms.js). The chatbot's rule-based response engine is in [src/data/chatbot.js](src/data/chatbot.js).
