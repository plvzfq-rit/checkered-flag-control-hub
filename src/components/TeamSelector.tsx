
import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { fetchTeams, Team } from '@/services/teamsService';
import { useToast } from '@/hooks/use-toast';

interface TeamSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  displayFullName?: boolean;
}

const TeamSelector: React.FC<TeamSelectorProps> = ({
  value,
  onValueChange,
  label = "Team",
  placeholder = "Select a team",
  required = false,
  className = "",
  displayFullName = false
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const teamsData = await fetchTeams();
        // console.log(teamsData);
        setTeams(teamsData);
      } catch (error) {
        console.error('Error loading teams.');
        toast({
          title: "Error",
          description: "Failed to load teams",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadTeams();
  }, [toast]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Label className="text-gray-300">{label}</Label>
        <div className="bg-gray-700 border-gray-600 h-10 rounded-md animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-gray-300">{label}</Label>
      <Select value={value} onValueChange={onValueChange} required={required}>
        <SelectTrigger className={`bg-gray-700 border-gray-600 text-white ${className}`}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-gray-700 border-gray-600">
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id} className="text-white hover:bg-gray-600">
              {displayFullName ? team.full_name : team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TeamSelector;
