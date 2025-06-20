# Smart Form Filler Demo

An interactive demonstration of the Smart Form Filler browser extension features.

## 🚀 Quick Start

### Method 1: Demo Server (Recommended)
```bash
# From the project root directory
npm run install:demo
npm run demo
```
Then open http://localhost:3002 in your browser.

### Method 2: Direct File Access
```bash
open index.html
```
Or navigate to: `file:///path/to/smart-form-filler/demo/index.html`

**Note:** If using direct file access, you need to enable "Allow access to file URLs" in the extension settings.

## 📋 Demo Features

### 1. Introduction
- Overview of all extension capabilities
- Feature highlights with visual cards
- Getting started guide

### 2. Data Extraction
- Interactive sample profile card
- Step-by-step extraction walkthrough
- Prompt examples for different data types
- Visual feedback during extraction process

### 3. Smart Form Filling
- Functional contact registration form
- Animated form filling demonstration
- Integration with extracted data
- Form validation and submission handling

### 4. AI Chat
- Interactive chat interface with extracted data
- Pre-defined quick questions
- Real-time message simulation
- Conversation history management

## 🎯 Prompt Examples

### Data Extraction Prompts
- `"Extract contact details including name, email, phone, and address"`
- `"Extract product information including name, price, specifications, and availability"`
- `"Extract event details including date, time, location, and description"`

### Form Filling Prompts
- `"Fill this contact form with the extracted profile information"`
- `"Complete this registration using available user data"`
- `"Fill job application form with professional details"`

### Chat Prompts
- `"What is the person's name and job title?"`
- `"What contact information is available?"`
- `"Summarize the key information from this page"`
- `"Tell me about this person's professional background"`

## 🔧 Demo Workflow

1. **Start with Introduction** - Understand the extension capabilities
2. **Try Data Extraction** - Click "Extract Data" to see the process
3. **Test Form Filling** - Use extracted data to automatically fill forms
4. **Explore AI Chat** - Ask questions about the extracted information

## 🎨 Features Demonstrated

- **Visual Feedback**: Loading states, success indicators, and error handling
- **Interactive Elements**: Clickable buttons, form inputs, and chat interface
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Simulation**: Animated typing, progressive form filling
- **User Guidance**: Step-by-step instructions and helpful tips

## 💡 Best Practices Shown

- **Data-driven Form Filling**: Using extracted data for intelligent completion
- **Context-aware AI Chat**: Asking relevant questions about specific data
- **Error Handling**: Graceful degradation when data is not available
- **User Experience**: Clear feedback and intuitive workflows

## 🔗 Integration with Extension

This demo simulates the actual extension behavior. For real usage:

1. Install the browser extension
2. Start the backend server (`npm run dev`)
3. Navigate to any webpage
4. Use the extension popup to extract data and fill forms

The demo helps users understand the extension workflow before using it on live websites.
