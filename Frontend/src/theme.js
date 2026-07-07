export const colors = {
  green: '#4ead77',
  greenL: '#3ea066',
  greenD: '#1e5538',
  greenXd: '#143b28',
  authGreen: '#3D8C31',
  dashboardAccent: '#bbf8bb',
  authBg: 'rgb(240, 244, 239)',
  authBgLeft: 'rgb(240, 244, 239)',
  authBgRight: 'rgb(240, 244, 239)',
  authBgSignup: 'rgb(240, 244, 239)',
  authIllustrationBg: '#E4EDE1',
  authInputBg: '#E4E4E4',
  cream: '#faf7f2',
  warm: '#f5ede0',
  warmD: '#ecdcca',
  brown: '#7c5c3e',
  brownL: '#a07d5c',
  charcoal: '#1c1c1e',
  muted: '#6b7280',
  border: '#e3d9cc',
  white: '#ffffff',
};

export const fonts = {
  display: '"Playfair Display", Georgia, serif',
  body: '"DM Sans", system-ui, sans-serif',
};

export const shadows = {
  sm: '0 2px 10px rgba(0, 0, 0, 0.07)',
  md: '0 8px 32px rgba(0, 0, 0, 0.1)',
  lg: '0 24px 64px rgba(0, 0, 0, 0.14)',
};

export const sectionTagStyle = {
  fontSize: '0.78rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: colors.green,
  marginBottom: '1rem',
};

export const sectionHeadingStyle = {
  fontFamily: fonts.display,
  fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
  fontWeight: 700,
  lineHeight: 1.15,
  letterSpacing: '-0.025em',
  color: colors.charcoal,
  marginBottom: '1rem',
};

export const sectionSubStyle = {
  fontSize: '1.05rem',
  color: colors.muted,
  maxWidth: '520px',
  fontWeight: 300,
  lineHeight: 1.7,
};

export const btnPrimaryStyle = {
  backgroundColor: colors.green,
  borderColor: colors.green,
  fontFamily: fonts.body,
  fontWeight: 500,
  borderRadius: '8px',
};

export const btnOutlineStyle = {
  borderColor: colors.border,
  color: colors.charcoal,
  fontFamily: fonts.body,
  fontWeight: 500,
  borderRadius: '8px',
  borderWidth: '1.5px',
};
