<<<<<<< HEAD
# Here are your Instructions
=======
# NIDHII – Community Accountability & Civic Reporting Platform

NIDHII is a full-stack civic engagement platform designed to empower citizens to report local issues, track resolution progress, and collaborate with communities and authorities. It combines web technologies, multilingual accessibility, AI assistance, and voice-based reporting to make civic participation more inclusive and effective.

## 🌟 Key Features

* **Citizen Issue Reporting** – Submit complaints related to civic issues such as sanitation, road damage, water supply, street lighting, and more.
* **Voice-Based IVR Reporting** – File complaints through an interactive voice response system, making the platform accessible to non-technical users.
* **Multilingual Support** – Access the platform in multiple languages for broader inclusivity.
* **AI-Powered Assistance** – Smart chatbot support for guidance, issue categorization, and user assistance.
* **Real-Time Tracking** – Monitor complaint status from submission to resolution.
* **Role-Based Access Control** – Separate dashboards for citizens, administrators, and supervisors.
* **Leaderboard & Rewards** – Gamified engagement to encourage active community participation.
* **Admin Analytics Dashboard** – Gain insights into issue trends, response rates, and platform usage.
* **Google Sheets Integration** – Export and manage complaint data efficiently.

---

## 🏗️ System Architecture

```text
Frontend (React + Tailwind CSS)
        ↓
Backend API (FastAPI)
        ↓
MongoDB Database
        ↓
External Services
   ├── Twilio IVR
   ├── Google Sheets API
   └── AI/LLM Services
```

---

## 🛠️ Tech Stack

### Frontend

* React.js
* React Router
* Tailwind CSS
* shadcn/ui Components
* Sonner (toast notifications)

### Backend

* FastAPI
* Python
* JWT Authentication
* Bcrypt Password Hashing

### Database

* MongoDB (Motor Async Driver)

### Integrations

* Twilio Voice API (IVR)
* Google Sheets API
* AI/LLM Integration

---

## 📁 Project Structure

```text
NIDHII/
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── lib/            # Utilities, authentication, i18n
│   │   └── App.js          # Main application routes
│   └── package.json
│
├── backend/                # FastAPI backend
│   ├── services/
│   │   ├── sheets.py       # Google Sheets integration
│   │   └── twilio_ivr.py   # Twilio IVR services
│   ├── tests/              # Backend test cases
│   ├── server.py           # Main API server
│   └── requirements.txt
│
└── README.md
```

---

## 🚀 Core Modules

### User Management

* Secure registration and login
* JWT-based authentication
* Role-based authorization

### Complaint Management

* Create, view, and track complaints
* Upload supporting evidence
* Categorize issues automatically

### IVR Module

* Voice-based complaint registration
* Accessible for users without internet literacy
* Twilio-powered call workflows

### AI Chat Assistant

* User guidance and FAQs
* Complaint assistance
* Smart recommendations

### Gamification

* Community leaderboard
* Reward points for active participation
* Citizen engagement incentives

---

## 🔐 User Roles

| Role       | Permissions                                            |
| ---------- | ------------------------------------------------------ |
| Citizen    | Submit and track complaints, use chatbot, earn rewards |
| Supervisor | Monitor reports, manage workflows                      |
| Admin      | Full platform access, analytics, and system management |

---

## ⚙️ Installation & Setup

### Prerequisites

* Node.js (v18 or later)
* Python (v3.10 or later)
* MongoDB
* Twilio Account
* Google Cloud Service Account

### Clone the Repository

```bash
git clone https://github.com/your-username/NIDHII.git
cd NIDHII
```

---

## 🖥️ Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs at: `http://localhost:3000`

---

## 🔧 Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload
```

Backend runs at: `http://localhost:8000`

---

## 🔑 Environment Variables

Create a `.env` file in the `backend` directory:

```env
MONGO_URL=your_mongodb_connection_string
DB_NAME=nidhii
JWT_SECRET=your_jwt_secret
EMERGENT_LLM_KEY=your_llm_api_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
GOOGLE_SERVICE_ACCOUNT_JSON=path_to_credentials.json
```

For the frontend, create a `.env` file:

```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

---

## 📱 Application Pages

* Landing Page
* User Login / Signup
* Dashboard
* New Report Submission
* IVR Reporting Interface
* Reports History
* Leaderboard
* Rewards Center
* AI Chat Assistant
* Admin Dashboard

---

## 🧪 Testing

Run backend tests using:

```bash
cd backend
pytest
```

---

## 📈 Future Enhancements

* Mobile application support
* GIS-based issue mapping
* Predictive civic issue analytics
* Automated escalation workflows
* Integration with government grievance portals
* Advanced sentiment and trend analysis

---

## 🤝 Contribution Guidelines

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to your branch
5. Open a Pull Request

```bash
git checkout -b feature/your-feature-name
git commit -m "Add your feature"
git push origin feature/your-feature-name
```

---

## 📄 License

This project is licensed under the MIT License.

---

## 👩‍💻 Authors

Developed as an innovative civic-tech solution to bridge the gap between citizens and local governance.

---

## 🌍 Vision

To create a transparent, accessible, and citizen-driven ecosystem where every voice is heard and every civic issue is addressed efficiently.

> *"Empowering citizens, one report at a time."*

>>>>>>> fb4668c3b02b3e1a154e8868610500acfef1efd6
