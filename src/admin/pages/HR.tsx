import { useState, useEffect } from 'react';
import { Calendar, Clock, UserCheck, UserX, Filter, Download } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { hrAPI } from '../../utils/api';

interface AttendanceRecord {
  id: string | number;
  employeeId: string | number;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  shift: 'morning' | 'night';
  status: 'present' | 'absent' | 'late' | 'half-day';
  hoursWorked: number;
}

interface Employee {
  id: string | number;
  name: string;
  role: string;
  shift: 'morning' | 'night';
}

export function HR() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterShift, setFilterShift] = useState<'all' | 'morning' | 'night'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent' | 'late'>('all');

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  async function loadData() {
    try {
      setLoading(true);
      const [attendanceData, employeesData] = await Promise.all([
        hrAPI.getAttendance(selectedDate),
        hrAPI.getEmployees()
      ]);
      setAttendance(attendanceData.attendance || []);
      setEmployees(employeesData.employees || []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading HR data:', err);
      setError(err.message || 'Failed to load HR data');
    } finally {
      setLoading(false);
    }
  }

  const handleMarkAttendance = async (employeeId: string | number, status: string, shift: string) => {
    try {
      const now = new Date();
      const checkIn = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      await hrAPI.markAttendance({
        employeeId,
        date: selectedDate,
        status,
        shift,
        checkIn,
        checkOut: '',
      });
      
      await loadData();
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Failed to mark attendance');
    }
  };

  const handleCheckOut = async (recordId: string | number) => {
    try {
      const now = new Date();
      const checkOut = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      await hrAPI.updateAttendance(recordId, { checkOut });
      await loadData();
    } catch (error) {
      console.error('Error checking out:', error);
      alert('Failed to check out');
    }
  };

  const filteredAttendance = attendance.filter((record) => {
    const matchesShift = filterShift === 'all' || record.shift === filterShift;
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
    return matchesShift && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    total: employees.length,
    present: attendance.filter(a => a.status === 'present').length,
    absent: employees.length - attendance.length,
    late: attendance.filter(a => a.status === 'late').length,
    morningShift: employees.filter(e => e.shift === 'morning').length,
    nightShift: employees.filter(e => e.shift === 'night').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500 dark:text-gray-400">Loading HR data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="text-red-600 dark:text-red-400">{error}</div>
        <Button onClick={loadData}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">HR & Attendance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Track employee attendance and shifts</p>
        </div>
        <div className="flex gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <Button icon={Download}>Export Report</Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Present Today</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.present}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Absent Today</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.absent}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <UserX className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>

        <Card className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Late Arrivals</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{stats.late}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Shift Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-8">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Morning Shift</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">7:00 AM - 3:00 PM</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{stats.morningShift} employees</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${(stats.morningShift / stats.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-8">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Night Shift</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">3:00 PM - 11:00 PM</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{stats.nightShift} employees</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ width: `${(stats.nightShift / stats.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
          </div>
          <select
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value as any)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Shifts</option>
            <option value="morning">Morning Shift</option>
            <option value="night">Night Shift</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Status</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
          </select>
        </div>
      </Card>

      {/* Attendance Table */}
      <Card className="p-8">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Employee</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Role</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Shift</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Check In</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Check Out</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Hours</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <span className="font-medium text-gray-900 dark:text-white">{record.employeeName}</span>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-300">
                    {employees.find(e => e.id === record.employeeId)?.role || 'N/A'}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      record.shift === 'morning'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                    }`}>
                      {record.shift === 'morning' ? 'Morning' : 'Night'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-300">
                    {record.checkIn || '-'}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-300">
                    {record.checkOut || '-'}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-300">
                    {record.hoursWorked ? `${record.hoursWorked}h` : '-'}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      record.status === 'present'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : record.status === 'late'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        : record.status === 'absent'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      {!record.checkOut && (
                        <button
                          onClick={() => handleCheckOut(record.id)}
                          className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          Check Out
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAttendance.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No attendance records for selected filters.
            </div>
          )}
        </div>
      </Card>

      {/* Quick Mark Attendance */}
      <Card className="p-8">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Mark Attendance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((employee) => {
            const hasRecord = attendance.some(a => a.employeeId === employee.id);
            return (
              <div
                key={employee.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{employee.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{employee.role} • {employee.shift} shift</p>
                </div>
                {!hasRecord && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMarkAttendance(employee.id, 'present', employee.shift)}
                      className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                      title="Mark Present"
                    >
                      <UserCheck className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMarkAttendance(employee.id, 'absent', employee.shift)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Mark Absent"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {hasRecord && (
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Marked</span>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
