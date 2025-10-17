import React from 'react';

interface WindyEmbedProps {
  latitude: number;
  longitude: number;
  width?: string;
  height?: string;
}

/**
 * WindyEmbed component
 *
 * Displays Windy forecast widget (meteogram/windgram) for a specific location
 * Uses the free Windy embed widget (no API key required)
 */
export const WindyEmbed: React.FC<WindyEmbedProps> = ({
  latitude,
  longitude,
  width = '100%',
  height = '100%'
}) => {
  // Build Windy embed URL with forecast widget
  const embedUrl = new URL('https://embed.windy.com/embed.html');

  // Configure parameters
  embedUrl.searchParams.set('type', 'forecast');
  embedUrl.searchParams.set('location', 'coordinates');
  embedUrl.searchParams.set('detail', 'true');
  embedUrl.searchParams.set('detailLat', latitude.toString());
  embedUrl.searchParams.set('detailLon', longitude.toString());
  embedUrl.searchParams.set('metricTemp', '°C');
  embedUrl.searchParams.set('metricRain', 'mm');
  embedUrl.searchParams.set('metricWind', 'kt'); // Knots for paragliding

  return (
    <iframe
      src={embedUrl.toString()}
      width={width}
      height={height}
      frameBorder="0"
      title="Windy Forecast"
      style={{
        border: 'none',
        display: 'block',
        minHeight: 0 // Allow iframe to shrink in flex container
      }}
    />
  );
};
