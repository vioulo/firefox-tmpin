
# Tmpin Browser Extension

[中文版本](./README.md)

## Project Introduction
Tmpin is a lightweight extension designed for Firefox browsers, helping users quickly access and manage frequently used web pages. Through a simple and intuitive interface, users can easily pin, group, and manage common links to improve browsing efficiency.

## Core Features

### 🔖 Page Pinning
- One-click pinning of current page to default group
- Support for pinning pages via right-click menu
- Automatic synchronization of page titles and icons

### 📁 Group Management
- Support for creating multiple custom groups
- Drag-and-drop sorting functionality, allowing links to be dragged within and between groups
- Group expand/collapse functionality
- Group renaming and deletion functionality
- Click the "Open all" button in a group to open all links in new tabs

### 🌐 Multi-language Support
- Support for Chinese and English interface switching
- Automatic adaptation based on browser language

### 📱 Data Synchronization
- Use the browser's built-in synchronization feature to achieve cross-device data synchronization
- No additional account required, secure and reliable

### 🎨 Modern Interface
- Clean and beautiful modern design
- Smooth animation effects
- Responsive layout, adapting to different screen sizes

## Screenshots

![Tmpin Extension Screenshot](PixPin_2026-01-30_00-11-10.png)

## Services Used
- **Icon Service**: [Thiings Collection](https://www.thiings.co/things)
- **AI Development Tool**: Trae CN

## Development Notes

### Project Structure
```
tmpin/
├── _locales/            # Multi-language files
│   ├── en/             # English translation
│   └── zh_CN/          # Chinese translation
├── icons/              # Extension icons
├── background.js       # Background script
├── manifest.json       # Extension configuration file
├── popup.html          # Popup window HTML
├── popup.css           # Popup window styles
└── popup.js            # Popup window logic
```

### Technology Stack
- Native JavaScript
- HTML5
- CSS3
- Firefox Extension API