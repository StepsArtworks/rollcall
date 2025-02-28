import { Client } from '@microsoft/microsoft-graph-client';
import { format } from 'date-fns';
import authService from './authService';
import { teamsConfig } from '../config';
import { Department, Employee, AttendanceStatus, DepartmentSubmission } from '../types';

class GraphService {
  private client: Client | null = null;
  private excelFileUrl = 'https://tbrconsultants.sharepoint.com/:x:/s/Rollcall/ESbU_CR_4X1OhCzh55FkDC0BwNUv9K7qYxQk7s5DRmU0Og?e=byZm4p';

  private async getAuthenticatedClient(): Promise<Client> {
    try {
      // Check if we have a mock user (direct login)
      const mockUserJson = localStorage.getItem('mockUser');
      if (mockUserJson) {
        console.log('Using mock user, returning mock client');
        // If using mock user, we'll use mock data
        throw new Error('Using mock authentication');
      }
      
      const token = await authService.getToken();
      
      this.client = Client.init({
        authProvider: (done) => {
          done(null, token);
        }
      });
      
      return this.client;
    } catch (error) {
      console.error('Failed to get authenticated client:', error);
      console.log('Falling back to mock data mode');
      // Return a dummy client that will trigger the fallback to mock data
      return null as any;
    }
  }

  async getTeamId(): Promise<string> {
    try {
      const client = await this.getAuthenticatedClient();
      const teams = await client.api('/me/joinedTeams').get();
      
      const team = teams.value.find((t: any) => t.displayName === teamsConfig.teamName);
      
      if (!team) {
        throw new Error(`Team "${teamsConfig.teamName}" not found`);
      }
      
      return team.id;
    } catch (error) {
      console.error('Error getting team ID:', error);
      throw error;
    }
  }

  async getChannelId(teamId: string): Promise<string> {
    try {
      const client = await this.getAuthenticatedClient();
      const channels = await client.api(`/teams/${teamId}/channels`).get();
      
      const channel = channels.value.find((c: any) => c.displayName === teamsConfig.channelName);
      
      if (!channel) {
        throw new Error(`Channel "${teamsConfig.channelName}" not found in team "${teamsConfig.teamName}"`);
      }
      
      return channel.id;
    } catch (error) {
      console.error('Error getting channel ID:', error);
      throw error;
    }
  }

  async getExcelFileId(): Promise<string> {
    try {
      // Extract the file ID from the URL
      // The URL format is typically: https://...sharepoint.com/.../{fileId}?...
      const urlParts = this.excelFileUrl.split('/');
      const fileIdWithParams = urlParts[urlParts.length - 1];
      const fileId = fileIdWithParams.split('?')[0];
      
      if (!fileId) {
        throw new Error('Could not extract file ID from URL');
      }
      
      console.log('Extracted Excel file ID:', fileId);
      return fileId;
    } catch (error) {
      console.error('Error getting Excel file ID:', error);
      throw error;
    }
  }

  async getEmployeesByDepartment(department: Department): Promise<Employee[]> {
    try {
      console.log(`Fetching employees for department: ${department}`);
      const client = await this.getAuthenticatedClient();
      
      // Try to get the file directly using the SharePoint URL
      try {
        // First, try to get the file using the SharePoint site and document library
        const fileId = await this.getExcelFileId();
        
        // Get the worksheet for the department
        console.log('Getting worksheets from Excel file');
        const worksheets = await client.api(`/me/drive/items/${fileId}/workbook/worksheets`).get();
        console.log('Worksheets:', worksheets);
        
        const worksheet = worksheets.value.find((w: any) => w.name === department);
        
        if (!worksheet) {
          console.warn(`Worksheet for department "${department}" not found`);
          throw new Error(`Worksheet for department "${department}" not found`);
        }
        
        // Get the used range to find employees in column A
        console.log(`Getting data from worksheet: ${worksheet.name}`);
        const usedRange = await client.api(`/me/drive/items/${fileId}/workbook/worksheets/${worksheet.id}/usedRange`).get();
        
        // Extract employee names from column A (skipping header row)
        const employees: Employee[] = [];
        
        if (usedRange.values && usedRange.values.length > 1) {
          console.log(`Found ${usedRange.values.length} rows in the worksheet`);
          for (let i = 1; i < usedRange.values.length; i++) {
            const row = usedRange.values[i];
            if (row[0] && typeof row[0] === 'string' && row[0].trim() !== '') {
              employees.push({
                id: `${department}-${i}`,
                name: row[0],
                department: department
              });
            }
          }
        }
        
        console.log(`Retrieved ${employees.length} employees for ${department}`);
        return employees;
      } catch (error) {
        console.error('Error accessing Excel file directly:', error);
        throw error;
      }
    } catch (error) {
      console.error(`Error getting employees for department ${department}:`, error);
      // If we can't get real data, return mock data as fallback
      console.log('Falling back to mock data for employees');
      return this.getMockEmployees(department);
    }
  }

  // Helper method to generate mock employees for testing
  private getMockEmployees(department: Department): Employee[] {
    console.log(`Generating mock employees for ${department}`);
    const mockEmployees: Record<Department, string[]> = {
      'Animation': ['John Smith', 'Sarah Johnson', 'Michael Brown', 'Emily Davis'],
      'eLearning': ['David Wilson', 'Jennifer Taylor', 'Robert Martinez', 'Lisa Anderson'],
      'ADNR': ['James Thomas', 'Patricia White', 'Charles Harris', 'Jessica Lewis'],
      'XR Development': ['Daniel Clark', 'Nancy Walker', 'Paul Hall', 'Karen Young'],
      'Other': ['Mark Allen', 'Sandra King', 'Kevin Wright', 'Betty Scott']
    };
    
    return mockEmployees[department].map((name, index) => ({
      id: `${department}-${index}`,
      name,
      department
    }));
  }

  async getDepartmentSubmissions(): Promise<DepartmentSubmission[]> {
    try {
      // Try to get submissions from localStorage first (for demo purposes)
      const today = format(new Date(), 'yyyy-MM-dd');
      const submissionsKey = `submissions_${today}`;
      const storedSubmissions = localStorage.getItem(submissionsKey);
      
      if (storedSubmissions) {
        try {
          const parsedSubmissions = JSON.parse(storedSubmissions);
          if (Array.isArray(parsedSubmissions) && parsedSubmissions.length > 0) {
            console.log('Using stored department submissions from localStorage');
            return parsedSubmissions.map((sub: any) => ({
              ...sub,
              submittedAt: sub.submittedAt ? new Date(sub.submittedAt) : undefined
            }));
          }
        } catch (e) {
          console.error('Error parsing stored submissions:', e);
        }
      }
      
      // If no stored submissions or error parsing, try to get from Excel
      try {
        const client = await this.getAuthenticatedClient();
        const fileId = await this.getExcelFileId();
        
        const departmentSubmissions: DepartmentSubmission[] = [];
        
        // Check each department worksheet for submission status
        for (const department of ['Animation', 'eLearning', 'ADNR', 'XR Development', 'Other'] as Department[]) {
          const worksheets = await client.api(`/me/drive/items/${fileId}/workbook/worksheets`).get();
          const worksheet = worksheets.value.find((w: any) => w.name === department);
          
          if (!worksheet) {
            departmentSubmissions.push({
              department,
              submitted: false
            });
            continue;
          }
          
          // Get the used range to find the submission status row
          const usedRange = await client.api(`/me/drive/items/${fileId}/workbook/worksheets/${worksheet.id}/usedRange`).get();
          
          let submitted = false;
          let submittedAt = undefined;
          
          // Look for the submission status row and today's date column
          if (usedRange.values && usedRange.values.length > 0) {
            // Find today's date in the header row
            const headerRow = usedRange.values[0];
            const todayColumnIndex = headerRow.findIndex((cell: string) => cell === today);
            
            if (todayColumnIndex !== -1) {
              // Look for submission status row (usually the last row)
              const lastRow = usedRange.values[usedRange.values.length - 1];
              if (lastRow[0] === 'Submission Status' && lastRow[todayColumnIndex]) {
                submitted = true;
                submittedAt = new Date(lastRow[todayColumnIndex]);
              }
            }
          }
          
          departmentSubmissions.push({
            department,
            submitted,
            submittedAt
          });
        }
        
        // Store the submissions in localStorage for future use
        localStorage.setItem(submissionsKey, JSON.stringify(departmentSubmissions));
        
        return departmentSubmissions;
      } catch (error) {
        console.error('Error getting department submissions from Excel:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error getting department submissions:', error);
      // If we can't get real data, return mock data as fallback
      console.log('Falling back to mock data for department submissions');
      return this.getMockDepartmentSubmissions();
    }
  }

  // Helper method to generate mock department submissions for testing
  private getMockDepartmentSubmissions(): DepartmentSubmission[] {
    console.log('Generating mock department submissions');
    const departments: Department[] = ['Animation', 'eLearning', 'ADNR', 'XR Development', 'Other'];
    const now = new Date();
    
    // Check if we have any stored attendance data
    const today = format(new Date(), 'yyyy-MM-dd');
    const submissions: DepartmentSubmission[] = [];
    
    for (const department of departments) {
      const storageKey = `attendance_${department}_${today}`;
      const storedData = localStorage.getItem(storageKey);
      
      if (storedData) {
        // This department has submitted attendance today
        submissions.push({
          department,
          submitted: true,
          submittedAt: new Date(now.getTime() - Math.floor(Math.random() * 8) * 60 * 60 * 1000)
        });
      } else {
        // This department has not submitted
        submissions.push({
          department,
          submitted: false
        });
      }
    }
    
    return submissions;
  }

  async submitAttendance(department: Department, employees: Employee[]): Promise<boolean> {
    try {
      console.log(`Submitting attendance for ${department} with ${employees.length} employees`);
      
      // Try to submit to Excel
      try {
        const client = await this.getAuthenticatedClient();
        const fileId = await this.getExcelFileId();
        
        // Get the worksheet for the department
        const worksheets = await client.api(`/me/drive/items/${fileId}/workbook/worksheets`).get();
        const worksheet = worksheets.value.find((w: any) => w.name === department);
        
        if (!worksheet) {
          throw new Error(`Worksheet for department "${department}" not found`);
        }
        
        // Get the used range to find the next available column
        const usedRange = await client.api(`/me/drive/items/${fileId}/workbook/worksheets/${worksheet.id}/usedRange`).get();
        
        const today = format(new Date(), 'yyyy-MM-dd');
        let todayColumnIndex = -1;
        
        // Check if today's column already exists
        if (usedRange.values && usedRange.values.length > 0) {
          const headerRow = usedRange.values[0];
          todayColumnIndex = headerRow.findIndex((cell: string) => cell === today);
        }
        
        // If today's column doesn't exist, add it
        if (todayColumnIndex === -1) {
          const lastColumnIndex = usedRange.values[0].length;
          const nextColumnLetter = this.getExcelColumnLetter(lastColumnIndex);
          
          // Add today's date as the header
          await client.api(`/me/drive/items/${fileId}/workbook/worksheets/${worksheet.id}/range('${nextColumnLetter}1')`).patch({
            values: [[today]]
          });
          
          todayColumnIndex = lastColumnIndex;
        }
        
        // Update attendance for each employee
        for (const employee of employees) {
          // Find the row for this employee
          let employeeRowIndex = -1;
          
          for (let i = 1; i < usedRange.values.length; i++) {
            if (usedRange.values[i][0] === employee.name) {
              employeeRowIndex = i + 1; // +1 because Excel is 1-indexed
              break;
            }
          }
          
          if (employeeRowIndex === -1) {
            console.error(`Employee "${employee.name}" not found in worksheet`);
            continue;
          }
          
          const columnLetter = this.getExcelColumnLetter(todayColumnIndex);
          const cellAddress = `${columnLetter}${employeeRowIndex}`;
          
          // Update the cell with the attendance status
          await client.api(`/me/drive/items/${fileId}/workbook/worksheets/${worksheet.id}/range('${cellAddress}')`).patch({
            values: [[employee.status || 'absent']]
          });
        }
        
        // Add or update submission status row
        const submissionStatusRowIndex = usedRange.values.length + 1;
        const columnLetter = this.getExcelColumnLetter(todayColumnIndex);
        
        // Add "Submission Status" in column A
        await client.api(`/me/drive/items/${fileId}/workbook/worksheets/${worksheet.id}/range('A${submissionStatusRowIndex}')`).patch({
          values: [['Submission Status']]
        });
        
        // Add timestamp in today's column
        const now = new Date().toISOString();
        await client.api(`/me/drive/items/${fileId}/workbook/worksheets/${worksheet.id}/range('${columnLetter}${submissionStatusRowIndex}')`).patch({
          values: [[now]]
        });
        
        console.log('Successfully submitted attendance to Excel');
      } catch (error) {
        console.error('Error submitting to Excel:', error);
        console.log('Falling back to local storage for attendance submission');
      }
      
      // Always store in localStorage as a backup
      const storageKey = `attendance_${department}_${format(new Date(), 'yyyy-MM-dd')}`;
      localStorage.setItem(storageKey, JSON.stringify(employees));
      
      // Update department submissions
      const submissionsKey = `submissions_${format(new Date(), 'yyyy-MM-dd')}`;
      let submissions = [];
      try {
        const storedSubmissions = localStorage.getItem(submissionsKey);
        submissions = storedSubmissions ? JSON.parse(storedSubmissions) : [];
      } catch (e) {
        submissions = [];
      }
      
      // Add this department if not already submitted
      const departmentIndex = submissions.findIndex((s: any) => s.department === department);
      if (departmentIndex === -1) {
        submissions.push({
          department,
          submitted: true,
          submittedAt: new Date().toISOString()
        });
      } else {
        submissions[departmentIndex].submitted = true;
        submissions[departmentIndex].submittedAt = new Date().toISOString();
      }
      
      localStorage.setItem(submissionsKey, JSON.stringify(submissions));
      
      // Check if all departments have submitted
      const allSubmitted = submissions.every((s: any) => s.submitted);
      if (allSubmitted) {
        // Send the summary to Teams
        await this.sendAttendanceSummaryToTeams(submissions.map(s => ({
          ...s,
          submittedAt: s.submittedAt ? new Date(s.submittedAt) : undefined
        })));
      }
      
      return true;
    } catch (error) {
      console.error(`Error submitting attendance for department ${department}:`, error);
      throw error;
    }
  }

  async sendAttendanceSummaryToTeams(departmentSubmissions: DepartmentSubmission[]): Promise<void> {
    try {
      console.log('Sending attendance summary to Teams');
      
      // Try to send to Teams
      try {
        const client = await this.getAuthenticatedClient();
        const teamId = await this.getTeamId();
        const channelId = await this.getChannelId(teamId);
        
        // Get all employees with their attendance status
        const allEmployees: Employee[] = [];
        
        for (const submission of departmentSubmissions) {
          if (submission.submitted) {
            const storageKey = `attendance_${submission.department}_${format(new Date(), 'yyyy-MM-dd')}`;
            const storedData = localStorage.getItem(storageKey);
            
            if (storedData) {
              try {
                const employees = JSON.parse(storedData);
                allEmployees.push(...employees);
              } catch (e) {
                console.error(`Error parsing stored attendance for ${submission.department}:`, e);
              }
            }
          }
        }
        
        // Generate the summary message
        const today = format(new Date(), 'yyyy-MM-dd');
        let message = `🗓️ **Daily Attendance Report - ${today}**\n\n`;
        
        for (const department of ['Animation', 'eLearning', 'ADNR', 'XR Development', 'Other'] as Department[]) {
          const departmentEmployees = allEmployees.filter(e => e.department === department);
          const departmentIcon = {
            'Animation': '🎨',
            'eLearning': '📚',
            'ADNR': '🛠',
            'XR Development': '🏗',
            'Other': '🌍'
          }[department];
          
          message += `${departmentIcon} **${department}:**\n`;
          
          // Group employees by status
          const present = departmentEmployees.filter(e => e.status === 'present').map(e => e.name).join(', ');
          const late = departmentEmployees.filter(e => e.status === 'late').map(e => e.name).join(', ');
          const absent = departmentEmployees.filter(e => e.status === 'absent').map(e => e.name).join(', ');
          const onLeave = departmentEmployees.filter(e => e.status === 'leave').map(e => e.name).join(', ');
          const sick = departmentEmployees.filter(e => e.status === 'sick').map(e => e.name).join(', ');
          
          message += `✅ Present: ${present || 'None'}\n`;
          message += `🕐 Late: ${late || 'None'}\n`;
          message += `❌ Absent: ${absent || 'None'}\n`;
          message += `🌴 On Leave: ${onLeave || 'None'}\n`;
          message += `🤒 Sick: ${sick || 'None'}\n\n`;
        }
        
        // Send the message to Teams
        await client.api(`/teams/${teamId}/channels/${channelId}/messages`).post({
          body: {
            content: message
          }
        });
        
        console.log('Successfully sent attendance summary to Teams');
      } catch (error) {
        console.error('Error sending to Teams:', error);
        console.log('Teams message could not be sent');
      }
    } catch (error) {
      console.error('Error sending attendance summary to Teams:', error);
    }
  }

  // Helper function to convert column index to Excel column letter (A, B, C, ..., Z, AA, AB, ...)
  private getExcelColumnLetter(columnIndex: number): string {
    let columnLetter = '';
    
    while (columnIndex >= 0) {
      columnLetter = String.fromCharCode(65 + (columnIndex % 26)) + columnLetter;
      columnIndex = Math.floor(columnIndex / 26) - 1;
    }
    
    return columnLetter;
  }
}

export const graphService = new GraphService();
export default graphService;