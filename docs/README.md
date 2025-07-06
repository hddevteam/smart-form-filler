# GitHub Pages Documentation

This directory contains the GitHub Pages site for Smart Form Filler, providing multilingual documentation and demos.

## 📁 Structure

```
docs/
├── index.html              # English homepage (with auto-redirect)
├── index-zh.html           # Chinese homepage
├── lang-redirect.js        # Language detection script
├── screenshots/            # Product screenshots
│   └── screenshot_formfiller.png
├── employee-form.html      # Restaurant feedback demo
├── data-source.html        # Data extraction demo
└── modules/               # Demo JavaScript modules
```

## 🌐 Live Sites

- **English**: [https://hddevteam.github.io/smart-form-filler/](https://hddevteam.github.io/smart-form-filler/)
- **中文**: [https://hddevteam.github.io/smart-form-filler/index-zh.html](https://hddevteam.github.io/smart-form-filler/index-zh.html)

## 🎯 Features

### Multilingual Support
- **Auto Language Detection**: Automatically redirects Chinese users to Chinese version
- **Manual Language Switch**: Users can manually switch between English and Chinese
- **Localized Content**: Fully translated content including features, installation guides, and demos

### Media Showcase
- **Interactive Screenshots**: High-quality product screenshots with hover effects
- **Embedded Video**: Direct playback of demo video from Azure Blob Storage
- **Video Fallback**: Direct link for browsers that don't support video playback

### Interactive Demos
- **Restaurant Feedback Form**: Complete form filling demonstration
- **Data Extraction**: Live data extraction from web pages
- **Real-world Scenarios**: Multiple prompt examples for different use cases

## 🛠️ Development

### Adding New Languages
1. Create a new `index-{lang}.html` file
2. Update `lang-redirect.js` to include the new language
3. Add language switcher links in navigation
4. Update canonical URLs and Open Graph tags

### Adding New Media
1. Place images in `screenshots/` directory
2. Use relative paths for GitHub Pages compatibility
3. Include proper alt text for accessibility
4. Optimize images for web performance

### Video Integration
Current video URL: `https://demoforgithub.blob.core.windows.net/videos/smart-form-filler-demo.mp4`

Features:
- HTML5 video player with controls
- Poster image from screenshots
- Fallback link for unsupported browsers
- Mobile-responsive design

## 📱 Responsive Design

The site is fully responsive with:
- Mobile-first CSS approach
- Flexible grid layouts
- Scalable typography
- Touch-friendly navigation
- Optimized media queries

## 🔧 Configuration

### Language Detection
The `lang-redirect.js` script:
- Detects browser language preferences
- Redirects Chinese users to Chinese version
- Respects manual language selection
- Only runs on homepage to avoid redirect loops

### SEO Optimization
- Proper meta tags for each language
- Canonical URLs to prevent duplicate content
- Open Graph tags for social sharing
- Structured data for search engines

## 🚀 Deployment

The site is automatically deployed via GitHub Pages when changes are pushed to the `main` branch. The `docs/` folder serves as the publishing source.

### Build Process
No build process required - static HTML/CSS/JS files are served directly.

### Domain Configuration
Currently served from: `hddevteam.github.io/smart-form-filler/`

## 📊 Analytics & Performance

### Loading Performance
- Optimized CSS (no external dependencies)
- Compressed images
- Minimal JavaScript
- Efficient font loading

### Accessibility
- Semantic HTML structure
- Proper heading hierarchy
- Alt text for images
- Keyboard navigation support
- Screen reader compatibility

## 🔄 Updates

When updating content:
1. Update both language versions
2. Maintain consistent feature parity
3. Test video playback across browsers
4. Verify mobile responsiveness
5. Check language switching functionality

## 📝 Content Guidelines

### Writing Style
- Clear and concise descriptions
- Action-oriented language
- Technical accuracy
- User-focused benefits

### Image Guidelines
- Consistent visual style
- High resolution (2x for retina)
- Appropriate file formats (PNG for screenshots)
- Descriptive filenames

### Video Guidelines
- Professional quality recordings
- Clear audio narration
- Demonstration of key features
- Reasonable file size for web delivery
