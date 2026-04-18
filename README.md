# MindScreen — AI-Powered Burnout Detection System

Live Demo: https://mindscreen-one.vercel.app/                 
Report (notion): https://www.notion.so/MindScreen-Hackathon-Report-1-34673cf04d62807b802ed356c073edd8?source=copy_link            
video output: https://drive.google.com/file/d/1y9BdfR65UU9eIAlsatfnGedQej_B5wA9/view             

---

## Team

- Yash Tambade  
- Satvik Poojary  
- Piyush Owalekar  
- Aaryan Keni  

---

## Overview

**MindScreen** is an AI-powered mental health and burnout monitoring dashboard that tracks real-time biometric and behavioral signals to calculate a **Burnout Score (0–100%)** and provide intelligent feedback through an AI assistant called **AXON v3**.

It combines:
- Wearable data (Google Fit)
- Behavioral tracking (typing & mouse activity)
- Facial emotion detection
- AI-based analysis

---

## Problem Statement

Modern students and professionals face increasing stress and burnout. Existing solutions:
- Depend on manual input
- Lack real-time tracking
- Provide generic feedback

MindScreen solves this by providing **continuous, passive, and intelligent mental health monitoring**.

---

## Solution

MindScreen continuously analyzes:
- Physical activity (steps, calories)
- Emotional state (facial expressions)
- Behavioral signals (typing speed, mouse movement)
- Vital stats (heart rate, SpO2)

It generates a real-time **Burnout Score** and AI-driven suggestions.

---

## Features

### Google Fit Integration
- OAuth 2.0 authentication
- Fetches:
  - Steps
  - Calorie
- Works with smartwatches & fitness bands

---

### AXON v3 AI Chatbot
- Powered by Groq (Llama 3.1)
- Context-aware responses
- Commands:
  - BIO_REPORT
  - STRESS_ANALYSIS
  - TACTICAL_ADVICE
  - SYSTEM_SCAN

---

### Facial Mood Detection
- face-api.js integration
- Detects:
  - Happy 😊
  - Sad 😔
  - Angry 😠
  - Neutral 😐
  - Surprised 😲

---

### Real-Time Health Monitoring
- Heart Rate (BPM)
- Oxygen Level (SpO2)
- Animated ECG visualization

---

### Activity Tracking
- Typing Speed (WPM)
- Mouse movement intensity

---

### Burnout Score System
Dynamic scoring system (0–100%)

Status Levels:
- 🔵 Optimal
- 🟡 Warning
- 🔴 Critical

---

### Voice Feedback
- Web Speech API
- AI-generated robotic voice responses

---

### Boost Mode
- Triggered by high-energy emotional spikes
- Visual + system animation effects

---

### UI Design
- Cyberpunk HUD interface
- Neon glow effects (cyan/rose)
- X-ray avatar visualization
- Fully responsive layout

---

## Tech Stack

**Frontend:** React.js, Vite  
**Styling:** CSS (Grid, Flexbox, Neon UI)  
**AI Model:** Groq (Llama 3.1 8B)  
**Face Detection:** face-api.js  
**Wearables API:** Google Fit API  
**Voice:** Web Speech API  
**Deployment:** Vercel  
**Version Control:** Git & GitHub  

---

## Working Flow

1. User connects Google Fit (OAuth 2.0)
2. System fetches:
   - Steps
   - Calories
3. Webcam detects facial emotions
4. Keyboard & mouse activity is tracked
5. System calculates Burnout Score
6. AXON AI provides personalized advice
7. Voice engine reads out results

---

## Google Fit Integration

Uses: fitness/v1/users/me/dataset:aggregate

---

### Data Collected:
- com.google.step_count.delta
- com.google.calories.expended

---

## Target Users

- Students
- Developers
- Working professionals 
- Fitness users
- Smart watch companies 

---

## Impact

MindScreen helps users:
- Detect early burnout signs
- Improve productivity awareness
- Maintain mental well-being

---

## Limitations

- Not a medical tool
- Accuracy depends on webcam & sensors
- Requires Google Fit setup
- Burnout score is an estimation

---

## Future Scope

- Sleep tracking integration  
- Multi-device support (Apple Health, Fitbit, Garmin)  
- Historical analytics dashboard 
- Firebase authentication 
- Mobile app (React Native)  
- Meditation & breathing assistant 

---

##  Run Locally

```bash
# Clone repository
git clone https://github.com/yashtambade56-ux/Mindscreen.git

# Move into project
cd Mindscreen

# Install dependencies
npm install

# Start development server
npm run dev
