# HireReady AI 🎯

**AI-powered interview preparation tailored to your resume and target job.**

HireReady AI is a web application that helps job seekers prepare for interviews using artificial intelligence. Users provide a job description, upload their resume, and optionally describe their experience and skills. The application uses Google GenAI to generate a personalized interview preparation report with a candidate–job match score, technical and behavioral interview questions, suggested answers, identified skill gaps, and a preparation plan.

Users can revisit saved interview reports and generate a tailored resume PDF based on a report.

## ✨ Features

- **User Authentication** — Register, log in, and access protected application pages.
- **AI-Powered Interview Preparation** — Generate interview preparation reports tailored to a job description and candidate profile.
- **Job Match Score** — Get an AI-generated assessment of how well your profile aligns with the target role.
- **Technical Interview Questions** — Practice role-relevant technical questions with suggested answers.
- **Behavioral Interview Questions** — Prepare for behavioral interviews with suggested responses.
- **Skill Gap Analysis** — Identify skills and qualifications that may need improvement.
- **Personalized Preparation Plan** — Follow a day-by-day plan to prepare for the target interview.
- **Saved Reports** — View your previous interview reports and retrieve individual reports.
- **Resume PDF Generation** — Generate and download a tailored resume PDF associated with an interview report.

## 🛠️ Technology Stack

| Component         | Technologies                                   |
| ----------------- | ---------------------------------------------- |
| Frontend          | React, Vite, React Router, Axios, Sass         |
| Backend           | Node.js, Express.js                            |
| Database          | MongoDB, Mongoose                              |
| Authentication    | JSON Web Tokens (JWT), bcryptjs, cookie-parser |
| AI Integration    | Google GenAI SDK                               |
| Resume Processing | pdf-parse                                      |
| PDF Generation    | Puppeteer                                      |
| Development Tools | npm, Vite, Nodemon                             |

## 📁 Project Structure

```text
HireReady-AI/
├── Backend/
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js
│   └── src/
│       ├── config/         # Database connection
│       ├── controllers/    # Authentication and interview logic
│       ├── middlewares/    # Authentication and file uploads
│       ├── models/         # User, report, and token blacklist models
│       ├── routes/         # API route definitions
│       └── services/       # Google GenAI and PDF generation
│
├── Frontend/
│   ├── package.json
│   ├── package-lock.json
│   └── src/
│       └── features/
│           ├── auth/       # Registration, login, and auth state
│           └── interview/  # Interview reports and API clients
│
└── README.md
```

The frontend and backend are separate Node.js projects. Install dependencies and run commands from the appropriate directory.

## 📋 Prerequisites

Before running the application, make sure you have:

- [Node.js](https://nodejs.org/) and npm installed.
- A running [MongoDB](https://www.mongodb.com/) instance or MongoDB Atlas database.
- A [Google GenAI API key](https://ai.google.dev/).
- Git, if you want to clone the repository.

The project has been run with Node.js `v22.17.0` and npm `10.9.2`. Other versions may work, but compatibility has not been established for every version.

## 🚀 Getting Started

### 1. Clone the repository

If the project is hosted on GitHub, clone it using your repository URL:

```bash
git clone <your-repository-url>
cd <your-repository-folder>
```

Replace the placeholders with your actual repository details.

### 2. Install backend dependencies

Open a terminal in the project root and run:

```bash
cd Backend
npm install
```

### 3. Configure backend environment variables

Create a local environment file from the example.

**PowerShell:**

```powershell
Copy-Item .env.example .env
```

Open `Backend/.env` and configure the required values:

```dotenv
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
GOOGLE_GENAI_API_KEY=your_google_genai_api_key
```

Replace each placeholder with your actual configuration. Do not commit the `.env` file or expose your secrets in source code.

### 4. Install frontend dependencies

Open a second terminal and run:

```bash
cd Frontend
npm install
```

### 5. Start MongoDB

Ensure your MongoDB instance is running and accessible through the connection string configured in `Backend/.env`.

The backend uses Mongoose to connect to MongoDB and persist user accounts, interview reports, and blacklisted authentication tokens.

## ▶️ Running the Application

You need two terminal sessions: one for the backend and another for the frontend.

### Start the backend

From the `Backend` directory:

```bash
npm run dev
```

The development script uses Nodemon to run `server.js`.

Alternatively, start the backend without Nodemon:

```bash
npm start
```

The backend is configured to use:

```text
http://localhost:3000
```

### Start the frontend

From the `Frontend` directory:

```bash
npm run dev
```

Vite prints the local development URL. With the default configuration, open:

**http://localhost:5173/**

Both the frontend and backend must be running for the complete application to work. MongoDB must also be reachable, and the Google GenAI API key must be configured for AI-powered features.

## ⚙️ Configuration

The backend loads environment variables from `Backend/.env` using `dotenv`.

| Variable               | Required        | Description                         |
| ---------------------- | --------------- | ----------------------------------- |
| `MONGO_URI`            | Yes             | MongoDB connection string           |
| `JWT_SECRET`           | Yes             | Secret used to sign and verify JWTs |
| `GOOGLE_GENAI_API_KEY` | For AI features | API key for Google GenAI            |

The following settings are currently hard-coded in the application:

| Setting                 | Default                 |
| ----------------------- | ----------------------- |
| Backend API URL         | `http://localhost:3000` |
| Backend port            | `3000`                  |
| Allowed frontend origin | `http://localhost:5173` |

If you change these ports or deploy the application to different origins, update the corresponding frontend and backend configuration.

## 🔌 API Reference

The backend exposes its REST API at `http://localhost:3000`.

Authentication uses a cookie named `token`. Protected endpoints require valid authentication, and the frontend Axios clients are configured to send credentials.

### Authentication

| Method | Endpoint             | Access        | Description                                                                  |
| ------ | -------------------- | ------------- | ---------------------------------------------------------------------------- |
| `POST` | `/api/auth/register` | Public        | Register a new account                                                       |
| `POST` | `/api/auth/login`    | Public        | Authenticate an existing user                                                |
| `GET`  | `/api/auth/logout`   | Public        | Clear the authentication cookie and blacklist the current token when present |
| `GET`  | `/api/auth/get-me`   | Authenticated | Retrieve the current user's account details                                  |

### Interview Reports and Resume Generation

| Method | Endpoint                                       | Access        | Description                                                 |
| ------ | ---------------------------------------------- | ------------- | ----------------------------------------------------------- |
| `POST` | `/api/interview/`                              | Authenticated | Generate and save an interview report                       |
| `GET`  | `/api/interview/`                              | Authenticated | List the current user's saved reports                       |
| `GET`  | `/api/interview/report/:interviewId`           | Authenticated | Retrieve an individual report belonging to the current user |
| `POST` | `/api/interview/resume/pdf/:interviewReportId` | Authenticated | Generate a resume PDF for a report                          |

### Example API Requests

The following examples use `curl` and assume the backend is running locally.

#### Register a user

```bash
curl -i http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"example-user","email":"user@example.com","password":"use-a-local-password"}'
```

#### Log in

Save the authentication cookie for subsequent requests:

```bash
curl -i -c cookies.txt \
  http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"use-a-local-password"}'
```

#### Generate an interview report

The endpoint accepts multipart form data. The resume is required by the current backend implementation.

```bash
curl -i -b cookies.txt -c cookies.txt \
  http://localhost:3000/api/interview/ \
  -F "jobDescription=Paste the target job description here" \
  -F "selfDescription=Describe your experience and skills" \
  -F "resume=@./resume.pdf"
```

Replace `./resume.pdf` with the path to a valid PDF resume.

The `selfDescription` field is optional in the UI. The request example includes it to demonstrate how candidate details can be submitted.

## 🧪 Build and Quality Checks

### Build the frontend

From the `Frontend` directory:

```bash
npm run build
```

This generates the frontend production assets using Vite.

### Run the frontend linter

```bash
npm run lint
```

### Check backend dependency vulnerabilities

From the `Backend` directory:

```bash
npm audit
```

The backend dependency audit reported zero known vulnerabilities after upgrading Puppeteer to `25.14.0`. Re-run the audit periodically as dependencies and security advisories change.

**Note:** The backend currently has no configured automated test suite. Its `npm test` script is a placeholder rather than a functional test runner.

## 🔒 Security and Data Handling

- **Environment secrets:** Keep `Backend/.env` private. Never commit API keys, database credentials, or JWT signing secrets.
- **Password storage:** User passwords are hashed using bcryptjs before being stored.
- **Authentication:** JWTs have a one-day lifetime. The application also maintains a token blacklist for invalidated tokens.
- **User data:** Interview reports and candidate information are stored in MongoDB.
- **AI processing:** Resume text, job descriptions, and candidate-provided information are sent to the configured Google GenAI service to generate tailored content. Only submit information you are authorized to share.
- **File uploads:** The backend currently enforces a 3 MB upload limit. Use the supported PDF format.
- **Deployment security:** The default local setup uses HTTP and localhost URLs. Before public deployment, configure HTTPS, secure cookie settings, appropriate CORS origins, and production secrets.

## ⚠️ Known Limitations

- **PDF resume support:** The current backend processes uploaded resume bytes with `pdf-parse`. Although the frontend file picker allows PDF and DOCX selections, DOCX processing has not been established as supported.
- **Resume requirement:** The frontend presents self-description as an alternative to uploading a resume, but the backend currently requires a resume file for report generation.
- **Upload size mismatch:** The frontend advertises a maximum upload size of 5 MB, while the backend enforces a 3 MB limit.
- **Hard-coded URLs and ports:** The frontend API URL, backend port, and CORS origin are fixed in source code.
- **Automated tests:** No functional automated test suite is currently configured for the backend.
- **Deployment configuration:** Production deployment instructions and configuration are not currently included.

These limitations should be addressed as the project evolves.

## 🗺️ Future Improvements

Potential enhancements for future versions include:

- Add complete DOCX resume parsing support.
- Support interview report generation without a resume upload.
- Centralize API URLs, ports, and CORS settings in environment variables.
- Align frontend and backend file-size validation.
- Add automated unit and integration tests.
- Add interview practice sessions with feedback on user answers.
- Improve report export and sharing options.
- Add production deployment documentation and CI/CD workflows.

## 📄 License

The backend package metadata declares the **ISC License**. A repository-level `LICENSE` file has not been identified. Add the appropriate license file to the repository before distributing the project under a declared license.

## 👨‍💻 Author

**Md Tufail**

B.Tech Computer Science student passionate about software development and building interactive web applications.

- **LinkedIn:** [linkedin.com/in/tufailmd](https://linkedin.com/in/tufailmd)
- **GitHub:** [github.com/TufailMd](https://github.com/TufailMd)
- **Email:** [jrtufailmd@gmail.com](mailto:jrtufailmd@gmail.com)

---

_HireReady AI — Prepare smarter. Practice confidently. Get interview-ready._
