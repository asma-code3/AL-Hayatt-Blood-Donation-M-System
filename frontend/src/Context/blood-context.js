import { createContext, useContext } from 'react';

export const BloodContext = createContext();

export const useBloodContext = () => useContext(BloodContext);
