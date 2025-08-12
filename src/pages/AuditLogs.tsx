
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, Search, Filter, Activity, LogIn, Lock, AlertTriangle, AlertCircle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_values: any;
  new_values: any;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

type LoginAttempt = Tables<'login_attempts'>;
type AccountLockout = Tables<'account_lockouts'>;

// Manual interface for access_failure table since it's not in types yet
interface AccessFailure {
  id: string;
  user_id: string | null;
  reason: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

// Manual interface for input_failures table since it's not in types yet
interface InputFailure {
  id: string;
  user_id: string | null;
  email: string | null;
  failure_type: string;
  error_message: string;
  ip_address: any;
  user_agent: string | null;
  created_at: string;
}

const AuditLogs: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [accountLockouts, setAccountLockouts] = useState<AccountLockout[]>([]);
  const [accessFailures, setAccessFailures] = useState<AccessFailure[]>([]);
  const [inputFailures, setInputFailures] = useState<InputFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    action: '',
    table_name: '',
    search: ''
  });

  useEffect(() => {
    if (profile?.role === 'administrator') {
      fetchAllLogs();
    }
  }, [profile]);

  const fetchAllLogs = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchAuditLogs(),
        fetchLoginAttempts(),
        fetchAccountLockouts(),
        fetchAccessFailures(),
        fetchInputFailures()
      ]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch logs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          profiles!audit_logs_user_id_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter.action && filter.action !== "ALL") {
        query = query.eq('action', filter.action);
      }
      if (filter.table_name && filter.table_name !== "all") {
        query = query.eq('table_name', filter.table_name);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      if (filter.search) {
        filteredData = filteredData.filter(log =>
          log.profiles?.full_name?.toLowerCase().includes(filter.search.toLowerCase()) ||
          log.profiles?.email?.toLowerCase().includes(filter.search.toLowerCase()) ||
          log.table_name?.toLowerCase().includes(filter.search.toLowerCase())
        );
      }

      setLogs(filteredData);
    } catch (error) {
      throw error;
    }
  };

  const fetchLoginAttempts = async () => {
    try {
      const { data, error } = await supabase
        .from('login_attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLoginAttempts(data || []);
    } catch (error) {
      throw error;
    }
  };

  const fetchAccountLockouts = async () => {
    try {
      const { data, error } = await supabase
        .from('account_lockouts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAccountLockouts(data || []);
    } catch (error) {
      throw error;
    }
  };

  const fetchAccessFailures = async () => {
    try {
      const { data, error } = await supabase
        .from('access_failure')
        .select(`
          *,
          profiles!access_failure_user_id_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setAccessFailures(data || []);
    } catch (error) {
      throw error;
    }
  };

  const fetchInputFailures = async () => {
    try {
      const { data, error } = await supabase
        .from('input_failures')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setInputFailures(data || []);
    } catch (error) {
      throw error;
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'bg-green-600 hover:bg-green-700';
      case 'UPDATE':
        return 'bg-yellow-600 hover:bg-yellow-700';
      case 'DELETE':
        return 'bg-red-600 hover:bg-red-700';
      default:
        return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  const getLoginAttemptBadgeColor = (success: boolean) => {
    return success ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700';
  };

  const getInputFailureBadgeColor = (failureType: string) => {
    switch (failureType) {
      case 'email_error':
        return 'bg-red-600 hover:bg-red-700';
      case 'password_error':
        return 'bg-orange-600 hover:bg-orange-700';
      case 'validation_error':
        return 'bg-yellow-600 hover:bg-yellow-700';
      default:
        return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  const getTableDisplayName = (tableName: string | null) => {
    if (!tableName) return 'Unknown';

    const tableNames: { [key: string]: string } = {
      'profiles': 'Profiles',
      'race_sessions': 'Race Sessions',
      'pit_stops': 'Pit Stops'
    };

    return tableNames[tableName] || tableName;
  };

  const formatJsonData = (data: any) => {
    if (!data) return null;

    try {
      const formatted = JSON.stringify(data, null, 2);
      return formatted.length > 200 ? formatted.substring(0, 200) + '...' : formatted;
    } catch {
      return String(data);
    }
  };

  const formatIpAddress = (ip: any) => {
    if (!ip) return '-';
    return typeof ip === 'string' ? ip : String(ip);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (profile?.role === 'administrator') {
        fetchAuditLogs();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filter, profile]);

  if (profile?.role !== 'administrator') {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
          {/* <p className="text-gray-400">Only Administrators can view audit logs.</p> */}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white text-lg">Loading audit logs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center">
          <Shield className="h-8 w-8 mr-3 text-purple-400" />
          Audit Logs
        </h1>
        <p className="text-gray-400 mt-2">
          Comprehensive system activity tracking and monitoring
        </p>
      </div>

      <Card className="bg-gray-800/80 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Filter className="h-5 w-5 mr-2 text-purple-400" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-gray-300">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  value={filter.search}
                  onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white pl-10"
                  placeholder="Search by user or table..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action" className="text-gray-300">Action</Label>
              <Select
                value={filter.action}
                onValueChange={(value) => setFilter(prev => ({ ...prev, action: value }))}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="ALL">All Actions</SelectItem>
                  <SelectItem value="INSERT">Insert</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="table_name" className="text-gray-300">Table</Label>
              <Select
                value={filter.table_name}
                onValueChange={(value) => setFilter(prev => ({ ...prev, table_name: value }))}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="All tables" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="all">All Tables</SelectItem>
                  <SelectItem value="profiles">Profiles</SelectItem>
                  <SelectItem value="race_sessions">Race Sessions</SelectItem>
                  <SelectItem value="pit_stops">Pit Stops</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="audit" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-gray-800 border-gray-700">
          <TabsTrigger value="audit" className="data-[state=active]:bg-purple-600">
            <Activity className="h-4 w-4 mr-2" />
            System Activity ({logs.length})
          </TabsTrigger>
          <TabsTrigger value="login" className="data-[state=active]:bg-purple-600">
            <LogIn className="h-4 w-4 mr-2" />
            Login Attempts ({loginAttempts.length})
          </TabsTrigger>
          <TabsTrigger value="lockouts" className="data-[state=active]:bg-purple-600">
            <Lock className="h-4 w-4 mr-2" />
            Account Lockouts ({accountLockouts.length})
          </TabsTrigger>
          <TabsTrigger value="access" className="data-[state=active]:bg-purple-600">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Access Failures ({accessFailures.length})
          </TabsTrigger>
          <TabsTrigger value="input" className="data-[state=active]:bg-purple-600">
            <AlertCircle className="h-4 w-4 mr-2" />
            Input Failures ({inputFailures.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="mt-6">
          <Card className="bg-gray-800/80 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Activity className="h-5 w-5 mr-2 text-purple-400" />
                System Activity ({logs.length} records)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {logs.length === 0 ? (
                <div className="p-8 text-center">
                  <Shield className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No audit logs found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-300">Timestamp</TableHead>
                        <TableHead className="text-gray-300">User</TableHead>
                        <TableHead className="text-gray-300">Action</TableHead>
                        <TableHead className="text-gray-300">Table</TableHead>
                        <TableHead className="text-gray-300">Record ID</TableHead>
                        <TableHead className="text-gray-300">Changes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id} className="border-gray-700 hover:bg-gray-700/50">
                          <TableCell className="text-gray-300 font-mono text-sm">
                            {new Date(log.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-white">
                            <div>
                              <div className="font-medium">
                                {log.profiles?.full_name || (log.action === 'INSERT' && log.table_name === 'profiles' ? 'System' : 'Unknown User')}
                              </div>
                              <div className="text-sm text-gray-400">
                                {log.profiles?.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getActionBadgeColor(log.action)}>
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {getTableDisplayName(log.table_name)}
                          </TableCell>
                          <TableCell className="text-gray-400 font-mono text-sm">
                            {log.record_id ? log.record_id.substring(0, 8) + '...' : '-'}
                          </TableCell>
                          <TableCell className="text-gray-300 max-w-xs">
                            {log.action === 'UPDATE' && (
                              <div className="space-y-1">
                                {log.old_values && (
                                  <details className="text-xs">
                                    <summary className="cursor-pointer text-red-400">Old Values</summary>
                                    <pre className="mt-1 p-2 bg-gray-900 rounded text-red-300 overflow-x-auto">
                                      {formatJsonData(log.old_values)}
                                    </pre>
                                  </details>
                                )}
                                {log.new_values && (
                                  <details className="text-xs">
                                    <summary className="cursor-pointer text-green-400">New Values</summary>
                                    <pre className="mt-1 p-2 bg-gray-900 rounded text-green-300 overflow-x-auto">
                                      {formatJsonData(log.new_values)}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            )}
                            {log.action === 'INSERT' && log.new_values && (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-green-400">Created Data</summary>
                                <pre className="mt-1 p-2 bg-gray-900 rounded text-green-300 overflow-x-auto">
                                  {formatJsonData(log.new_values)}
                                </pre>
                              </details>
                            )}
                            {log.action === 'DELETE' && log.old_values && (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-red-400">Deleted Data</summary>
                                <pre className="mt-1 p-2 bg-gray-900 rounded text-red-300 overflow-x-auto">
                                  {formatJsonData(log.old_values)}
                                </pre>
                              </details>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="login" className="mt-6">
          <Card className="bg-gray-800/80 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <LogIn className="h-5 w-5 mr-2 text-purple-400" />
                Login Attempts ({loginAttempts.length} records)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loginAttempts.length === 0 ? (
                <div className="p-8 text-center">
                  <LogIn className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No login attempts found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-300">Timestamp</TableHead>
                        <TableHead className="text-gray-300">Email</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">IP Address</TableHead>
                        <TableHead className="text-gray-300">Failure Reason</TableHead>
                        <TableHead className="text-gray-300">User Agent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loginAttempts.map((attempt) => (
                        <TableRow key={attempt.id} className="border-gray-700 hover:bg-gray-700/50">
                          <TableCell className="text-gray-300 font-mono text-sm">
                            {new Date(attempt.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-white font-medium">
                            {attempt.email}
                          </TableCell>
                          <TableCell>
                            <Badge className={getLoginAttemptBadgeColor(attempt.success)}>
                              {attempt.success ? 'SUCCESS' : 'FAILED'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-400 font-mono text-sm">
                            {formatIpAddress(attempt.ip_address)}
                          </TableCell>
                          <TableCell className="text-gray-300 max-w-xs">
                            {attempt.failure_reason ? (
                              <span className="text-red-400">{attempt.failure_reason}</span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm max-w-xs">
                            <div className="truncate" title={attempt.user_agent || ''}>
                              {attempt.user_agent || '-'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lockouts" className="mt-6">
          <Card className="bg-gray-800/80 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Lock className="h-5 w-5 mr-2 text-purple-400" />
                Account Lockouts ({accountLockouts.length} records)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {accountLockouts.length === 0 ? (
                <div className="p-8 text-center">
                  <Lock className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No account lockouts found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-300">Timestamp</TableHead>
                        <TableHead className="text-gray-300">Email</TableHead>
                        <TableHead className="text-gray-300">Locked Until</TableHead>
                        <TableHead className="text-gray-300">Reason</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accountLockouts.map((lockout) => {
                        const isCurrentlyLocked = new Date(lockout.locked_until) > new Date();
                        return (
                          <TableRow key={lockout.id} className="border-gray-700 hover:bg-gray-700/50">
                            <TableCell className="text-gray-300 font-mono text-sm">
                              {new Date(lockout.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-white font-medium">
                              {lockout.email}
                            </TableCell>
                            <TableCell className="text-gray-300 font-mono text-sm">
                              {new Date(lockout.locked_until).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {lockout.reason}
                            </TableCell>
                            <TableCell>
                              <Badge className={isCurrentlyLocked ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}>
                                {isCurrentlyLocked ? 'LOCKED' : 'EXPIRED'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="mt-6">
          <Card className="bg-gray-800/80 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-purple-400" />
                Access Control Failures ({accessFailures.length} records)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {accessFailures.length === 0 ? (
                <div className="p-8 text-center">
                  <AlertTriangle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No access control failures found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-300">Timestamp</TableHead>
                        <TableHead className="text-gray-300">User</TableHead>
                        <TableHead className="text-gray-300">Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accessFailures.map((failure) => (
                        <TableRow key={failure.id} className="border-gray-700 hover:bg-gray-700/50">
                          <TableCell className="text-gray-300 font-mono text-sm">
                            {new Date(failure.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-white">
                            <div>
                              <div className="font-medium">
                                {failure.profiles?.full_name || 'Unknown User'}
                              </div>
                              <div className="text-sm text-gray-400">
                                {failure.profiles?.email || 'No email'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-300 max-w-md">
                            <span className="text-red-400">{failure.reason}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="input" className="mt-6">
          <Card className="bg-gray-800/80 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-purple-400" />
                Input Failures ({inputFailures.length} records)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {inputFailures.length === 0 ? (
                <div className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No input failures found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700">
                        <TableHead className="text-gray-300">Timestamp</TableHead>
                        <TableHead className="text-gray-300">Email</TableHead>
                        <TableHead className="text-gray-300">Failure Type</TableHead>
                        <TableHead className="text-gray-300">Error Message</TableHead>
                        <TableHead className="text-gray-300">IP Address</TableHead>
                        <TableHead className="text-gray-300">User Agent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inputFailures.map((failure) => (
                        <TableRow key={failure.id} className="border-gray-700 hover:bg-gray-700/50">
                          <TableCell className="text-gray-300 font-mono text-sm">
                            {new Date(failure.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-white font-medium">
                            {failure.email || 'No email'}
                          </TableCell>
                          <TableCell>
                            <Badge className={getInputFailureBadgeColor(failure.failure_type)}>
                              {failure.failure_type.toUpperCase().replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300 max-w-xs">
                            <span className="text-red-400">{failure.error_message}</span>
                          </TableCell>
                          <TableCell className="text-gray-400 font-mono text-sm">
                            {formatIpAddress(failure.ip_address)}
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm max-w-xs">
                            <div className="truncate" title={failure.user_agent || ''}>
                              {failure.user_agent || '-'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AuditLogs;
