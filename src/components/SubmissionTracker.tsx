import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Department, DepartmentSubmission, DEPARTMENT_ICONS } from '../types';
import graphService from '../services/graphService';
import { format } from 'date-fns';

const SubmissionTracker: React.FC = () => {
  const [submissions, setSubmissions] = useState<DepartmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSubmissions = async () => {
    try {
      setError(null);
      if (!loading) setRefreshing(true);
      
      console.log('Fetching department submissions');
      const departmentSubmissions = await graphService.getDepartmentSubmissions();
      console.log(`Fetched ${departmentSubmissions.length} department submissions`);
      setSubmissions(departmentSubmissions);
    } catch (err: any) {
      console.error('Error fetching department submissions:', err);
      setError(err.message || 'Failed to load submission status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    
    // Refresh every minute
    const intervalId = setInterval(fetchSubmissions, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  const handleRefresh = () => {
    fetchSubmissions();
  };

  const allSubmitted = submissions.every(s => s.submitted);
  const submittedCount = submissions.filter(s => s.submitted).length;
  const totalCount = submissions.length;
  const progressPercentage = totalCount > 0 ? (submittedCount / totalCount) * 100 : 0;

  if (loading && submissions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500 mr-2" />
        <span>Loading submission status...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Department Submissions</h2>
        <button 
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-blue-600 hover:text-blue-800 flex items-center"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
            <div>
              <p className="text-red-700 text-sm">{error}</p>
              <button 
                onClick={fetchSubmissions}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm font-medium">{submittedCount}/{totalCount} departments</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>
      
      {allSubmitted && (
        <div className="mb-6 p-3 bg-green-100 text-green-800 rounded-lg flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          <span>All departments have submitted! The summary has been sent to Microsoft Teams.</span>
        </div>
      )}
      
      <ul className="space-y-3">
        {submissions.map((submission) => (
          <li 
            key={submission.department}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div className="flex items-center">
              <span className="mr-2 text-xl">{DEPARTMENT_ICONS[submission.department as Department]}</span>
              <span>{submission.department}</span>
            </div>
            
            {submission.submitted ? (
              <div className="flex items-center text-green-600">
                <CheckCircle className="w-5 h-5 mr-1" />
                <span>Submitted</span>
                {submission.submittedAt && (
                  <span className="ml-2 text-xs text-gray-500">
                    at {format(new Date(submission.submittedAt), 'HH:mm')}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center text-amber-600">
                <Clock className="w-5 h-5 mr-1" />
                <span>Pending</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SubmissionTracker;