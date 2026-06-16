# OneAlert - Unified Cyber-Physical Safety Platform for Women

**Problem Statement ID:** KANADSHIELD26_P2_01
**Domain:** Health, Welfare & Human-Centric Monitoring

## Background

With the rapid growth of digital platforms, women face increasing risks not only in physical spaces but also in cyberspace, including cyberstalking, online harassment, deepfake misuse, identity theft, financial fraud, and blackmail. While emergency response systems exist, there is limited integration between cybercrime reporting, digital evidence handling, and real-time police intervention.

The Cyber Crime Branch, Ahmedabad City, requires a unified system that bridges physical safety and cyber safety, enabling rapid reporting, digital evidence capture, and coordinated law enforcement response.

## Overview

OneAlert is a Unified Cyber-Physical Safety Platform for Women that acts as a Single Point of Contact (SPOC) integrating emergency response, cybercrime reporting, and proactive digital safety mechanisms.

The platform allows users to:

- Trigger SOS alerts to police and trusted contacts via a one-touch physical button or voice activation.
- Report cyber incidents (harassment, stalking, blackmail) and securely upload digital evidence (screenshots, chat logs, URLs) directly to the Cyber Crime Branch.
- Access an AI-based Threat Scanner to detect phishing links and fake profiles.

## Features Completed ✅

### 1. Emergency & Cyber Response System

- One-touch SOS alert to police + cyber cell
- Cybercrime reporting (stalking, harassment, fraud)
- Secure evidence upload (screenshots, links, chat logs)
- Silent SOS and panic mode

### 2. Real-Time Tracking & Monitoring

- Live location tracking during emergencies via WebSockets
- Incident tracking for physical + cyber complaints
- Real-time Threat-level monitoring

### 3. Evidence Collection Module

- Secure upload of digital evidence
- Tamper-proof storage with timestamps and SHA-256 Hashing
- Chain-of-custody tracking for legal admissibility

### 4. Cyber Crime Integration

- Integration with Cyber Crime Branch systems (simulated CCB API integration)
- Automated FIR drafting assistance using AI (OpenRouter)
- AI-based phishing and fake profile detection(beta)

### 5. User & Guardian Connectivity

- Native Background SMS alerts to trusted contacts with live tracking URLs
- Privacy-protected, auto-generated PINs to access live SOS incident reports
- Real-time incident status timeline updates

### 6. Preventive Cyber Safety Features

- AI Threat Scanner for suspicious links and messages (beta)
- Real-time Unsafe Zones prediction map

### 7. Dashboard & Analytics (Police Portal)

- Comprehensive cybercrime dashboard for authorities
- Pattern analysis of online crimes
- Repeat offender tracking and velocity-based physical threat analysis

### 8. Data Security & Compliance

- AES Encryption for sensitive media
- Privacy-preserving architecture with secure JWT authentication
- Compliance features for digital evidence handling

## Technology Stack

- **Frontend:** React.js, Vite, TailwindCSS, Capacitor (for Android Native compilation)
- **Backend:** Python (FastAPI), WebSockets
- **Database:** MongoDB (Motor async) / Local JSON fallback
- **Integrations:** Cordova SMS Plugin, OpenRouter AI, Twilio (optional webhook)

## How to Run

### Backend

1. Navigate to `app/backend`
2. Create and activate a virtual environment:
   `python -m venv .venv`
   `source .venv/bin/activate` (or `.venv\Scripts\activate` on Windows)
3. Install dependencies:
   `pip install -r requirements.txt`
4. Run the FastAPI server:
   `python -m uvicorn server:app --host 0.0.0.0 --port 8082 --reload`

### Frontend (Web)

1. Navigate to `app/frontend`
2. Install dependencies:
   `npm install`
3. Start the development server:
   `npm run dev`

### Frontend (Android)

1. Build the web assets:
   `npm run build`
2. Sync with Capacitor:
   `npx cap sync android`
3. Open in Android Studio to build and run the APK on a physical device.

---

Built for the Cyber Crime Branch, Ahmedabad City.
