import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react';
import { Department, Employee, AttendanceStatus, ATTENDANCE_STATUSES } from '../types';
import graphService from '../services/graphService';
import toast from 'react-hot-toast';

interface AttendanceFormProps {
  department: Department;
  onBack: () => void;
  onSubmitSuccess: () => void;
}

const AttendanceForm: React.FC<AttendanceFormProps> = ({ department, onBack, onSubmitSuccess }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(`Fetching employees for ${department}`);
        const fetchedEmployees = await graphService.getEmployeesByDepartment(department);
        console.log(`Fetched ${fetchedEmployees.length} employees for ${department}`);
        setEmployees(fetchedEmployees);
      } catch (error: any) {
        console.error('Error fetching employees:', error);
        setError(error.message || 'Failed to load employees. Please try again.');
        toast.error('Failed to load employees. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [department]);

  const handleStatusChange = (employeeId: string, status: AttendanceStatus) => {
    setEmployees(prevEmployees => 
      prevEmployees.map(emp => 
        emp.id === employeeId ? { ...emp, status } : emp
      )
    );
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      // Set default status for any employee without a status
      const employeesWithStatus = employees.map(emp => ({
        ...emp,
        status: emp.status || 'absent'
      }));
      
      await graphService.submitAttendance(department, employeesWithStatus);
      toast.success('Attendance submitted successfully!');
      onSubmitSuccess();
    } catch (error: any) {
      console.error('Error submitting attendance:', error);
      setError(error.message || 'Failed to submit attendance. Please try again.');
      toast.error('Failed to submit attendance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <p className="text-lg">Loading employees...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center mb-6">
        <button 
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back
        </button>
        <h1 className="text-2xl font-bold ml-4">{department} Attendance</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Mark Attendance</h2>
        
        {employees.length === 0 ? (
          <p className="text-gray-500 italic">No employees found for this department.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">Employee Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 border-b">Attendance Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{employee.name}</td>
                    <td className="px-4 py-3">
                      <select
                        value={employee.status || ''}
                        onChange={(e) => handleStatusChange(employee.id, e.target.value as AttendanceStatus)}
                        className={`w-full p-2 rounded border ${
                          employee.status ? ATTENDANCE_STATUSES[employee.status].color : 'border-gray-300'
                        }`}
                      >
                        <option value="" disabled>Select status</option>
                        {Object.entries(ATTENDANCE_STATUSES).map(([value, { label, emoji }]) => (
                          <option key={value} value={value}>
                            {emoji} {label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={submitting || employees.length === 0}
          className={`flex items-center px-6 py-3 rounded-lg text-white font-medium ${
            submitting || employees.length === 0
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Submit Attendance
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AttendanceForm;