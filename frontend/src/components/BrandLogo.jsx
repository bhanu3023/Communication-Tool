import logo from '../assets/cloudfuze-logo.png';

/** CloudFuze logo (transparent indigo). Best on light surfaces; on dark
 *  backgrounds wrap it in a light container. */
export default function BrandLogo({ height = 40, style, alt = 'CloudFuze' }) {
  return <img src={logo} alt={alt} style={{ height, width: 'auto', display: 'block', ...style }} />;
}
