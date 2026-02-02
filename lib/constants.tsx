import React from 'react';
import { Utensils, Users, Activity, Layers } from 'lucide-react';

export const DEFAULT_CATEGORIES_CONFIG = [
    { id: 'Food', color: '#00C49F', icon: <Utensils size={18} /> },
    { id: 'Salary', color: '#0088FE', icon: <Users size={18} /> },
    { id: 'Electricity', color: '#FFBB28', icon: <Activity size={18} /> },
    { id: 'Repair', color: '#FF4444', icon: <Activity size={18} /> },
    { id: 'Fuel', color: '#8884d8', icon: <Activity size={18} /> },
    { id: 'Other', color: '#999', icon: <Layers size={18} /> },
];
