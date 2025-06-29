
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, Search, Filter, Activity } from 'lucide-react';

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

const AuditLogs: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    action: '',
    table_name: '',
    search: ''
  });

  useEffect(() => {
    if (profile?.role === 'team_principal') {
      fetchAuditLogs();
    }
  }, [profile]);

  const fetchAuditLogs = async () => {
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter.action) {
        query = query.eq('action', filter.action);
      }
      if (filter.table_name) {
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
      console.error('Error fetching audit logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch audit logs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (profile?.role === 'team_principal') {
        fetchAuditLogs();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filter, profile]);

  if (profile?.role !== 'team_principal') {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">Only Team Principals can view audit logs.</p>
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
                  <SelectItem value="">All Actions</SelectItem>
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
                  <SelectItem value="">All Tables</SelectItem>
                  <SelectItem value="profiles">Profiles</SelectItem>
                  <SelectItem value="race_sessions">Race Sessions</SelectItem>
                  <SelectItem value="pit_stops">Pit Stops</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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
                            {log.profiles?.full_name || 'Unknown User'}
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
    </div>
  );
};

export default AuditLogs;
