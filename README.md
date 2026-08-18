# Al-Ahad Attars

Al-Ahad Attars is a premium, full-stack e-commerce platform designed for selling fine fragrances, attars, and bakhoor. It features a modern, responsive customer storefront, a robust checkout system, and a comprehensive admin dashboard for complete store management.

## 🚀 Tech Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** React Context API

### Backend
- **Framework:** Java Spring Boot 3
- **Build Tool:** Maven
- **Security:** Spring Security with JWT Authentication
- **ORM:** Hibernate / JPA

### Infrastructure
- **Database:** Supabase PostgreSQL
- **Object Storage:** Cloudflare R2 (for product and banner images)
- **Payments:** Razorpay Integration
- **Emails:** JavaMailSender (SMTP)

---

## 📦 Features

### Customer Storefront
- Dynamic product browsing with category/subcategory filtering
- Real-time product search
- User authentication and profile management
- Shopping cart and wishlist functionality
- Razorpay payment integration with automated backend reconciliation
- Order tracking and history

### Admin Dashboard
- Complete CMS (Content Management System) for homepage customization
- Product management (CRUD, variants, pricing, bulk image uploads)
- Category and Subcategory management
- Order processing and refund handling
- Promotional banners and offers engine
- Sales analytics and customer management

---

## 🛠️ Local Development Setup

### Prerequisites
- Node.js (v18+)
- Java JDK 21+
- Maven
- Supabase Account (for PostgreSQL database)

### 1. Database Setup
1. Create a new Supabase project.
2. Execute the schema migrations (if available) or let Spring Boot Auto-DDL generate the schema on first boot.

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Copy the example environment file and configure your credentials:
   ```bash
   cp .env.example .env
   ```
3. Update `.env` with your Supabase DB credentials, JWT Secret, and Razorpay API keys.
4. Run the application:
   ```bash
   mvn spring-boot:run
   ```
   *The backend will start on `http://localhost:8080`.*

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
4. Set the API Base URL in `.env`:
   ```env
   VITE_API_URL=http://localhost:8080/api
   VITE_RAZORPAY_KEY_ID=your_razorpay_public_key
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```
   *The frontend will start on `http://localhost:5173`.*

---

## 🌍 Deployment

### Backend (Recommended: Railway or Render)
- Set up the environment variables detailed in `backend/.env`.
- Ensure `PAYMENT_DEV_MODE=false` in production.
- Configure `CORS_ALLOWED_ORIGINS` to point to your deployed frontend domain.

### Frontend (Recommended: Cloudflare Pages or Vercel)
- Set the build command to `npm run build`.
- Set the output directory to `dist`.
- Inject `VITE_API_URL` and `VITE_RAZORPAY_KEY_ID` into the build environment variables.

---

## 🔒 Security
- **Payments:** The final payable amount is strictly verified by the backend to prevent frontend manipulation.
- **Passwords:** Handled via Spring Security BCrypt hashing.
- **Tokens:** JWTs are used for secure stateless authentication.
- **Keys:** Highly privileged keys (like the Razorpay Secret and Supabase Service Role Key) remain securely in the backend environment.
