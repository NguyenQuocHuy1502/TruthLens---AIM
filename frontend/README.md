# TruthLens - Product Scam Detector

A Chrome extension that helps users identify legitimate products, potential scams, and uncertain listings on major e-commerce websites.

## Features

- 🔍 **Real-time Analysis**: Automatically analyzes products as you browse
- ✅ **Visual Indicators**: 
  - Green tick (✓) for legitimate products
  - Red X (✗) for potential scams
  - Yellow dots (...) for uncertain status
- 📊 **Statistics Tracking**: View your daily analysis stats
- 🛡️ **Multi-site Support**: Works on Amazon, Walmart, eBay, Target, Best Buy, and more
- 🎨 **Beautiful UI**: Modern, responsive popup interface

## Supported Websites

- Amazon (all regions)
- Walmart
- eBay
- Target
- Best Buy
- Newegg
- Alibaba
- AliExpress

## Installation

### Development Installation

1. **Clone or download this repository**
   ```bash
   git clone <your-repo-url>
   cd truthlens
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build:extension
   ```

4. **Load the extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `build` folder from the truthlens directory

### Production Installation

1. Build the extension:
   ```bash
   npm run build:extension
   ```

2. Zip the `build` folder contents
3. Submit to Chrome Web Store (when ready for distribution)

## How It Works

### Analysis Algorithm

The extension uses a scoring system to evaluate products:

**Scam Indicators (increase scam score):**
- Suspicious keywords (scam, fake, replica, counterfeit)
- Suspicious patterns (excessive caps, exclamation marks)
- Unrealistically low prices
- Short or overly long product titles
- Suspicious seller names

**Legitimacy Indicators (increase legit score):**
- Trusted sellers (Amazon, Walmart)
- Reasonable price ranges
- Well-structured product titles
- Established seller profiles

**Final Decision:**
- **Scam** (Red X): Score ≥ 3
- **Uncertain** (Yellow dots): Score ≥ 2 or legit score < 1
- **Legitimate** (Green tick): All other cases

### Technical Implementation

- **Content Script**: Injects indicators into product listings
- **Popup Interface**: React-based UI for statistics and controls
- **Storage**: Tracks daily analysis statistics
- **Communication**: Real-time updates between content script and popup

## Usage

1. **Install the extension** following the installation steps above
2. **Browse supported e-commerce sites** - indicators will appear automatically
3. **Click the extension icon** to view statistics and controls
4. **Toggle analysis** on/off as needed
5. **Check the legend** in the popup to understand the indicators

## Development

### Project Structure

```
truthlens/
├── public/
│   ├── manifest.json          # Extension manifest
│   ├── content.js            # Content script for product analysis
│   ├── content.css           # Styles for indicators
│   └── index.html            # Extension popup HTML
├── src/
│   ├── App.js                # React popup component
│   ├── App.css               # Popup styles
│   └── index.js              # React entry point
└── build/                    # Built extension files
```

### Building

```bash
# Development build
npm run build

# Extension build (includes copying files)
npm run build:extension
```

### Testing

1. Load the extension in Chrome developer mode
2. Visit supported e-commerce sites
3. Verify indicators appear on product listings
4. Test popup functionality and statistics

## Customization

### Adding New Sites

1. Update `manifest.json` host_permissions and content_scripts matches
2. Add site configuration in `content.js` siteConfigs object
3. Define product, title, price, and seller selectors for the new site

### Modifying Analysis Logic

Edit the `analyzeProduct` function in `content.js` to:
- Add new scam indicators
- Modify scoring weights
- Integrate with external APIs
- Add machine learning models

## Future Enhancements

- [ ] Machine learning integration for better accuracy
- [ ] User feedback system to improve detection
- [ ] Integration with review analysis APIs
- [ ] Price history tracking
- [ ] Seller reputation checking
- [ ] Mobile browser support
- [ ] Additional language support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Disclaimer

This extension provides analysis based on heuristics and patterns. It's not a guarantee of product legitimacy. Always use your best judgment when making purchasing decisions and verify products through official channels when in doubt.

## Support

For issues, feature requests, or questions:
- Create an issue on GitHub
- Check the documentation
- Review the code comments for implementation details