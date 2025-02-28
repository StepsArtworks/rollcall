export type Department = 'Animation' | 'eLearning' | 'ADNR' | 'XR Development' | 'Other';

export type AttendanceStatus = 
  | 'present' 
  | 'late' 
  | 'absent' 
  | 'onsite' 
  | 'leave' 
  | 'sick';

export interface Employee {
  id: string;
  name: string;
  department: Department;
  status?: AttendanceStatus;
}

export interface DepartmentSubmission {
  department: Department;
  submitted: boolean;
  submittedAt?: Date;
}

export interface AttendanceRecord {
  date: string;
  departmentSubmissions: DepartmentSubmission[];
  employees: Employee[];
}

export const ATTENDANCE_STATUSES = {
  present: { label: 'Present', emoji: '✅', color: 'bg-green-100 text-green-800', icon: '🟢' },
  late: { label: 'Late but informed', emoji: '🕐', color: 'bg-blue-100 text-blue-800', icon: '🔵' },
  absent: { label: 'Late & didn\'t inform', emoji: '❌', color: 'bg-red-100 text-red-800', icon: '🔴' },
  onsite: { label: 'On-site but not at desk', emoji: '🏢', color: 'bg-yellow-100 text-yellow-800', icon: '🟡' },
  leave: { label: 'On leave', emoji: '🌴', color: 'bg-orange-100 text-orange-800', icon: '🟠' },
  sick: { label: 'Sick leave', emoji: '🤒', color: 'bg-purple-100 text-purple-800', icon: '🩺' }
};

export const DEPARTMENTS: Department[] = ['Animation', 'eLearning', 'ADNR', 'XR Development', 'Other'];

export const DEPARTMENT_ICONS = {
  'Animation': '🎨',
  'eLearning': '📚',
  'ADNR': '🛠',
  'XR Development': '🏗',
  'Other': '🌍'
};