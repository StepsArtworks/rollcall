import React from 'react';
import { Users, BookOpen, PenTool as Tool, Cuboid as Cube, Globe } from 'lucide-react';
import { Department, DEPARTMENTS } from '../types';

interface DepartmentSelectorProps {
  onSelect: (department: Department) => void;
}

const DepartmentSelector: React.FC<DepartmentSelectorProps> = ({ onSelect }) => {
  const getDepartmentIcon = (department: Department) => {
    switch (department) {
      case 'Animation':
        return <Users className="w-8 h-8 mb-2" />;
      case 'eLearning':
        return <BookOpen className="w-8 h-8 mb-2" />;
      case 'ADNR':
        return <Tool className="w-8 h-8 mb-2" />;
      case 'XR Development':
        return <Cube className="w-8 h-8 mb-2" />;
      case 'Other':
        return <Globe className="w-8 h-8 mb-2" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Smart Attendance Register</h1>
      <h2 className="text-xl font-semibold text-center mb-6">Select Your Department</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {DEPARTMENTS.map((department) => (
          <button
            key={department}
            onClick={() => onSelect(department)}
            className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-200"
          >
            {getDepartmentIcon(department)}
            <span className="text-lg font-medium">{department}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DepartmentSelector;