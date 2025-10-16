# TruthLens - Product Scam Detector

TruthLens is a browser extension that analyzes products on e-commerce websites to detect potential scams using AI-powered analysis and pattern recognition.

## Features

- 🔍 **Real-time Product Analysis**: Automatically analyzes products as you browse
- 🤖 **AI-Powered Detection**: Uses AI to detect suspicious content and patterns
- 📊 **Comprehensive Analysis**: Analyzes title, price, seller, ratings, and reviews
- 🎯 **Multi-site Support**: Works on Amazon, Walmart, eBay, Target, Best Buy, and more
- 📈 **Statistics Tracking**: Tracks analysis results across your browsing session
- 🔄 **Backend Integration**: Connects to a FastAPI backend for advanced analysis

## Architecture

### Frontend (Browser Extension)
- **React-based popup**: Main extension interface
- **Content Script**: Extracts product data and displays analysis indicators
- **API Service**: Communicates with backend for analysis

### Backend (FastAPI Server)
- **Product Analysis Endpoint**: `/analyze-product` - Analyzes product legitimacy
- **AI Detection**: Integrates with external AI services for content analysis
- **Pattern Recognition**: Custom algorithms for detecting scam indicators

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- Python 3.8 or higher
- Chrome/Chromium browser

### Backend Setup

1. **Install Python dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Start the backend server**:
   ```bash
   # From project root
   python start_backend.py
   
   # Or manually
   cd backend
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

3. **Verify backend is running**:
   - Visit http://localhost:8000/docs for API documentation
   - The server should be accessible at http://localhost:8000

### Frontend Setup

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Build the extension**:
   ```bash
   npm run build:extension
   ```

3. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `frontend/build` directory

## Usage

1. **Enable the extension** on supported e-commerce sites
2. **Toggle the switch** in the popup to activate analysis
3. **Browse products** - TruthLens will automatically analyze visible products
4. **Click indicators** on products to see detailed analysis results
5. **View statistics** in the popup to track analysis across your session

## Supported Websites

- Amazon (all regions)
- Walmart
- eBay
- Target
- Best Buy
- Newegg
- Alibaba
- AliExpress

## API Endpoints

### POST `/analyze-product`
Analyzes a product for legitimacy.

**Request Body**:
```json
{
  "title": "Product Title",
  "description": "Product Description",
  "price": "$99.99",
  "seller": "Seller Name",
  "rating": "4.5",
  "reviews_count": "1,234",
  "url": "https://example.com/product"
}
```

**Response**:
```json
{
  "success": true,
  "analysis": {
    "status": "legit|scam|uncertain",
    "confidence": 0.85,
    "reasons": ["Good rating", "Reputable seller"],
    "indicators": {
      "scam_indicators": 0,
      "legit_indicators": 2
    }
  },
  "product_info": {
    "title": "Product Title",
    "url": "https://example.com/product"
  }
}
```

### POST `/check-text`
Legacy endpoint for AI text detection.

## Analysis Factors

TruthLens analyzes products based on multiple factors:

### Scam Indicators
- Suspicious language in titles ("urgent", "limited time", "act now")
- Unusually low prices
- Suspicious seller names
- Very low ratings (< 2.0)
- Very few reviews (< 5)

### Legitimate Indicators
- Reputable sellers (Amazon, Walmart, Target)
- Reasonable price ranges
- Good ratings (> 4.0)
- Many reviews (> 100)

### AI Analysis
- Detects AI-generated content
- Analyzes text patterns and authenticity
- Cross-references with known scam patterns

## Configuration

### Backend Configuration
- **API Key**: Update `api_private_key` in `backend/main.py`
- **API Endpoint**: Modify `api_link` to use different AI services
- **CORS Settings**: Adjust CORS origins in production

### Frontend Configuration
- **Backend URL**: Update `API_BASE_URL` in `frontend/src/services/apiService.js`
- **Supported Sites**: Modify site configurations in `frontend/public/content.js`

## Development

### Backend Development
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development
```bash
cd frontend
npm start
```

### Extension Development
```bash
cd frontend
npm run build:extension
# Reload extension in Chrome after changes
```

## Troubleshooting

### Backend Issues
- **Port 8000 in use**: Change port in `start_backend.py` or kill existing process
- **CORS errors**: Ensure CORS middleware is properly configured
- **API key errors**: Verify API key is valid and has sufficient credits

### Frontend Issues
- **Extension not loading**: Check Chrome console for errors
- **Analysis not working**: Verify backend is running and accessible
- **Products not detected**: Check if site is supported and selectors are correct

### Common Issues
1. **Backend disconnected**: Start backend server with `python start_backend.py`
2. **No analysis results**: Check browser console for API errors
3. **Products not showing indicators**: Ensure extension is enabled and site is supported

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section
- Review the API documentation at http://localhost:8000/docs
- Open an issue on GitHub

