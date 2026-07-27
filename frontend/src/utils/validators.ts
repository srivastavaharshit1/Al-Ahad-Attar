export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePassword = (password: string): boolean => {
  // At least 8 characters
  return password.length >= 8;
};

export const validatePhone = (phone: string): boolean => {
  const re = /^\+?[\d\s-]{10,}$/;
  return re.test(phone);
};
