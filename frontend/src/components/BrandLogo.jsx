import logo from '../assets/cloudfuze-logo.png';

// The PNG's own pixel dimensions. Passed as width/height ATTRIBUTES (not CSS) purely so the
// browser knows the aspect ratio before the image has downloaded and can reserve the right box
// for it; the inline style below still decides the rendered size, exactly as before. Without
// them the sign-in card reflowed the moment the logo decoded.
const NATURAL_WIDTH = 165;
const NATURAL_HEIGHT = 94;

/** CloudFuze logo (transparent indigo). Best on light surfaces; on dark
 *  backgrounds wrap it in a light container. */
export default function BrandLogo({ height = 40, style, alt = 'CloudFuze' }) {
  return (
    <img
      src={logo}
      alt={alt}
      width={NATURAL_WIDTH}
      height={NATURAL_HEIGHT}
      style={{ height, width: 'auto', display: 'block', ...style }}
    />
  );
}
