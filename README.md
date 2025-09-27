# Daamitha - Gallery Management System

A dynamic artist portfolio and gallery management system for contemporary oil paintings. This platform showcases the artwork of Daamitha, a medical student and traditional singer from India currently based in London, with a complete admin dashboard for content management.

## 🚀 MVP Features

### 🔐 **Admin Dashboard**
- Secure login system with JWT authentication
- Full CRUD operations for artwork management
- Dynamic content editing for all site sections
- Image upload with automatic optimization
- Private price list management

### 🎨 **Dynamic Gallery**
- Artworks loaded dynamically from database
- Real-time updates without code changes
- Responsive gallery grid with animations
- Public view (no prices) and admin view (with prices)

### 🎵 **Cultural Heritage**
- Integration of South Indian musical traditions
- Story of multicultural artistic journey
- Traditional songs and modern expression blend

### 📱 **Modern Web Experience**
- Fully responsive design for all devices
- Smooth scrolling navigation
- Interactive hover effects and animations
- Progressive loading with fade-in animations
- Parallax scrolling effects

### 💬 **Flowise Chatbot**
- AI-powered gallery assistant
- Answers questions about artworks and techniques
- Helps with commission inquiries
- Custom-trained on artist's background and portfolio

### 📊 **Price List Page**
- Secure authentication-protected pricing
- Professional tabular layout
- Export functionality for collectors
- Real-time availability status

## 🛠️ Technology Stack

- **Backend**: Node.js + Express.js
- **Database**: SQLite (easily upgradeable to PostgreSQL)
- **Authentication**: JWT with bcrypt
- **Frontend**: Vanilla JavaScript with dynamic content loading
- **File Storage**: Local filesystem (upgradeable to AWS S3)
- **Chatbot**: Flowise AI integration

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dm
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
# Copy the example file
cp .env.example .env

# Edit .env file with your settings
ADMIN_EMAIL=admin@daamitha.art
ADMIN_PASSWORD=Admin@123
JWT_SECRET=your_secret_key_here
```

4. Start the development server:
```bash
npm run dev
```

5. Access the application:
- Gallery: http://localhost:3000
- Admin Dashboard: http://localhost:3000/admin/login.html

## 🚀 Deployment on Railway

1. Create a new project on Railway.app
2. Connect your GitHub repository
3. Add the following environment variables in Railway dashboard:
   - `JWT_SECRET` - A long random string
   - `ADMIN_EMAIL` - Your admin email
   - `ADMIN_PASSWORD` - Your admin password
   - `NODE_ENV` - Set to "production"
4. Deploy! Railway will automatically build and run your app

## 🔑 Default Credentials

- **Email**: admin@daamitha.art
- **Password**: Admin@123

⚠️ **Important**: Change these credentials in production!

## 📁 Project Structure

```
/daamitha-gallery
  /server            # Backend API
    /routes          # API endpoints
    /middleware      # Auth middleware
    /models          # Database models
    app.js           # Express server
  /public            # Frontend files
    /css             # Stylesheets
    /js              # Client-side JavaScript
    index.html       # Main gallery page
    pricelist.html   # Protected price list
  /admin             # Admin dashboard
    login.html       # Admin login
    dashboard.html   # Admin panel
  /uploads           # Uploaded artwork images
  package.json       # Dependencies
  .env               # Environment variables
```

## 🚀 Usage Guide

### For Gallery Visitors
1. Browse the gallery at the homepage
2. Click the chatbot icon to ask questions
3. Request price list access through contact form

### For Admin
1. Log in at `/admin/login.html`
2. Manage artworks from the dashboard
3. Edit site content dynamically
4. View and export price lists
5. Monitor gallery statistics

## 🤖 Flowise Chatbot Setup

To activate the chatbot:

1. Install and run Flowise locally or use cloud instance
2. Create a new chatflow with the provided system prompt
3. Update the chatflow ID in `/public/index.html`:
```javascript
chatflowid: 'your-chatflow-id-here',
apiHost: 'your-flowise-host'
```

### System Prompt for Chatbot
The chatbot is configured to act as Daamitha's gallery assistant, knowledgeable about:
- Artist's background and journey
- Oil painting techniques
- Available artworks
- Commission process
- Cultural heritage

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token authentication
- Rate limiting on API endpoints
- Input validation and sanitization
- SQL injection prevention
- Secure file upload validation

## 📈 Future Enhancements

- [ ] Customer accounts and wishlists
- [ ] Exhibition management
- [ ] Email notifications
- [ ] Analytics dashboard
- [ ] Multi-language support
- [ ] Payment integration
- [ ] AWS S3 for image storage
- [ ] PostgreSQL for production
