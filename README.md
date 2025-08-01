# Maplumi Power BI Visual ![Maplumi Visual Icon](assets/icon.png)

**Transform your geographic data into compelling visual stories with Maplumi - the ultimate mapping solution for Power BI.**


*Visualize data across regions with choropleth maps and proportional circles*

## Why Choose Maplumi?

Maplumi makes geographic data analysis accessible to everyone. Whether you're tracking sales performance across regions, analyzing demographic trends, or monitoring humanitarian initiatives, Maplumi turns complex spatial data into clear, actionable insights.

### Perfect For:
- 📊 **Business Intelligence**: Sales territories, market penetration, customer distribution
- 🌍 **Development & Humanitarian Work**: Project coverage, needs assessment, impact tracking
- 🏛️ **Public Sector**: Administrative reporting, resource allocation, policy analysis
- 📈 **Research & Analytics**: Demographic studies, geographic correlations, trend analysis

## Key Features

### 🎯 Two Powerful Visualization Types in One
- **Choropleth Maps**: Color-code regions based on your data values
- **Proportional Circles**: Show data points with circles sized by importance
- **Combined View**: Use both together for rich, multi-dimensional analysis

![Feature Overview](screenshots/features-overview.png)
*Use choropleth and circles together or separately*

### 🗺️ Professional Base Maps
Choose from multiple map providers and styles to match your brand and context:
- Mapbox integration
- MapTiler support  
- OpenStreetMap options

![Base Map Options](screenshots/base-maps.png)
*Select the perfect base map style for your analysis*

### 🎨 Smart Styling & Customization
- Intuitive color schemes that work out of the box
- Flexible legend positioning and styling
- Adjustable circle sizes and opacity
- Professional color ramps for data classification

![Styling Options](screenshots/styling-panel.png)
*Customize colors, sizes, and styling with easy-to-use controls*

### 💡 Interactive & Engaging
- Rich tooltips with detailed information
- Click-to-filter integration with other Power BI visuals
- Smooth zoom and pan controls
- Automatic map fitting to your data

![Interactive Features](screenshots/interactive-demo.gif)
*Engage with your data through tooltips and cross-filtering*

## Quick Start Guide

### 1. Import Your Data
Add Maplumi to your Power BI report and connect your geographic data:
- **For Regions**: Use country codes, state names, or administrative IDs
- **For Points**: Use latitude/longitude coordinates or place names

![Data Setup](screenshots/data-setup.png)
*Connect your geographic data in just a few clicks*

### 2. Configure Your Visual
- Drag fields to the appropriate data roles
- Choose your visualization type (choropleth, circles, or both)
- Select your base map style

![Visual Configuration](screenshots/visual-config.png)
*Simple drag-and-drop configuration*

### 3. Customize & Style
Use the formatting panel to:
- Choose colors that match your brand
- Position legends where they work best
- Adjust circle sizes for optimal readability
- Fine-tune tooltips and labels

![Formatting Panel](screenshots/formatting-panel.png)
*Professional styling options at your fingertips*

### 4. Interact & Analyze
Your map is now ready! Use it to:
- Hover for detailed information
- Click regions to filter other visuals
- Zoom to focus on specific areas
- Export or share your insights

## Real-World Examples

### Business Dashboard
![Business Dashboard](screenshots/business-example.png)
*Track sales performance across territories with combined choropleth and circle visualization*

### Humanitarian Operations
![Humanitarian Dashboard](screenshots/humanitarian-example.png)
*Monitor project coverage and needs assessment across operational areas*

### Public Sector Analytics
![Public Sector Dashboard](screenshots/public-sector-example.png)
*Analyze demographic trends and resource allocation at administrative levels*

## Getting Help & Support

### 📚 Documentation
- **[Complete Specifications](specs/main.md)** - Detailed technical documentation
- **[Choropleth Guide](specs/choropleth/choropleth-specification.md)** - Everything about region mapping
- **[Circle Maps Guide](specs/scaled-circles/scaled-circles-specification.md)** - Point data visualization
- **[API Reference](specs/choropleth/api-reference.md)** - For developers and advanced users

### 🐛 Issues & Feature Requests
Found a bug or have an idea? We'd love to hear from you!
- **[Report Issues](https://github.com/ayiemba/maplumi-pbi/issues)**
- **[Request Features](https://github.com/ayiemba/maplumi-pbi/issues/new?template=feature_request.md)**

### 💬 Community & Discussion
- **[GitHub Discussions](https://github.com/ayiemba/maplumi-pbi/discussions)** - Ask questions, share examples
- **[Power BI Community](https://community.powerbi.com/)** - Connect with other Power BI users

## Contributing to Maplumi

We welcome contributions from the community! Here's how you can help make Maplumi even better:

### 🎯 For Users
- **Share Examples**: Show us how you're using Maplumi in your reports
- **Report Issues**: Help us identify and fix problems
- **Suggest Features**: Tell us what would make your analysis easier
- **Spread the Word**: Share Maplumi with colleagues who could benefit

### 👩‍💻 For Developers
- **Code Contributions**: Submit pull requests for bug fixes or new features
- **Documentation**: Help improve our guides and examples
- **Testing**: Help us test new features and edge cases
- **Translations**: Assist with internationalization efforts

#### Development Setup
```bash
# Clone the repository
git clone https://github.com/ayiemba/maplumi-pbi.git

# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test
```

See our **[Contributing Guidelines](CONTRIBUTING.md)** for detailed information about our development process.

### 🌟 Recognition
All contributors are recognized in our changelog and contributor list. Whether you're fixing a typo or adding a major feature, your help makes Maplumi better for everyone!

## Roadmap & Future Plans

We're constantly working to improve Maplumi based on your feedback. Here's what's coming:

### 🚀 Short Term (Next 3 months)
- Enhanced mobile responsiveness
- Additional base map providers
- Improved performance for large datasets
- Better accessibility features

### 🎯 Medium Term (3-6 months)
- Point clustering for dense data
- Custom tooltip templates
- Enhanced cross-filtering capabilities
- Multiple small multiples support

### 🌟 Long Term (6+ months)
- Advanced geocoding features
- Real-time data streaming
- Machine learning insights integration
- Extended customization options

**Vote on features and track progress in our [GitHub Issues](https://github.com/ayiemba/maplumi-pbi/issues)**

## About the Project

**Author**: Elvis Ayiemba ([@ayiemba](https://github.com/ayiemba))  
**License**: MIT  
**Version**: 1.0.0

Maplumi is an open-source project built with ❤️ for the Power BI community. We believe that powerful geographic visualization should be accessible to everyone, not just GIS experts.

---

**Ready to transform your geographic data?** Download Maplumi from the [Power BI Marketplace](https://appsource.microsoft.com/) or [build from source](https://github.com/ayiemba/maplumi-pbi) today!