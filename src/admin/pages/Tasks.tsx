import { useState, useEffect } from 'react';
import { Plus, Calendar, User, Flag, Trash2, CheckCircle2, Circle, Clock, MoreVertical, Edit2, AlertCircle, RefreshCw } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import { tasksAPI, teamAPI } from '../../utils/api';
import { motion, AnimatePresence } from 'motion/react';

type TaskStatus = 'todo' | 'inprogress' | 'completed';
type TaskPriority = 'low' | 'medium' | 'high';

interface Task {
  id: string | number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignees: { name: string; avatar: string }[];
  deadline: string;
  created_at?: string;
}

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  role: string;
}

export function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    assignees: [],
    deadline: '',
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksData, teamData] = await Promise.all([
        tasksAPI.getAll(),
        teamAPI.getAll()
      ]);
      setTasks(tasksData);
      setTeamMembers(teamData);
    } catch (error) {
      console.error('Error fetching task data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50';
      case 'medium':
        return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50';
      case 'low':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50';
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'inprogress': return <Clock className="w-4 h-4 text-amber-500" />;
      default: return <Circle className="w-4 h-4 text-blue-500" />;
    }
  };

  const handleOpenAddModal = () => {
    setEditingTask(null);
    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      assignees: [],
      deadline: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      assignees: task.assignees || [],
      deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
    });
    setIsModalOpen(true);
  };

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.deadline) {
      setToast({ message: 'Please provide at least a title and a deadline', type: 'error' });
      return;
    }

    try {
      const taskData = {
        title: newTask.title,
        description: newTask.description || '',
        status: newTask.status || (editingTask ? editingTask.status : 'todo'),
        priority: newTask.priority || 'medium',
        assignees: newTask.assignees || [],
        deadline: newTask.deadline,
      };

      if (editingTask) {
        const updated = await tasksAPI.update(editingTask.id, taskData);
        setTasks(tasks.map(t => t.id === editingTask.id ? updated : t));
        setToast({ message: 'Task updated successfully', type: 'success' });
      } else {
        const created = await tasksAPI.create(taskData);
        setTasks([created, ...tasks]);
        setToast({ message: 'Task created successfully', type: 'success' });
      }
      setIsModalOpen(false);
      setEditingTask(null);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        assignees: [],
        deadline: '',
      });
    } catch (error) {
      console.error('Error saving task:', error);
      setToast({ message: 'Failed to save task', type: 'error' });
    }
  };

  const handleUpdateStatus = async (taskId: string | number, newStatus: TaskStatus) => {
    try {
      await tasksAPI.update(taskId, { status: newStatus });
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleDeleteTask = async (taskId: string | number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await tasksAPI.delete(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const toggleAssignee = (member: TeamMember) => {
    const currentAssignees = newTask.assignees || [];
    const exists = currentAssignees.find(a => a.name === member.name);
    
    if (exists) {
      setNewTask({
        ...newTask,
        assignees: currentAssignees.filter(a => a.name !== member.name)
      });
    } else {
      setNewTask({
        ...newTask,
        assignees: [...currentAssignees, { name: member.name, avatar: member.avatar || '' }]
      });
    }
  };

  const TaskCard = ({ task }: { task: Task }) => (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-lg hover:shadow-black/5 transition-all group"
    >
      <div className="flex items-start justify-between mb-5">
        <div className="flex-1 mr-4">
          <h4 className="font-bold text-gray-900 dark:text-white text-lg leading-tight mb-2">{task.title}</h4>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getPriorityColor(task.priority)}`}>
            <Flag className="w-3 h-3" />
            {task.priority}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => handleOpenEditModal(task)}
            className="p-2 text-gray-400 hover:text-blue-500 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleDeleteTask(task.id)}
            className="p-2 text-gray-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 line-clamp-3 leading-relaxed">{task.description}</p>
      
      {task.created_at && (
        <div className="flex items-center gap-1.5 mb-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          <Clock className="w-3 h-3" />
          Added {new Date(task.created_at).toLocaleDateString()}
        </div>
      )}
      
      <div className="flex items-center justify-between pt-5 border-t border-gray-100 dark:border-gray-700/50 mt-auto">
        <div className="flex items-center -space-x-2">
          {task.assignees?.map((assignee, index) => (
            <div 
              key={index} 
              className="w-9 h-9 rounded-full border-2 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 overflow-hidden shadow-sm"
              title={assignee.name}
            >
              {assignee.avatar ? (
                <img src={assignee.avatar} alt={assignee.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-full h-full p-2 text-gray-400" />
              )}
            </div>
          ))}
          {(!task.assignees || task.assignees.length === 0) && (
            <span className="text-xs text-gray-400 font-medium ml-2">Unassigned</span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700/50">
            <Calendar className="w-3.5 h-3.5" />
            {task.deadline ? new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date'}
          </div>
          <select 
            value={task.status}
            onChange={(e) => handleUpdateStatus(task.id, e.target.value as TaskStatus)}
            className="bg-transparent text-[11px] font-black uppercase tracking-widest cursor-pointer focus:outline-none hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <option value="todo">To Do</option>
            <option value="inprogress">In Progress</option>
            <option value="completed">Done</option>
          </select>
        </div>
      </div>
    </motion.div>
  );

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    task.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTasksByStatus = (status: TaskStatus) => filteredTasks.filter((task) => task.status === status);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-surface-raised"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 px-4 md:px-8 py-8 md:py-10">
      {/* Header Section (Bento Style) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none mb-3">Task Board</h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm md:text-base">Coordinate team activities and project milestones.</p>
            <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700"></div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full border border-emerald-100 dark:border-emerald-800/50 w-fit">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">System Active</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1 sm:min-w-[300px]">
            <input 
              type="text"
              placeholder="Search missions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 h-[48px] bg-gray-50 dark:bg-gray-900 border-none rounded-[1.25rem] text-sm font-medium focus:ring-2 focus:ring-surface-raised transition-all"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            )}
          </div>
          <div className="flex p-1.5 bg-gray-50 dark:bg-gray-900 rounded-[1.25rem]">
            <button
              onClick={() => setView('kanban')}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                view === 'kanban'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-md shadow-black/5'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex-1 sm:flex-none px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                view === 'list'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-md shadow-black/5'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              List
            </button>
          </div>
          <Button 
            variant="secondary"
            onClick={fetchData}
            className="!rounded-[1.25rem] h-[48px] w-12 !p-0 bg-gray-50 dark:bg-gray-900 border-none hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            title="Refresh Missions"
          >
            <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            onClick={handleOpenAddModal} 
            className="w-full sm:w-auto bg-[#ff1574] hover:bg-[#e00d65] text-white !rounded-[1.25rem] h-[48px] px-8 font-black uppercase tracking-tighter shadow-lg shadow-[#ff1574]/20 border-none"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: 'Total Tasks', value: filteredTasks.length, color: 'text-gray-900 dark:text-white' },
          { label: 'To Do', value: getTasksByStatus('todo').length, color: 'text-gray-900 dark:text-white' },
          { label: 'Live Action', value: getTasksByStatus('inprogress').length, color: 'text-gray-900 dark:text-white' },
          { label: 'Completed', value: getTasksByStatus('completed').length, color: 'text-gray-900 dark:text-white' }
        ].map((stat, i) => (
          <Card key={i} className="p-6 md:p-8 !rounded-[2rem] border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 flex flex-col items-center justify-center text-center group hover:-translate-y-1 hover:shadow-md transition-all duration-300">
            <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500 mb-2">{stat.label}</span>
            <span className={`text-4xl md:text-5xl font-black tracking-tighter ${stat.color}`}>{stat.value}</span>
          </Card>
        ))}
      </div>

      {/* View Switcher */}
      <AnimatePresence mode="wait">
        {view === 'kanban' ? (
          <motion.div 
            key="kanban"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {[
              { id: 'todo' as TaskStatus, label: 'To Do' },
              { id: 'inprogress' as TaskStatus, label: 'In Progress' },
              { id: 'completed' as TaskStatus, label: 'Completed' }
            ].map((col) => (
              <div key={col.id} className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col h-full">
                <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-black text-lg uppercase tracking-tighter text-gray-900 dark:text-white">
                    {col.label}
                  </h3>
                  <span className="text-gray-400 font-bold text-sm">{getTasksByStatus(col.id).length}</span>
                </div>
                
                <div className="flex flex-col gap-4 flex-1">
                  {getTasksByStatus(col.id).map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                  {getTasksByStatus(col.id).length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-gray-100 dark:border-gray-700/50 rounded-[1.5rem] text-center bg-gray-50/30 dark:bg-gray-800/30 group/empty hover:border-gray-200 dark:hover:border-gray-600 transition-colors">
                      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center mb-4 group-hover/empty:scale-110 transition-transform">
                        <Plus className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">No tasks here</span>
                      <p className="text-[10px] text-gray-400 dark:text-gray-600 font-medium max-w-[150px]">Ready to deploy a new mission to this phase?</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="!rounded-[2.5rem] overflow-hidden border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                      <th className="text-left py-6 px-10 text-[10px] font-black uppercase tracking-widest text-gray-400">Task Information</th>
                      <th className="text-left py-6 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Active Team</th>
                      <th className="text-left py-6 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Priority</th>
                      <th className="text-left py-6 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                      <th className="text-left py-6 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Deadline</th>
                      <th className="py-6 px-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {filteredTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="py-6 px-10">
                          <div className="max-w-md">
                            <p className="font-bold text-gray-900 dark:text-white mb-1">{task.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-1">{task.description}</p>
                          </div>
                        </td>
                        <td className="py-6 px-4">
                          <div className="flex -space-x-2">
                            {task.assignees?.map((a, i) => (
                              <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 overflow-hidden bg-gray-100" title={a.name}>
                                {a.avatar ? <img src={a.avatar} alt={a.name} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-gray-400" />}
                              </div>
                            ))}
                            {(!task.assignees || task.assignees.length === 0) && (
                              <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center bg-gray-50/50">
                                <User className="w-4 h-4 text-gray-300" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-6 px-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="py-6 px-4">
                          <select 
                            value={task.status}
                            onChange={(e) => handleUpdateStatus(task.id, e.target.value as TaskStatus)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border-none focus:ring-0 cursor-pointer transition-all ${
                              task.status === 'completed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                              task.status === 'inprogress' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' :
                              'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                            }`}
                          >
                            <option value="todo">To Do</option>
                            <option value="inprogress">In Progress</option>
                            <option value="completed">Done</option>
                          </select>
                        </td>
                        <td className="py-6 px-4">
                          <span className="text-xs font-bold text-gray-500">
                            {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No date'}
                          </span>
                        </td>
                        <td className="py-6 px-10 text-right">
                          <button 
                            onClick={() => handleOpenEditModal(task)}
                            className="p-2 text-gray-300 hover:text-blue-500 transition-colors mr-2"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Task Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTask ? "Update Task" : "Initialize New Task"}>
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Task Objective</label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-surface-raised transition-all font-medium"
                placeholder="What needs to be done?"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Mission Brief</label>
              <textarea
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-surface-raised transition-all min-h-[120px] resize-none font-medium"
                placeholder="Add more details..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Priority Level</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
                  className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-surface-raised transition-all font-bold uppercase tracking-tighter"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Deadline</label>
                <input
                  type="date"
                  value={newTask.deadline}
                  onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                  className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-surface-raised transition-all font-bold"
                />
              </div>
            </div>
            
            {editingTask && (
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Status</label>
                <select
                  value={newTask.status}
                  onChange={(e) => setNewTask({ ...newTask, status: e.target.value as TaskStatus })}
                  className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-surface-raised transition-all font-bold uppercase tracking-tighter"
                >
                  <option value="todo">To Do</option>
                  <option value="inprogress">In Progress</option>
                  <option value="completed">Done</option>
                </select>
              </div>
            )}
            
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Assign Mission To</label>
              <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-2 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl">
                {teamMembers.map((member) => {
                  const isSelected = newTask.assignees?.some(a => a.name === member.name);
                  return (
                    <button
                      key={member.id}
                      onClick={() => toggleAssignee(member)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all border ${
                        isSelected
                          ? 'bg-surface-raised text-white border-surface-raised shadow-lg shadow-surface-raised/20'
                          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-surface-raised/50'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200">
                        {member.avatar ? <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" /> : <User className="w-full h-full p-1 text-gray-400" />}
                      </div>
                      <span className="text-[13px] font-bold">{member.name}</span>
                    </button>
                  );
                })}
                {teamMembers.length === 0 && (
                  <div className="w-full py-8 text-center">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No team members found</p>
                    <p className="text-[10px] text-gray-400 mt-1">Add agents in the Team section to assign them tasks.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              variant="secondary" 
              onClick={() => setIsModalOpen(false)}
              className="flex-1 !rounded-2xl h-[52px] font-black uppercase tracking-widest text-xs"
            >
              Abort Mission
            </Button>
            <Button 
              onClick={handleCreateTask}
              className="flex-1 bg-surface-raised hover:brightness-110 !rounded-2xl h-[52px] font-black uppercase tracking-widest text-xs shadow-xl shadow-surface-raised/20"
            >
              {editingTask ? 'Update Task' : 'Deploy Task'}
            </Button>
          </div>
        </div>
      </Modal>

      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
