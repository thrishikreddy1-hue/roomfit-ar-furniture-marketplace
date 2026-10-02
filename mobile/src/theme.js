export const colors = {
  bg: '#F5F1EA',
  card: '#FFFCF7',
  ink: '#1B1916',
  muted: '#6D655B',
  border: '#E3D9CD',
  accent: '#9C7040',
  accentSoft: '#EEE2D2',
  accentWarm: '#B8894E',
  accentPeach: '#E8D3B6',
  accentForest: '#465C52',
  accentMossSoft: '#DCE5D8',
  accentRose: '#A95D4D',
  accentRoseSoft: '#F2DDD7',
  accentSky: '#567A88',
  accentSkySoft: '#DCE9EC',
  success: '#2E6749',
  successSoft: '#DCEFE2',
  danger: '#B14B3A',
  dangerSoft: '#F8E0DB',
  warn: '#8A5A0C',
  warnSoft: '#F7E5B5',
};

export const radius = { sm: 10, md: 18, lg: 28, pill: 999 };

export const space = (n) => n * 4;

export const shadow = {
  shadowColor: '#2A211A',
  shadowOpacity: 0.11,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 5,
};

export const STATUS_COLORS = {
  new: { bg: colors.accentSoft, fg: colors.accent },
  contacted: { bg: '#E3E8F7', fg: '#2F4A9A' },
  closed: { bg: colors.successSoft, fg: colors.success },
};
