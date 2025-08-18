# Maplumi Power BI Visual <img src="assets/icon.png" alt="Maplumi Visual Icon" width="64" height="64" align="right">

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

## Data roles

Assign fields to these roles in the Visualizations pane. You can enable only the layers you need; roles for disabled layers are optional.

- Boundary ID (AdminPCodeNameID)
	- Grouping. Used to join your data to boundary features for choropleth.
	- Must match a property in your GeoJSON/TopoJSON. Configure the property name in Choropleth settings (Boundary ID Field / Custom Boundary ID Field).
	- Max: 1 field.
- Latitude
	- Grouping, numeric/geography latitude. Required for proportional circles.
	- Max: 1 field.
- Longitude
	- Grouping, numeric/geography longitude. Required for proportional circles.
	- Max: 1 field.
- Size
	- Measure. Used to size proportional circles. Supports one or two measures (two series).
	- Max: 2 fields.
- Color
	- Measure. Numeric measure used to classify/paint choropleth colors.
	- Max: 1 field.
- Tooltips
	- Measures to include in the tooltip on hover.

Notes
- Data reduction: up to ~30,000 category rows are sampled (subject to Power BI limits and environment).
- If only choropleth is enabled, Latitude/Longitude/Size are not required. If only circles are enabled, Boundary ID isn’t required.

### Custom TopoJSON with multiple objects

If your TopoJSON file contains multiple named objects (e.g., `ADM1`, `polygons`, `lines`), you can direct the visual to use a specific object:

- Format pane → Choropleth → Boundary → TopoJSON Object Name (optional)
- Enter the exact object name from your TopoJSON `objects` dictionary.
- Leave blank to auto-detect; the visual prefers polygonal objects when choosing automatically.

Tip: Many publishers name polygon layers like `ADM0`, `ADM1`, `boundaries`, or `polygons`.

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
- **[Complete Specifications](spec/main.md)** - Detailed technical documentation
- **[Choropleth Guide](spec/choropleth/choropleth-specification.md)** - Everything about region mapping
- **[Circle Maps Guide](spec/scaled-circles/scaled-circles-specification.md)** - Point data visualization
- **[API Reference](spec/choropleth/api-reference.md)** - For developers and advanced users

### 🐛 Issues & Feature Requests
Found a bug or have an idea? We'd love to hear from you!
- **[Report Issues](https://github.com/maplumi/maplumi-pbi/issues)**
- **[Request Features](https://github.com/maplumi/maplumi-pbi/issues/new)**

### 💬 Community & Discussion
- **[GitHub Discussions](https://github.com/maplumi/maplumi-pbi/discussions)** - Ask questions, share examples
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
git clone https://github.com/maplumi/maplumi-pbi.git

# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test
```

## Developer mode usage

Use Developer Mode in Power BI Desktop for live-reload while building the visual.

Prerequisites
- Power BI Desktop (latest)
- Enable Developer mode: File > Options and settings > Options > Preview features > Developer mode (and allow uncertified visuals if required by your environment)

Run the dev server
```powershell
npm install
npm start
```

In Power BI Desktop
- Open your report.
- In the Visualizations pane, use the Developer/Build visual option to add a local visual.
- When prompted, provide the localhost URL shown in the terminal by the dev server.
- The visual will hot-reload as you edit the code.

Troubleshooting
- Trust the dev SSL certificate when prompted.
- If port 8080 is busy, the dev server will choose another; use the exact URL printed in the terminal.
- Ensure Power BI Desktop can access https://localhost (no proxy/firewall blocking).

### Basemap options & credentials

| Basemap       | Credential needed        | Where to set (Format pane)                  | Notes                                           |
|---------------|--------------------------|---------------------------------------------|-------------------------------------------------|
| OpenStreetMap | None                     | —                                           | Default basemap, no key required                |
| Mapbox        | Mapbox access token      | Basemap → Mapbox Access Token               | Choose a Mapbox Style or provide a custom style URL (mapbox://...) |
| MapTiler      | MapTiler API key         | Basemap → MapTiler API Key                  | Select a MapTiler Style                         |
| None          | None                     | —                                           | Renders layers without a basemap                |

Quick links
- Mapbox access tokens: https://account.mapbox.com/access-tokens/
- Mapbox Studio (styles): https://studio.mapbox.com/
- MapTiler API keys: https://cloud.maptiler.com/account/keys/
- MapTiler Maps (styles): https://cloud.maptiler.com/maps/

Note
- Custom Mapbox style URLs must start with `mapbox://`. Paste the URL in Format pane → Basemap → Mapbox Custom Style URL (and provide your Mapbox Access Token).

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

**Vote on features and track progress in our [GitHub Issues](https://github.com/maplumi/maplumi-pbi/issues)**

## License & privacy

- License: MIT. See [LICENSE](LICENSE).
- Network access: This visual may fetch basemaps/boundaries/styles only from the domains declared in capabilities (WebAccess):
	- https://*.openstreetmap.org, https://*.arcgisonline.com, https://*.arcgis.com, https://*.mapbox.com, https://api.maptiler.com
	- https://*.humdata.org, https://*.itos.uga.edu, https://*.githubusercontent.com, https://*.github.io
	- https://*.googleapis.com, https://*.amazonaws.com, https://*.blob.core.windows.net, https://*.cloudfront.net, https://*.r2.dev, https://*.datauga.com
	Requests occur only when you enable the respective provider or configure a custom GeoJSON/TopoJSON URL.
- Local storage: Uses localStorage (when available in Power BI) to cache non-sensitive settings/resources for performance. No PII is stored by default.
- Data flow: Your dataset stays within Power BI. The visual does not transmit your data to third-party services; it only downloads external map/geometry resources you configure. Avoid embedding sensitive data in external URLs.
- Export: Supports report export (ExportContent). Exported artifacts may include the rendered map and legends.

## About the Project

**Author**: Elvis Ayiemba ([@ayiemba](https://github.com/ayiemba))  
**License**: MIT  
**Version**: 1.0.0.0-beta

Maplumi is an open-source project built with ❤️ for the Power BI community. We believe that powerful geographic visualization should be accessible to everyone, not just GIS experts.

---

**Ready to transform your geographic data?** Download Maplumi from the [Power BI Marketplace](https://appsource.microsoft.com/) or [build from source](https://github.com/maplumi/maplumi-pbi) today!