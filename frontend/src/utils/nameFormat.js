export const maskDisplayName = (fullName = '') => {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return '';
  }

  if (parts.length === 1) {
    const [firstName] = parts;
    if (firstName.length <= 1) {
      return firstName;
    }
    return `${firstName.slice(0, 1)}***`;
  }

  const [firstName, ...rest] = parts;
  const lastInitial = rest[0]?.charAt(0)?.toUpperCase();
  return `${firstName} ${lastInitial}.`;
};
