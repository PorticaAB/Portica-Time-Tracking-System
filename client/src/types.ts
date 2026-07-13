export type Role = "ADMIN" | "CONTRACTOR";
export type MemberRole = "TEAM_MEMBER" | "COACH";

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: Role;
  memberRole?: MemberRole | null;
  isActive?: boolean;
  createdAt?: string;
}

export interface ClientRecord {
  id: string;
  name: string;
  isActive: boolean;
  projects?: { id: string; name: string; isActive?: boolean }[];
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  userId: string;
  user: { id: string; name: string; email: string };
}

export interface ProjectTask {
  id: string;
  name: string;
  projectId: string;
  isActive: boolean;
  assignments?: TaskAssignment[] | { userId: string }[];
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  isActive: boolean;
  billableRate: string | number | null;
  currency: string | null;
  client: { id: string; name: string };
  tasks: ProjectTask[];
}

export interface TimeEntry {
  id: string;
  userId: string;
  projectId: string;
  taskId: string | null;
  description: string;
  startTime: string;
  endTime: string | null;
  project: {
    id: string;
    name: string;
    clientId?: string;
    client: { id: string; name: string };
  };
  task: { id: string; name: string } | null;
  user?: { id: string; name: string };
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
}

export interface ReportSummary {
  totalHours: number;
  entryCount: number;
  byClient: { clientId: string; clientName: string; hours: number }[];
  byProject: { projectId: string; projectName: string; clientName: string; hours: number }[];
  byContractor: { userId: string; userName: string; hours: number }[];
}
