export interface Project {
  id: string;
  name: string;
  created_at: string;
}

export interface ProjectExecResult {
  command: string;
  stdout?: string;
  stderr?: string;
  exitCode: number;
}

export interface ProjectInfoResult {
  type: string;
  content?: string;
}

export interface ProjectExecOptions {
  parallel?: boolean;
}
