exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { imageUrl, text, fontSize = 72 } = JSON.parse(event.body);

    // Just return a simple SVG with the text overlaid
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
        <image href="${imageUrl}" width="1080" height="1920"/>
        <rect x="40" y="860" width="1000" height="${fontSize + 40}" fill="rgba(0,0,0,0.8)" rx="10"/>
        <text x="540" y="${920 + fontSize/2}" fill="white" font-size="${fontSize}" font-weight="bold" text-anchor="middle" font-family="Arial">${text}</text>
      </svg>
    `;

    // Convert SVG to data URL
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ dataUrl })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};